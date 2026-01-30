import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from "firebase/auth";

import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

export async function signup(email: string, password: string, fullName: string) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  const uid = cred.user.uid;

  await setDoc(doc(db, "profiles", uid), {
    email,
    full_name: fullName,
    date_of_birth: null,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  }, { merge: true });

  await setDoc(doc(db, "user_preferences", uid), {
    notify_daily_reminder: true,
    notify_messages: true,
    notify_health_insights: true,
    notify_activity_milestones: true,
    created_at: serverTimestamp(),
    updated_at: serverTimestamp()
  }, { merge: true });

  return uid;
}

export async function login(email: string, password: string) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user.uid;
}

export async function getMyProfile() {
  const user = auth.currentUser;
  if (!user) throw new Error("Not logged in");

  const snap = await getDoc(doc(db, "profiles", user.uid));
  return snap.exists() ? snap.data() : null;
}
