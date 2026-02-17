import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { signup as fbSignup, login as fbLogin, resendVerification as fbResendVerification, reloadUser as fbReloadUser } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  refreshUser: () => Promise<import('firebase/auth').User | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('AuthProvider: Setting up auth listener');

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
    await fbSignup(email, password, fullName);
  };

  const signIn = async (email: string, password: string) => {
    await fbLogin(email, password);
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  const resendVerification = async () => {
    await fbResendVerification();
  };

  const refreshUser = async () => {
    return fbReloadUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp,
        signIn,
        resendVerification,
        refreshUser,
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
