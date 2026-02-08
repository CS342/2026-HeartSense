/**
 * HealthDataTracker — headless component that bridges HealthKit → Firebase.
 *
 * Mount this once inside a provider that supplies AuthContext.
 * It requests HealthKit permissions, periodically reads the latest vitals,
 * and writes new samples to the `health_data` Firestore collection.
 *
 * Renders nothing — pure side-effect component.
 */
import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { useHealthKit } from '@/hooks/useHealthKit';
import type { LatestVitals, VitalsSample } from '@/services/healthkit';

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 min

export function HealthDataTracker() {
  const { user } = useAuth();
  const { isAvailable, isAuthorized, vitals, refresh } = useHealthKit();

  // Track what we've already persisted to avoid duplicate writes
  const lastSaved = useRef<Record<string, string>>({});

  const persistSample = useCallback(
    async (sample: VitalsSample) => {
      if (!user) return;

      // De-dup key: type + startDate
      const key = `${sample.type}:${sample.startDate}`;
      if (lastSaved.current[key]) return;
      lastSaved.current[key] = sample.startDate;

      try {
        await addDoc(collection(db, 'health_data'), {
          user_id: user.uid,
          data_type: sample.type,
          value: sample.value,
          unit: sample.unit,
          recorded_at: sample.startDate,
          created_at: new Date().toISOString(),
        });
      } catch (err) {
        if (__DEV__) console.warn('[HealthDataTracker] Firestore write failed:', err);
      }
    },
    [user],
  );

  // When vitals change, persist any new samples
  useEffect(() => {
    if (!user || !isAuthorized || !vitals) return;

    const samples: (VitalsSample | null)[] = [
      vitals.heartRate,
      vitals.restingHeartRate,
      vitals.hrv,
      vitals.respiratoryRate,
      vitals.steps,
    ];

    for (const s of samples) {
      if (s) persistSample(s);
    }
  }, [vitals, user, isAuthorized, persistSample]);

  // Periodic refresh as a safety net
  useEffect(() => {
    if (Platform.OS !== 'ios' || !isAuthorized) return;

    const interval = setInterval(refresh, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthorized, refresh]);

  return null;
}
