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
    await setDoc(ref, {
      uid:        user.uid,
      name:       user.displayName || "Student",
      email:      user.email       || "",
      photoURL:   user.photoURL    || "",
      is_premium: false,
      createdAt:  new Date().toISOString(),
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
 * – Desktop: popup (instant UX)
 * – Mobile:  redirect (popup is unreliable on iOS/Android in-app browsers)
 *
 * Returns the Firebase user object on popup success, or null when a redirect
 * has been initiated (page will reload; checkRedirectResult will handle it).
 */
export async function signInWithGoogle() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    await signInWithRedirect(auth, provider);
    return null; // page reloads — App.jsx picks up the user via checkRedirectResult
  }
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (e) {
    // Popup blocked on some desktop browsers — fall back to redirect
    if (e.code === "auth/popup-blocked" || e.code === "auth/popup-closed-by-user") {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw e; // propagate other errors (e.g. network) so LoginScreen can show the message
  }
}

/**
 * checkRedirectResult
 * Must be called once on app mount (before onAuthStateChanged fires) to catch
 * the user returning from a Google redirect on mobile.
 */
export async function checkRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    return result; // null when no redirect was in progress
  } catch (e) {
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
