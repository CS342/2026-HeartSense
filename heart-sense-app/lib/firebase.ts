import { initializeApp, getApps } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator, httpsCallable } from "firebase/functions";

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
export const functions = getFunctions(app);

// Connect to emulators in development
// Set USE_FIREBASE_EMULATOR=true to use local emulators
const USE_EMULATOR = process.env.EXPO_PUBLIC_USE_EMULATOR === "true";

if (USE_EMULATOR) {
  console.log("Connecting to Firebase Emulators...");
  // Use 127.0.0.1 for iOS simulator compatibility
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
}

export const sendPushNotificationCallable = httpsCallable<
  { token: string; title?: string; body?: string },
  { success: boolean; messageId?: string; error?: string }
>(functions, "sendPushNotification");

export const sendElevatedHeartRatePushCallable = httpsCallable<
  { bpm?: number },
  { success: boolean; messageId?: string; error?: string }
>(functions, "sendElevatedHeartRatePush");
