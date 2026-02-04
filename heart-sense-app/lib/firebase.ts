import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";

const firebaseConfig = {
  apiKey: "AIzaSyBjvgfRG-kohTjhwJe3fKmlqpI5FYgljvE",
  authDomain: "heartsense-772bd.firebaseapp.com",
  projectId: "heartsense-772bd",
  storageBucket: "heartsense-772bd.appspot.com",
  messagingSenderId: "298431825008",
  appId: "1:298431825008:web:a2fd6877bad9cdf9f3a0b5",
  measurementId: "G-1NJQS7P9QK",
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
// Use us-central1 to match Firebase Functions default region. If you get
// functions/not-found, deploy with: cd heart-sense-firebase && firebase deploy --only functions
const functions = getFunctions(app, "us-central1");

/** Call a Firebase callable function by name. */
export async function callFunction<T = unknown, R = unknown>(
  name: string,
  data?: T
): Promise<R> {
  try {
    const fn = httpsCallable<T, { success: boolean; data?: R; error?: string }>(functions, name);
    const res = await fn(data);
    if (!res.data.success && res.data.error) {
      console.error("[callFunction] Function returned error:", {
        name,
        error: res.data.error,
        fullResponse: res.data,
      });
      throw new Error(res.data.error);
    }
    return res.data.data as R;
  } catch (err: unknown) {
    const errObj = err as { code?: string; message?: string; details?: unknown };
    console.error("[callFunction] Request failed:", {
      name,
      data,
      code: errObj?.code,
      message: errObj?.message,
      details: errObj?.details,
      fullError: err,
    });
    throw err;
  }
}

