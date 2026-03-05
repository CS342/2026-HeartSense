/**
 * HealthDataTracker — headless component that bridges HealthKit → Firebase.
 *
 * Mount this once inside a provider that supplies AuthContext.
 * It requests HealthKit permissions on mount and triggers a once-daily
 * bulk sync of the last 24 hours of health data to Firestore.
 * When app is active, it also checks latest heart rate and may show an
 * elevated-heart-rate notification prompting the user to log a symptom.
 *
 * Renders nothing — pure side-effect component.
 */
import { useEffect, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { checkAvailability, requestHealthPermissions, getLatestVitals } from '@/services/healthkit';
import { performDailySync } from '@/services/healthkit/healthSyncService';
import { checkAndNotifyIfElevated } from '@/lib/elevatedHeartRateNotification';
import { subscribeToHighHeartRateEvent } from '@/services/healthkit/HealthKitClient';

export function HealthDataTracker() {
  const { user } = useAuth();
  const isSyncing = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const runDailySync = async (subscribedToHighHeartRateEvent: boolean) => {
    if (isSyncing.current || !user) return;
    isSyncing.current = true;
    try {
      await performDailySync(user.uid);
      // After sync (or when coming to foreground), check latest heart rate and notify if elevated
      if (checkAvailability()) {
        if (__DEV__) console.log('[HealthDataTracker] Sync done, fetching latest vitals…');

        // getLatestVitals can hang on simulator — race with 5s timeout
        const vitalsOrTimeout = await Promise.race([
          getLatestVitals(),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
        ]);

        if (__DEV__ && vitalsOrTimeout === null) {
          console.log('[HealthDataTracker] DEV: getLatestVitals timed out — HealthKit native call hung');
        }

        let vitals = vitalsOrTimeout ?? {
          heartRate: null, restingHeartRate: null, hrv: null,
          respiratoryRate: null, steps: null, lastUpdated: null,
        };

        if (!subscribedToHighHeartRateEvent) {
          console.log('[HealthDataTracker] Checking HR:', vitals.heartRate?.value ?? 'null', 'bpm');
          await checkAndNotifyIfElevated(user.uid, vitals);
        }
      }
    } catch (err) {
      if (__DEV__) console.warn('[HealthDataTracker] Daily sync error:', err);
    } finally {
      isSyncing.current = false;
    }
  };

  // Request HealthKit permissions + run daily sync on mount.
  // A short delay after authorization gives iOS time to apply the permission
  // grants before we query HealthKit (the authorization promise resolves when
  // the dialog is *presented*, not when the user *responds*).
  useEffect(() => {
    if (Platform.OS !== 'ios' || !user || !checkAvailability()) return;

    let cancelled = false;
    (async () => {
      const granted = await requestHealthPermissions();
      if (__DEV__) console.log('[HealthDataTracker] Permissions requested, granted:', granted);

      // Subscribe to high heart rate event
      const subscribed = await subscribeToHighHeartRateEvent();
      console.log('Subscribed to high heart rate event:', subscribed);

      if (granted && !cancelled) {
        // Brief pause so iOS has time to persist the user's permission choices
        await new Promise((r) => setTimeout(r, 1500));
        if (!cancelled) runDailySync(subscribed);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);

  // Re-sync when app returns to foreground (runDailySync also runs elevated HR check)
  useEffect(() => {
    if (Platform.OS !== 'ios' || !user) return;

    const subscription = AppState.addEventListener('change', (nextState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextState === 'active'
      ) {
        runDailySync(false);
      }
      appStateRef.current = nextState;
    });

    return () => subscription.remove();
  }, [user]);

  return null;
}
