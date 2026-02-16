import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { theme } from '@/theme/colors';

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const { onboardingCompleted, loading: onboardingLoading } = useOnboarding();
  const router = useRouter();

  useEffect(() => {
    if (authLoading || (user && onboardingLoading)) return;

    if (!user) {
      router.replace('/auth/login');
      return;
    }

    if (onboardingCompleted !== true) {
      router.replace('/onboarding');
      return;
    }

    router.replace('/(tabs)');
  }, [user, authLoading, onboardingCompleted, onboardingLoading]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
});
