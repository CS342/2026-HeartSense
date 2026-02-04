/**
 * Firebase connection to the INSTRUCTOR'S project (billing enabled).
 * Use this only for notification-related Cloud Functions (e.g. send push).
 * Auth and Firestore stay on our project (lib/firebase.ts).
 *
 * Replace the config below with your instructor's project config from:
 * Firebase Console → Instructor's project → Project settings → Your apps → config object.
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
// import { getAuth, signInAnonymously } from "firebase/auth";
import { getFunctions, httpsCallable, Functions } from "firebase/functions";

// Your web app's Firebase configuration
const notificationsFirebaseConfig = {
  apiKey: "AIzaSyB3mCwXJEduzAKzgjikiKEbsk7mW3___5o",
  authDomain: "cs342-2026-wong-3qriyd12e.firebaseapp.com",
  projectId: "cs342-2026-wong-3qriyd12e",
  storageBucket: "cs342-2026-wong-3qriyd12e.firebasestorage.app",
  messagingSenderId: "531679372606",
  appId: "1:531679372606:web:da967fc258ba7afa96786f"
};

const NOTIFICATIONS_APP_NAME = "heartSenseNotifications";

function getNotificationsApp(): FirebaseApp {
  const existing = getApps().find((a) => a.name === NOTIFICATIONS_APP_NAME);
  if (existing) return existing;
  return initializeApp(notificationsFirebaseConfig, NOTIFICATIONS_APP_NAME);
}

let notificationsFunctions: Functions | null = null;
let authPromise: Promise<void> | null = null;

/**
 * Sign in anonymously to the instructor's project so callable functions accept the request.
 * Call this before using notification functions. Safe to call multiple times.
 * Requires Anonymous sign-in to be enabled in the instructor's Firebase Console (Authentication → Sign-in method → Anonymous).
 */
// export async function ensureNotificationsAuth(): Promise<void> {
//   if (authPromise) return authPromise;
//   const app = getNotificationsApp();
//   const auth = getAuth(app);
//   if (auth.currentUser) return;
//   authPromise = signInAnonymously(auth).catch((err) => {
//     authPromise = null; // allow retry on failure
//     throw err;
//   });
//   return authPromise;
// }

/** Get the Functions instance for the instructor's project (for sending notifications). */
export function getNotificationsFunctions(): Functions {
  if (!notificationsFunctions) {
    const notificationsApp = getNotificationsApp();
    notificationsFunctions = getFunctions(notificationsApp, "us-central1");
  }
  return notificationsFunctions;
}

/**
 * Call a Cloud Function on the INSTRUCTOR'S project (e.g. sendPushNotification).
 * Automatically signs in anonymously to the instructor's project first so the call is authenticated.
 */
export async function callNotificationFunction<T = unknown, R = unknown>(
  name: string,
  data?: T
): Promise<R> {
  // await ensureNotificationsAuth();
  const functions = getNotificationsFunctions();
  const fn = httpsCallable<T, { success?: boolean; data?: R; error?: string }>(functions, name);
  const res = await fn(data);
  const result = res.data as { success?: boolean; data?: R; error?: string };
  if (result?.success === false && result?.error) {
    throw new Error(result.error);
  }
  return (result?.data ?? result) as R;
}
