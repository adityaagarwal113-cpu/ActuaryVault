import { initializeApp } from "firebase/app";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const metaEnv = (import.meta as any).env || {};

const projectId = metaEnv.VITE_FIREBASE_PROJECT_ID || "nodal-aviary-v8gvj";
const databaseId = metaEnv.VITE_FIREBASE_FIRESTORE_DATABASE_ID || "ai-studio-60686eda-66e8-408d-9bbd-605244519c27";

const firebaseConfig = {
  apiKey: metaEnv.VITE_FIREBASE_API_KEY || "AIzaSyDqz1gtqNePxQfTfybTbK17a7RHDM9eyJ0",
  authDomain: metaEnv.VITE_FIREBASE_AUTH_DOMAIN || "nodal-aviary-v8gvj.firebaseapp.com",
  projectId: projectId,
  storageBucket: metaEnv.VITE_FIREBASE_STORAGE_BUCKET || "nodal-aviary-v8gvj.firebasestorage.app",
  messagingSenderId: metaEnv.VITE_FIREBASE_MESSAGING_SENDER_ID || "510443587680",
  appId: metaEnv.VITE_FIREBASE_APP_ID || "1:510443587680:web:cb71625a2d851b1fefdb05"
};

const app = initializeApp(firebaseConfig);

// Initialize with custom DB ID as the third argument if specified, fallback to default getFirestore
export const db = (databaseId && databaseId !== "(default)" && databaseId !== "")
  ? initializeFirestore(app, {}, databaseId)
  : getFirestore(app);

export const auth = getAuth(app);
