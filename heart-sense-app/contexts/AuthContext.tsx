import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: Setting up auth listener');

    // Set persistence to LOCAL (stays even after browser close)
    setPersistence(auth, browserLocalPersistence)
      .then(() => {
        console.log('Persistence set to browserLocalPersistence');
      })
      .catch((error) => {
        console.error('Error setting persistence:', error);
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('Auth state changed. User:', user ? `${user.email} (${user.uid})` : 'null');
      setUser(user);
      setLoading(false);
    });

    return () => {
      console.log('AuthProvider: Cleaning up auth listener');
      unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Create user profile in Firestore
    await setDoc(doc(db, 'users', userCredential.user.uid), {
      email,
      fullName,
      createdAt: new Date(),
    });
  };

  const signIn = async (email: string, password: string) => {
    // Ensure persistence is set before signing in
    await setPersistence(auth, browserLocalPersistence);
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
