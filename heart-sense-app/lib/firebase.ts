import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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

