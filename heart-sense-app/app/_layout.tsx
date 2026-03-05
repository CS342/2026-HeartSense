import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { AuthProvider } from '@/contexts/AuthContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { NotificationBanner } from '@/components/NotificationBanner';
import { HealthDataTracker } from '@/components/HealthDataTracker';

// Show notifications even when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function RootLayout() {
  useFrameworkReady();
  const [fontsLoaded] = useFonts({ DMSans_400Regular, DMSans_500Medium, DMSans_700Bold });
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

  if (!fontsLoaded) return null;

  // Apply DM Sans globally via default Text style
  const defaultTextStyle = (Text as any).defaultProps ?? {};
  (Text as any).defaultProps = { ...defaultTextStyle, style: [{ fontFamily: 'DMSans_400Regular' }, defaultTextStyle.style] };

  return (
    <ThemeProvider>
      <AuthProvider>
        <OnboardingProvider>
          <HealthDataTracker />
          <ThemedRoot notification={notification} setNotification={setNotification} />
        </OnboardingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function ThemedRoot({ notification, setNotification }: {
  notification: { title: string; message: string; visible: boolean };
  setNotification: React.Dispatch<React.SetStateAction<{ title: string; message: string; visible: boolean }>>;
}) {
  const { isDark, colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/login" />
        <Stack.Screen name="auth/signup" />
        <Stack.Screen name="onboarding/index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="screens/symptom-entry" />
        <Stack.Screen name="screens/wellbeing-rating" />
        <Stack.Screen name="screens/activity-entry" />
        <Stack.Screen name="screens/medical-condition" />
        <Stack.Screen name="screens/help" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <NotificationBanner
        title={notification.title}
        message={notification.message}
        visible={notification.visible}
        onDismiss={() => setNotification(prev => ({ ...prev, visible: false }))}
        type="info"
      />
      <StatusBar style={isDark ? 'light' : 'auto'} />
    </View>
  );
}
