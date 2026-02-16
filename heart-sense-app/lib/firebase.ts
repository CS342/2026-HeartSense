import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyB3mCwXJEduzAKzgjikiKEbsk7mW3___5o",
  authDomain: "cs342-2026-wong-3qriyd12e.firebaseapp.com",
  projectId: "cs342-2026-wong-3qriyd12e",
  storageBucket: "cs342-2026-wong-3qriyd12e.firebasestorage.app",
  messagingSenderId: "531679372606",
  appId: "1:531679372606:web:da967fc258ba7afa96786f",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

const functions = getFunctions(app);
export const sendPushNotificationCallable = httpsCallable<
  { token: string; title?: string; body?: string },
  { success: boolean; messageId?: string; error?: string }
>(functions, "sendPushNotification");

