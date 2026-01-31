import { auth, db } from "./firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function signup(email: string, password: string, fullName: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);

  const user = cred.user;

  // 🔥 THIS is where the profile gets created with UID as doc ID
  await setDoc(doc(db, "profiles", user.uid), {
    email: user.email,
    full_name: fullName,
    date_of_birth: null,
    gender: null,
    height_cm: null,
    weight_kg: null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });

  // Create notification preferences too
  await setDoc(doc(db, "user_preferences", user.uid), {
    notify_daily_reminder: true,
    notify_messages: true,
    notify_health_insights: true,
    notify_activity_milestones: true,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

export async function login(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email, password);
}
