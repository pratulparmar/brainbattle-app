/* eslint-disable */
// firebase_utils.js — Firestore + Auth utilities for BrainBattle
// Place in: brainbattle/src/firebase_utils.js

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
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  increment,
  serverTimestamp,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey:            "AIzaSyC4awLUkV8Z1PqFCW0FLVlpXhyoGud4dwg",
  authDomain:        "brainbattle-neet.firebaseapp.com",
  projectId:         "brainbattle-neet",
  storageBucket:     "brainbattle-neet.firebasestorage.app",
  messagingSenderId: "655830697038",
  appId:             "1:655830697038:web:61918bd3a81942a6bb6f1f",
};

// Prevent duplicate initialization
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db   = getFirestore(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });
const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);

// ── Auth ──────────────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  await setPersistence(auth, browserLocalPersistence);
  if (isMobile) {
    await signInWithRedirect(auth, provider);
    return null;
  } else {
    const result = await signInWithPopup(auth, provider);
    await ensureUserDoc(result.user);
    return result.user;
  }
}

export async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result?.user) {
      await ensureUserDoc(result.user);
      return result.user;
    }
    return null;
  } catch (e) {
    console.error("Redirect result error:", e);
    return null;
  }
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function signOutUser() {
  await signOut(auth);
}

// ── Firestore User Doc ────────────────────────────────────────────────────

export const DEFAULT_STATS = {
  level:       1,
  totalPoints: 0,
  accuracy:    0,
  streak:      0,
  totalQs:     0,
  rank:        999,
  quizzesDone: 0,
  studyMins:   0,
  lastSeen:    null,
};

export async function ensureUserDoc(user) {
  const ref  = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid:         user.uid,
      name:        user.displayName || "Student",
      email:       user.email || "",
      photoURL:    user.photoURL || "",
      stats:       DEFAULT_STATS,
      createdAt:   serverTimestamp(),
      updatedAt:   serverTimestamp(),
    });
  } else {
    // Update last seen
    await updateDoc(ref, { updatedAt: serverTimestamp() });
  }
}

export async function getUserStats(uid) {
  try {
    const snap = await getDoc(doc(db, "users", uid));
    if (snap.exists()) {
      const data = snap.data();
      return { ...DEFAULT_STATS, ...data.stats };
    }
  } catch (e) {
    console.error("getUserStats error:", e);
  }
  return DEFAULT_STATS;
}

// ── Save Quiz Result ──────────────────────────────────────────────────────

export async function saveQuizResult(uid, { score, subject, correct, total, timeSecs }) {
  if (!uid) return;
  try {
    const ref     = doc(db, "users", uid);
    const snap    = await getDoc(ref);
    const current = snap.exists() ? (snap.data().stats || {}) : {};

    const prevTotal    = current.totalQs     || 0;
    const prevCorrect  = Math.round((current.accuracy || 0) / 100 * prevTotal);
    const newTotal     = prevTotal + total;
    const newCorrect   = prevCorrect + correct;
    const newAccuracy  = newTotal > 0 ? Math.round(newCorrect / newTotal * 100) : 0;
    const newPoints    = (current.totalPoints || 0) + score;
    const newQuizzes   = (current.quizzesDone || 0) + 1;
    const newStudyMins = (current.studyMins   || 0) + Math.round(timeSecs / 60);
    const newLevel     = Math.floor(newPoints / 500) + 1;

    // Update streak
    const today       = new Date().toDateString();
    const lastSeen    = current.lastSeen || "";
    const yesterday   = new Date(Date.now() - 86400000).toDateString();
    const newStreak   = lastSeen === yesterday
      ? (current.streak || 0) + 1
      : lastSeen === today
        ? (current.streak || 0)
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

    // Save to subject-level analytics
    const subjRef = doc(db, "users", uid, "subjects", subject);
    await setDoc(subjRef, {
      correct: increment(correct),
      total:   increment(total),
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return { newPoints, newAccuracy, newLevel, newStreak };
  } catch (e) {
    console.error("saveQuizResult error:", e);
    return null;
  }
}

// ── Leaderboard ───────────────────────────────────────────────────────────

export async function getLeaderboard(currentUid = null) {
  try {
    const q    = query(collection(db, "users"), orderBy("stats.totalPoints", "desc"), limit(20));
    const snap = await getDocs(q);
    const rows = snap.docs.map((d, i) => {
      const data = d.data();
      return {
        uid:    d.id,
        name:   data.name || "Student",
        score:  data.stats?.totalPoints || 0,
        streak: data.stats?.streak      || 0,
        level:  data.stats?.level       || 1,
        rank:   i + 1,
        isMe:   d.id === currentUid,
      };
    });

    // If current user not in top 20, fetch and append them
    if (currentUid && !rows.find(r => r.isMe)) {
      const mySnap = await getDoc(doc(db, "users", currentUid));
      if (mySnap.exists()) {
        const data = mySnap.data();
        rows.push({
          uid:    currentUid,
          name:   data.name || "Student",
          score:  data.stats?.totalPoints || 0,
          streak: data.stats?.streak      || 0,
          level:  data.stats?.level       || 1,
          rank:   "...",
          isMe:   true,
        });
      }
    }

    return rows;
  } catch (e) {
    console.error("getLeaderboard error:", e);
    return [];
  }
}
