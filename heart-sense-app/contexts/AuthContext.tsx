import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { signup as fbSignup, login as fbLogin } from '@/lib/auth';
import {
  registerForPushNotificationsAsync,
  subscribeToEngagementAlerts,
} from '@/lib/notificationService';
import * as Notifications from 'expo-notifications';

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
  const alertsUnsubscribeRef = useRef<(() => void) | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Set up notification listeners
  useEffect(() => {
    // Request notification permissions
    registerForPushNotificationsAsync();

    // Listen for notifications when app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for notification taps
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
      // You can navigate to a specific screen here based on the notification data
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, []);

  // Set up Firestore alerts subscription when user logs in
  useEffect(() => {
    if (user) {
      console.log('Setting up engagement alerts subscription for user:', user.uid);
      alertsUnsubscribeRef.current = subscribeToEngagementAlerts(user.uid, (alert) => {
        console.log('New engagement alert:', alert);
      });
    } else {
      // Clean up subscription when user logs out
      if (alertsUnsubscribeRef.current) {
        alertsUnsubscribeRef.current();
        alertsUnsubscribeRef.current = null;
      }
    }

    return () => {
      if (alertsUnsubscribeRef.current) {
        alertsUnsubscribeRef.current();
      }
    };
  }, [user]);

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
