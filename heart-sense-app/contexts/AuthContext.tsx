import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import type { User } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import {
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { signup as fbSignup, login as fbLogin, resendVerification as fbResendVerification, reloadUser as fbReloadUser } from '@/lib/auth';
import {
  registerForPushNotificationsAsync,
  savePushTokenToBackend,
  subscribeToEngagementAlerts,
} from '@/lib/notificationService';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { ELEVATED_HR_NOTIFICATION_SCREEN } from '@/lib/elevatedHeartRateNotification';

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
  const alertsUnsubscribeRef = useRef<(() => void) | null>(null);
  const notificationListener = useRef<Notifications.EventSubscription | null>(null);
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  // Set up notification listeners
  useEffect(() => {
    registerForPushNotificationsAsync().then(token => {
      if (token) console.log('Push token obtained (will save when user is set)');
    });

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data as { screen?: string } | undefined;
      if (data?.screen === ELEVATED_HR_NOTIFICATION_SCREEN) {
        router.push('/screens/symptom-entry');
      }
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

  // When user is set: save push token to backend (so they get notifications when app is closed) and subscribe to engagement alerts
  useEffect(() => {
    if (user) {
      registerForPushNotificationsAsync().then(token => {
        if (token) savePushTokenToBackend(user.uid, token);
      });
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
