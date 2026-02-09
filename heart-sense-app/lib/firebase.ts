import { initializeApp, getApps } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

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
export const functions = getFunctions(app);

// Connect to emulators in development
// Set USE_FIREBASE_EMULATOR=true to use local emulators
const USE_EMULATOR = process.env.EXPO_PUBLIC_USE_EMULATOR === "true";

if (USE_EMULATOR) {
  console.log("Connecting to Firebase Emulators...");
  connectFirestoreEmulator(db, "localhost", 8080);
  connectAuthEmulator(auth, "http://localhost:9099");
  connectFunctionsEmulator(functions, "localhost", 5001);
}

