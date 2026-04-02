import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase public config — safe to embed (these are NOT secret keys).
// Firebase security is enforced by Firestore Rules + Auth, not by hiding this config.
// See: https://firebase.google.com/docs/projects/api-keys
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? "AIzaSyB5bHL0gowaXs1sT21JWDUQ4dcrRdOiPpA",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? "steaai.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? "steaai",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? "steaai.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? "916957246961",
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? "1:916957246961:web:dd3864554202fad5884050",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
};
export default app;
