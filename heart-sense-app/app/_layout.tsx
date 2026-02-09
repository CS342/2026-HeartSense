import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { NotificationBanner } from '@/components/NotificationBanner';
import * as Notifications from 'expo-notifications';

export default function RootLayout() {
  useFrameworkReady();
  const [notification, setNotification] = useState<{
    title: string;
    message: string;
    visible: boolean;
  }>({ title: '', message: '', visible: false });

  useEffect(() => {
    // Listen for notifications and show in-app banner
    const subscription = Notifications.addNotificationReceivedListener(notif => {
      const title = notif.request.content.title || 'Notification';
      const body = notif.request.content.body || '';
      setNotification({ title, message: body, visible: true });
    });

    return () => subscription.remove();
  }, []);

  return (
    <AuthProvider>
      <View style={{ flex: 1 }}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="auth/login" />
          <Stack.Screen name="auth/signup" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="+not-found" />
        </Stack>
        <NotificationBanner
          title={notification.title}
          message={notification.message}
          visible={notification.visible}
          onDismiss={() => setNotification(prev => ({ ...prev, visible: false }))}
          type="info"
        />
        <StatusBar style="auto" />
      </View>
    </AuthProvider>
  );
}
