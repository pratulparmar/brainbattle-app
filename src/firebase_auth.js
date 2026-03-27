import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";

const firebaseConfig = {
  apiKey:            "AIzaSyC4awLUkV8Z1PqFCW0FLVlpXhyoGud4dwg",
  authDomain:        "brainbattle-neet.firebaseapp.com",
  projectId:         "brainbattle-neet",
  storageBucket:     "brainbattle-neet.firebasestorage.app",
  messagingSenderId: "655830697038",
  appId:             "1:655830697038:web:61918bd3a81942a6bb6f1f",
  measurementId:     "G-9PEMJZFE87",
};

const app      = initializeApp(firebaseConfig);
export const auth     = getAuth(app);
const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" });

const isMobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);

export async function signInWithGoogle() {
  if (isMobile) {
    await signInWithRedirect(auth, provider);
    return null; // page will redirect and come back
  } else {
    const result = await signInWithPopup(auth, provider);
    const token  = await result.user.getIdToken();
    return { user: result.user, token };
  }
}

export async function getGoogleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (!result) return null;
    const token = await result.user.getIdToken();
    return { user: result.user, token };
  } catch (e) {
    console.error("Redirect result error:", e);
    return null;
  }
}

export async function signOutUser() {
  await signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const token = await user.getIdToken();
      callback({ user, token });
    } else {
      callback(null);
    }
  });
}

export async function getFreshToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken(true);
}
