/* eslint-disable */
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import {
  getFirestore,
  doc, getDoc, setDoc, updateDoc,
  collection, query, orderBy, limit, getDocs,
  increment, serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyC4awLUkV8Z1PqFCW0FLVlpXhyoGud4dwg",
  authDomain:        "brainbattle-neet.firebaseapp.com",
  projectId:         "brainbattle-neet",
  storageBucket:     "brainbattle-neet.firebasestorage.app",
  messagingSenderId: "655830697038",
  appId:             "1:655830697038:web:61918bd3a81942a6bb6f1f",
};

const app      = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

// Set persistence IMMEDIATELY — before any auth operation
setPersistence(auth, browserLocalPersistence).catch(console.error);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

// Popup-first on ALL devices.
// Redirect is broken on Brave mobile (blocks Firebase cross-origin iframe).
// If popup is blocked, we return a special signal so the UI can show a message.
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err) {
    if (
      err.code === "auth/popup-blocked" ||
      err.code === "auth/cancelled-popup-request"
    ) {
      // Popup was blocked — fall back to redirect as last resort
      await signInWithRedirect(auth, provider);
      return null;
    }
    if (err.code === "auth/popup-closed-by-user") {
      return null; // user cancelled — not an error
    }
    throw err;
  }
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// Catches the logged-in user after a Google redirect on mobile browsers
export function checkRedirectResult() {
  return getRedirectResult(auth);
}

export async function signOutUser() {
  await signOut(auth);
}

export const DEFAULT_STATS = {
  level:1, totalPoints:0, accuracy:0, streak:0,
  totalQs:0, rank:999, quizzesDone:0, studyMins:0,
};

export async function ensureUserDoc(user) {
  const ref  = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid:        user.uid,
      name:       user.displayName || "Student",
      email:      user.email || "",
      photoURL:   user.photoURL || "",
      is_premium: false,
      stats:      DEFAULT_STATS,
      usage: {
        dailyQuizzesCount:  0,
        lastQuizDate:       "",
        hasAttemptedMock:   false,
        feynmanTopicsToday: 0,
        lastFeynmanDate:    "",
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 🎉 New user — send welcome email (fire-and-forget, don't block signup)
    if (user.email) {
      const firstName = (user.displayName || "Student").split(" ")[0];
      fetch("https://brainbattle-rag-production.up.railway.app/email/welcome", {
        method:  "POST",
        headers: { "Content-Type": "application/json", "X-App-Token": "rankbattle-dev-key" },
        body:    JSON.stringify({ email: user.email, first_name: firstName }),
      }).catch(e => console.warn("Welcome email failed:", e));
    }

  } else {
    // Patch old docs that don't have usage/is_premium fields yet
    const data = snap.data();
    const patches = {};
    if (data.is_premium === undefined) patches.is_premium = false;
    if (!data.usage) patches.usage = { dailyQuizzesCount: 0, lastQuizDate: "", hasAttemptedMock: false, feynmanTopicsToday: 0, lastFeynmanDate: "" };
    if (Object.keys(patches).length > 0) await updateDoc(ref, patches);
    await updateDoc(ref, { updatedAt: serverTimestamp() });
  }
}

// ── Usage & Access ─────────────────────────────────────────────────────────

/**
 * Fetch the current user's usage + premium status from Firestore.
 * Called on login and page load — cannot be spoofed by clearing localStorage.
 */
export async function getUserUsage(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const data  = snap.data();
      const usage = data.usage || {};
      const today = new Date().toDateString();
      // Reset daily quiz count if it's a new day
      const dailyQuizzesCount = usage.lastQuizDate === today
        ? (usage.dailyQuizzesCount || 0) : 0;
      return {
        dailyQuizzesCount,
        hasAttemptedMock: usage.hasAttemptedMock || false,
        is_premium:       data.is_premium || false,
      };
    }
  } catch (e) { console.error("getUserUsage:", e); }
  return { dailyQuizzesCount: 0, hasAttemptedMock: false, is_premium: false };
}

/**
 * Check whether a user is allowed to start an activity.
 * Source of truth is Firestore — not localStorage.
 * Returns { allowed: bool, reason: string }
 */
export async function verifyAccess(uid, activityType) {
  // Guest users (no uid) — allow but don't track
  if (!uid) return { allowed: true, reason: "" };
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (!snap.exists()) return { allowed: true, reason: "" };
    const data  = snap.data();
    // Premium bypasses everything
    if (data.is_premium === true) return { allowed: true, reason: "" };
    const usage = data.usage || {};
    const today = new Date().toDateString();
    if (activityType === "quiz") {
      const count = usage.lastQuizDate === today ? (usage.dailyQuizzesCount || 0) : 0;
      if (count >= 3) return { allowed: false, reason: "You've used all 3 free quizzes for today." };
    }
    if (activityType === "mock") {
      if (usage.hasAttemptedMock === true)
        return { allowed: false, reason: "Free plan includes 1 mock test. Upgrade for unlimited access." };
    }
    if (activityType === "feynman") {
      const lastDate  = usage.lastFeynmanDate || "";
      const todayCount = lastDate === today ? (usage.feynmanTopicsToday || 0) : 0;
      if (todayCount >= 1)
        return { allowed: false, reason: "Free plan includes 1 Feynman deep-dive per day. Upgrade to Doctor Lite for unlimited sessions." };
    }
    return { allowed: true, reason: "" };
  } catch (e) {
    console.error("verifyAccess:", e);
    return { allowed: true, reason: "" }; // fail open — don't block on network error
  }
}

/**
 * Increment usage counter in Firestore immediately when a test starts.
 * Called AFTER verifyAccess returns true.
 */
export async function incrementUsage(uid, type) {
  if (!uid) return;
  try {
    const ref   = doc(db, "users", uid);
    const today = new Date().toDateString();
    if (type === "quiz") {
      // Read current count first so we can handle day-reset correctly
      const snap  = await getDoc(ref);
      const usage = snap.exists() ? (snap.data().usage || {}) : {};
      const currentCount = usage.lastQuizDate === today ? (usage.dailyQuizzesCount || 0) : 0;
      await updateDoc(ref, {
        "usage.dailyQuizzesCount": currentCount + 1,
        "usage.lastQuizDate":      today,
        "updatedAt":               serverTimestamp(),
      });
    }
    if (type === "mock") {
      await updateDoc(ref, {
        "usage.hasAttemptedMock": true,
        "updatedAt":              serverTimestamp(),
      });
    }
    if (type === "feynman") {
      const snap  = await getDoc(ref);
      const usage = snap.exists() ? (snap.data().usage || {}) : {};
      const today = new Date().toDateString();
      const todayCount = usage.lastFeynmanDate === today ? (usage.feynmanTopicsToday || 0) : 0;
      await updateDoc(ref, {
        "usage.feynmanTopicsToday": todayCount + 1,
        "usage.lastFeynmanDate":    today,
        "updatedAt":                serverTimestamp(),
      });
    }
  } catch (e) { console.error("incrementUsage:", e); }
}

export async function getUserStats(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      return { ...DEFAULT_STATS, ...(snap.data().stats || {}) };
    }
  } catch (e) { console.error("getUserStats:", e); }
  return { ...DEFAULT_STATS };
}

export async function saveQuizResult(uid, { score, subject, correct, total, timeSecs }) {
  if (!uid) return null;
  try {
    const ref     = doc(db, "users", uid);
    const snap    = await getDoc(ref);
    const current = snap.exists() ? (snap.data().stats || {}) : {};
    const prevTotal   = current.totalQs    || 0;
    const prevCorrect = Math.round((current.accuracy || 0) / 100 * prevTotal);
    const newTotal    = prevTotal + total;
    const newCorrect  = prevCorrect + correct;
    const newAccuracy = newTotal > 0 ? Math.round(newCorrect / newTotal * 100) : 0;
    const newPoints   = (current.totalPoints || 0) + score;
    const newQuizzes  = (current.quizzesDone || 0) + 1;
    const newStudyMins= (current.studyMins   || 0) + Math.round((timeSecs||0) / 60);
    const newLevel    = Math.floor(newPoints / 500) + 1;
    const today       = new Date().toDateString();
    const yesterday   = new Date(Date.now() - 86400000).toDateString();
    const lastSeen    = current.lastSeen || "";
    const newStreak   = lastSeen === yesterday ? (current.streak||0)+1
                      : lastSeen === today     ? (current.streak||0)
                      : 1;
    await updateDoc(ref, {
      "stats.totalPoints": newPoints,
      "stats.accuracy":    newAccuracy,
      "stats.totalQs":     newTotal,
      "stats.quizzesDone": newQuizzes,
      "stats.studyMins":   newStudyMins,
      "stats.level":       newLevel,
      "stats.streak":      newStreak,
      "stats.lastSeen":    today,
      "updatedAt":         serverTimestamp(),
    });
    return { newPoints, newAccuracy, newLevel, newStreak };
  } catch (e) { console.error("saveQuizResult:", e); return null; }
}

export async function getLeaderboard(currentUid = null) {
  try {
    // Fetch real users + seeded leaderboard users, merge, sort, return top 20
    const [usersSnap, seedSnap] = await Promise.all([
      getDocs(query(collection(db, "users"), orderBy("stats.totalPoints", "desc"), limit(20))),
      getDocs(query(collection(db, "leaderboard"), orderBy("totalPoints", "desc"), limit(200))),
    ]);

    // Real users
    const realRows = usersSnap.docs.map(d => {
      const data = d.data();
      return {
        uid:    d.id,
        name:   data.name || "Student",
        score:  data.stats?.totalPoints || 0,
        streak: data.stats?.streak      || 0,
        level:  data.stats?.level       || 1,
        isMe:   d.id === currentUid,
        color:  "#FF6B6B",
        emoji:  "⭐",
        isReal: true,
      };
    });

    // Seeded dummy users (exclude any real uid collisions)
    const realUids = new Set(realRows.map(r => r.uid));
    const seedRows = seedSnap.docs
      .filter(d => !realUids.has(d.id))
      .map(d => {
        const data = d.data();
        return {
          uid:    d.id,
          name:   data.name || "Student",
          score:  data.totalPoints || 0,
          streak: data.streak      || 0,
          level:  data.level       || 1,
          isMe:   false,
          color:  data.color || "#667EEA",
          emoji:  data.emoji || "🧠",
          isReal: false,
        };
      });

    // Merge, sort by score descending, assign ranks
    const merged = [...realRows, ...seedRows]
      .sort((a, b) => b.score - a.score)
      .slice(0, 50)
      .map((r, i) => ({ ...r, rank: i + 1 }));

    // If current user not in top 50, append them at bottom
    if (currentUid && !merged.find(r => r.isMe)) {
      const mySnap = await getDoc(doc(db, "users", currentUid));
      if (mySnap.exists()) {
        const d = mySnap.data();
        merged.push({
          uid:    currentUid,
          name:   d.name || "Student",
          score:  d.stats?.totalPoints || 0,
          streak: d.stats?.streak || 0,
          level:  d.stats?.level  || 1,
          rank:   "...",
          isMe:   true,
          color:  "#FF6B6B",
          emoji:  "⭐",
        });
      }
    }
    return merged;
  } catch (e) { console.error("getLeaderboard:", e); return []; }
}
