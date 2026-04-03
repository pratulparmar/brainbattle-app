// firebase_utils.js — RankBattle v1.1
// ─────────────────────────────────────────────────────────────────────────────
// Key changes from v1.0:
//   • ensureUserDoc: sends welcome email to /email/welcome ONCE, for new users only
//   • TOKEN() helper always reads localStorage fresh (no stale module-level value)
//   • signInWithGoogle: popup on desktop, redirect on mobile (robust for all browsers)
//   • getUserUsage: auto-resets daily counters when date changes
//   • saveQuizResult: writes correct field names that match ResultsScreen expectations
// ─────────────────────────────────────────────────────────────────────────────

import { initializeApp }                               from "firebase/app";
import { getFirestore, doc, getDoc, setDoc, updateDoc,
         increment, collection, query, orderBy,
         limit, getDocs }                              from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup,
         signInWithRedirect, getRedirectResult,
         signOut, onAuthStateChanged }                 from "firebase/auth";

// ══════════════════════════════════════════════════════════════════════════════
//  FIREBASE CONFIG — DO NOT CHANGE THESE VALUES
//  (authDomain stays brainbattle-neet.firebaseapp.com even after brand rename)
// ══════════════════════════════════════════════════════════════════════════════
const firebaseConfig = {
  apiKey:            "AIzaSyC4awLUkV8Z1PqFCW0FLVlpXhyoGud4dwg",
  authDomain:        "brainbattle-neet.firebaseapp.com",
  projectId:         "brainbattle-neet",
  storageBucket:     "brainbattle-neet.firebasestorage.app",
  messagingSenderId: "655830697038",
  appId:             "1:655830697038:web:61918bd3a81942a6bb6f1f",
  measurementId:     "G-9PEMJZFE87",
};

const _app   = initializeApp(firebaseConfig);
export const db   = getFirestore(_app);
const auth        = getAuth(_app);
const provider    = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// ── Internal helpers ──────────────────────────────────────────────────────────
const RAG   = "https://brainbattle-rag-production.up.railway.app";

/** Always reads token fresh — avoids stale module-level eval for new users */
const TOKEN = () => localStorage.getItem("bb_auth_token") || "rankbattle-dev-key";

const ragHeaders = () => ({
  "Content-Type": "application/json",
  "X-App-Token":  TOKEN(),
});

function defaultStats() {
  return { level:1, totalPoints:0, accuracy:0, streak:0, totalQs:0, rank:999, quizzesDone:0, studyMins:0 };
}
function defaultUsage() {
  return { dailyQuizzesCount:0, hasAttemptedMock:false, is_premium:false };
}

// ══════════════════════════════════════════════════════════════════════════════
//  ensureUserDoc
//  Called immediately after every login. Creates the Firestore doc if missing
//  and fires the welcome email exactly once (for new users only).
// ══════════════════════════════════════════════════════════════════════════════
export async function ensureUserDoc(user) {
  if (!user?.uid) return;

  const ref  = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    // ── Brand-new user ────────────────────────────────────────────────────────
    // Capture referral code from URL: neet.rankbattle.in?ref=<uid_prefix>
    const urlRef = typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("ref")
      : null;

    await setDoc(ref, {
      uid:               user.uid,
      name:              user.displayName || "Student",
      email:             user.email       || "",
      photoURL:          user.photoURL    || "",
      is_premium:        false,
      createdAt:         new Date().toISOString(),
      referredBy:        urlRef || null,   // who invited them
      referralProcessed: false,            // flipped to true after first battle
      referral_count:    0,                // how many valid invites this user has made
      usage: {
        dailyQuizzesCount: 0,
        hasAttemptedMock:  false,
        lastReset:         new Date().toDateString(),
      },
      stats: {
        totalPoints: 0,
        level:       1,
        streak:      0,
        accuracy:    0,
        totalQs:     0,
        quizzesDone: 0,
        studyMins:   0,
        rank:        999,
      },
    });

    // Write referral_index entry so processReferral can find this user's referrer in O(1)
    const uidPrefix = user.uid.slice(0, 8);
    try {
      const { setDoc: sdoc, doc: ddoc } = await import("firebase/firestore");
      await sdoc(ddoc(db, "referral_index", uidPrefix), { uid: user.uid });
    } catch(e) { /* non-critical */ }

    // 🔑  Send welcome email — fire-and-forget, never blocks login
    if (user.email) {
      const firstName = (user.displayName || "Student").split(" ")[0];
      fetch(`${RAG}/email/welcome`, {
        method:  "POST",
        headers: ragHeaders(),
        body:    JSON.stringify({ email: user.email, first_name: firstName }),
      }).catch(e => console.warn("Welcome email failed (non-fatal):", e));
    }

  } else {
    // ── Returning user: just refresh the photo URL if it changed ─────────────
    const data = snap.data();
    if (user.photoURL && user.photoURL !== data.photoURL) {
      await updateDoc(ref, { photoURL: user.photoURL }).catch(() => {});
    }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════════════════════════

/**
 * signInWithGoogle
 * Popup-first for ALL devices — no isMobile check.
 * Redirect is the root cause of the infinite loop on custom domains because
 * modern mobile browsers block the cross-origin cookies between neet.rankbattle.in
 * and brainbattle-neet.firebaseapp.com, so checkRedirectResult() returns null.
 * Popup works reliably on both desktop and mobile Chrome/Safari.
 */
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (e) {
    if (e.code === "auth/popup-blocked") {
      // Only fall back to redirect if popup was hard-blocked by the browser
      sessionStorage.setItem("rb_redirect_pending", "true");
      await signInWithRedirect(auth, provider);
      return null;
    }
    // auth/popup-closed-by-user = user dismissed — not worth retrying
    throw e;
  }
}

/**
 * checkRedirectResult
 * Must be called once on app mount (before onAuthStateChanged fires) to catch
 * the user returning from a Google redirect on mobile.
 *
 * Always clears the rb_redirect_pending flag — whether successful or not.
 * Re-throws auth/unauthorized-domain so App.jsx can show an actionable error.
 */
export async function checkRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    sessionStorage.removeItem("rb_redirect_pending");
    return result; // null when no redirect was in progress
  } catch (e) {
    sessionStorage.removeItem("rb_redirect_pending");
    // Surface domain errors so the app can warn the user instead of silently looping
    if (e.code === "auth/unauthorized-domain") {
      console.error(
        "❌ auth/unauthorized-domain — add this domain to Firebase Console:\n" +
        "   Authentication → Settings → Authorized Domains → Add domain\n" +
        `   Domain to add: ${window.location.hostname}`
      );
      throw e; // let App.jsx catch and show a clear message
    }
    console.error("getRedirectResult error:", e);
    return null;
  }
}

export function signOutUser()        { return signOut(auth); }
export function onAuthChange(cb)     { return onAuthStateChanged(auth, cb); }

// ══════════════════════════════════════════════════════════════════════════════
//  USER DATA
// ══════════════════════════════════════════════════════════════════════════════

export async function getUserStats(uid) {
  if (!uid) return defaultStats();
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return defaultStats();
    const s = snap.data().stats || {};
    return {
      level:       s.level       || 1,
      totalPoints: s.totalPoints || 0,
      accuracy:    s.accuracy    || 0,
      streak:      s.streak      || 0,
      totalQs:     s.totalQs     || 0,
      rank:        s.rank        || 999,
      quizzesDone: s.quizzesDone || 0,
      studyMins:   s.studyMins   || 0,
    };
  } catch (e) {
    console.warn("getUserStats:", e);
    return defaultStats();
  }
}

export async function getUserUsage(uid) {
  if (!uid) return defaultUsage();
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return defaultUsage();
    const d     = snap.data();
    const usage = d.usage || {};
    const today = new Date().toDateString();

    // Auto-reset daily counters at midnight
    if (usage.lastReset !== today) {
      await updateDoc(doc(db, "users", uid), {
        "usage.dailyQuizzesCount": 0,
        "usage.hasAttemptedMock":  false,
        "usage.lastReset":         today,
      }).catch(() => {});
      return { dailyQuizzesCount: 0, hasAttemptedMock: false, is_premium: d.is_premium || false };
    }

    return {
      dailyQuizzesCount: usage.dailyQuizzesCount || 0,
      hasAttemptedMock:  usage.hasAttemptedMock  || false,
      is_premium:        d.is_premium            || false,
    };
  } catch (e) {
    console.warn("getUserUsage:", e);
    return defaultUsage();
  }
}

/**
 * verifyAccess — gate quiz/mock starts for free users
 * Returns { allowed: true } or { allowed: false, reason: string }
 */
export async function verifyAccess(uid, type = "quiz") {
  if (!uid || uid.startsWith("guest_")) {
    // Guests: allow 1 quiz, no mock
    const guestCount = parseInt(localStorage.getItem("guest_quiz_count") || "0", 10);
    if (type === "quiz"  && guestCount >= 1)  return { allowed: false, reason: "guest_limit" };
    if (type === "mock")                       return { allowed: false, reason: "guest_no_mock" };
    return { allowed: true };
  }
  const usage = await getUserUsage(uid);
  if (usage.is_premium) return { allowed: true };
  if (type === "quiz" && usage.dailyQuizzesCount >= 3) return { allowed: false, reason: "daily_quiz_limit" };
  if (type === "mock" && usage.hasAttemptedMock)       return { allowed: false, reason: "daily_mock_limit" };
  return { allowed: true };
}

export async function incrementUsage(uid, type = "quiz") {
  if (!uid || uid.startsWith("guest_")) {
    if (type === "quiz") {
      const c = parseInt(localStorage.getItem("guest_quiz_count") || "0", 10);
      localStorage.setItem("guest_quiz_count", String(c + 1));
    }
    return;
  }
  try {
    const updates =
      type === "mock"
        ? { "usage.hasAttemptedMock": true }
        : { "usage.dailyQuizzesCount": increment(1) };
    await updateDoc(doc(db, "users", uid), updates);
  } catch (e) { console.warn("incrementUsage:", e); }
}

// ══════════════════════════════════════════════════════════════════════════════
//  QUIZ RESULT — saves aggregate stats to Firestore
//  The per-question sync to Railway /sync-progress is handled in App.jsx
// ══════════════════════════════════════════════════════════════════════════════
export async function saveQuizResult(uid, { score, subject, correct, total, timeSecs }) {
  if (!uid || uid.startsWith("guest_")) return null;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    const d    = snap.exists() ? snap.data() : {};
    const prev = d.stats || {};

    // Running weighted accuracy
    const prevTotal   = prev.totalQs     || 0;
    const prevCorrect = Math.round(prevTotal * ((prev.accuracy || 0) / 100));
    const newTotal    = prevTotal   + total;
    const newCorrect  = prevCorrect + (correct || 0);
    const newAcc      = newTotal > 0 ? Math.round((newCorrect / newTotal) * 100) : 0;
    const newPoints   = (prev.totalPoints || 0) + (score || 0);
    const newLevel    = Math.floor(newPoints / 500) + 1;
    const newDone     = (prev.quizzesDone || 0) + 1;

    await updateDoc(doc(db, "users", uid), {
      "stats.totalPoints": newPoints,
      "stats.accuracy":    newAcc,
      "stats.level":       newLevel,
      "stats.totalQs":     newTotal,
      "stats.quizzesDone": newDone,
      "stats.studyMins":   increment(Math.round((timeSecs || 0) / 60)),
    });

    return {
      newPoints,
      newAccuracy: newAcc,
      newLevel,
      newStreak:   prev.streak || 0,
    };
  } catch (e) {
    console.warn("saveQuizResult:", e);
    return null;
  }
}


// ══════════════════════════════════════════════════════════════════════════════
//  REFERRAL SYSTEM
//  A referral is counted only when the referred user completes their first battle.
//  Flow:
//    1. User A shares link: neet.rankbattle.in?ref=<uid_prefix>
//    2. User B lands, signs up → ensureUserDoc stores referredBy = uid_prefix
//    3. After User B's first battle, App.jsx calls processReferral(userB.uid)
//    4. processReferral looks up referredBy, increments referrer's referral_count
//    5. Once referral_count >= 3, rank predictor + heatmap unlock automatically
// ══════════════════════════════════════════════════════════════════════════════

export async function getReferralCount(uid) {
  if (!uid) return 0;
  try {
    const snap = await getDoc(doc(db, "users", uid));
    return snap.exists() ? (snap.data().referral_count || 0) : 0;
  } catch (e) {
    console.warn("getReferralCount:", e);
    return 0;
  }
}

/**
 * processReferral — call this after a new user completes their first battle.
 * Finds who referred them and increments that user's referral_count by 1.
 */
export async function processReferral(newUserUid) {
  if (!newUserUid) return;
  try {
    const snap = await getDoc(doc(db, "users", newUserUid));
    if (!snap.exists()) return;
    const data = snap.data();
    // Only count once — mark the referral as processed
    if (!data.referredBy || data.referralProcessed) return;

    const referredByPrefix = data.referredBy;

    // Find the referrer by matching uid prefix (first 8 chars — unique enough)
    // We store the full uid in a lookup doc for O(1) resolution
    const referrerSnap = await getDoc(doc(db, "referral_index", referredByPrefix));
    if (!referrerSnap.exists()) return;
    const referrerUid = referrerSnap.data().uid;
    if (!referrerUid || referrerUid === newUserUid) return;

    // Increment referrer's count and mark this referral as processed
    await Promise.all([
      updateDoc(doc(db, "users", referrerUid), {
        referral_count: increment(1),
      }),
      updateDoc(doc(db, "users", newUserUid), {
        referralProcessed: true,
      }),
    ]);
    console.log(`Referral credited: ${referrerUid} +1 (referred ${newUserUid})`);
  } catch (e) {
    console.warn("processReferral:", e);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
//  LEADERBOARD
// ══════════════════════════════════════════════════════════════════════════════
export async function getLeaderboard(topN = 20) {
  try {
    const q    = query(collection(db, "users"), orderBy("stats.totalPoints", "desc"), limit(topN));
    const snap = await getDocs(q);
    return snap.docs.map((d, i) => {
      const data = d.data();
      return {
        rank:        i + 1,
        name:        data.name     || "Student",
        photoURL:    data.photoURL || "",
        totalPoints: data.stats?.totalPoints || 0,
        accuracy:    data.stats?.accuracy    || 0,
        level:       data.stats?.level       || 1,
        uid:         d.id,
      };
    });
  } catch (e) {
    console.warn("getLeaderboard:", e);
    return [];
  }
}
