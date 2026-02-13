/**
 * HealthDataTracker — headless component that bridges HealthKit → Firebase.
 *
 * Mount this once inside a provider that supplies AuthContext.
 * It requests HealthKit permissions on mount and triggers a once-daily
 * bulk sync of the last 24 hours of health data to Firestore.
 *
 * Renders nothing — pure side-effect component.
 */
import { useEffect, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { checkAvailability, requestHealthPermissions } from '@/services/healthkit';
import { performDailySync } from '@/services/healthkit/healthSyncService';

export function HealthDataTracker() {
  const { user } = useAuth();
  const isSyncing = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const runDailySync = async () => {
    if (isSyncing.current || !user) return;
    isSyncing.current = true;
    try {
      await performDailySync(user.uid);
    } catch (err) {
      if (__DEV__) console.warn('[HealthDataTracker] Daily sync error:', err);
    } finally {
      isSyncing.current = false;
    }
  };

  // Request HealthKit permissions + run daily sync on mount
  useEffect(() => {
    if (Platform.OS !== 'ios' || !user || !checkAvailability()) return;

    (async () => {
      const granted = await requestHealthPermissions();
      if (granted) {
        runDailySync();
      }
    })();
  }, [user]);

  // Re-sync when app returns to foreground (still gated by "already synced today" check)
  useEffect(() => {
    if (Platform.OS !== 'ios' || !user) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        runDailySync();
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [user]);

  return null;
}
