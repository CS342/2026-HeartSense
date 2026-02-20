import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendEmailVerification,
  reload,
  User,
  ActionCodeSettings,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function signup(email: string, password: string, fullName: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  const user = cred.user;

  // Send verification email. For local testing we use http://localhost:19006 as continue URL.
  const actionCodeSettings: ActionCodeSettings = {
    url: process.env.EXPO_ACTION_URL || "http://localhost:19006",
    handleCodeInApp: false,
  };

  try {
    await sendEmailVerification(user, actionCodeSettings);
  } catch (err) {
    console.error("Failed to send verification email:", err);
  }

  // 🔥 THIS is where the profile gets created with UID as doc ID
  await setDoc(doc(db, "profiles", user.uid), {
    email: user.email,
    full_name: fullName,
    date_of_birth: null,
    gender: null,
    height_cm: null,
    weight_kg: null,
    onboarding_completed: false,
    email_verified: user.emailVerified,
    email_verification_sent_at: serverTimestamp(),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  // Create notification preferences too
  await setDoc(doc(db, "user_preferences", user.uid), {
    notify_daily_reminder: true,
    notify_health_insights: true,
    notify_activity_milestones: true,
    notify_elevated_heart_rate: true,
    elevated_heart_rate_threshold_bpm: 100,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function login(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function resendVerification(user?: User) {
  const current = user || auth.currentUser;
  if (!current) throw new Error("No authenticated user to send verification to");

  const actionCodeSettings: ActionCodeSettings = {
    url: process.env.EXPO_ACTION_URL || "http://localhost:19006",
    handleCodeInApp: false,
  };

  return sendEmailVerification(current, actionCodeSettings);
}

export async function reloadUser() {
  const current = auth.currentUser;
  if (!current) return null;
  await reload(current);
  return current;
}
