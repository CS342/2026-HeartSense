/**
 * HealthDataTracker — headless component that bridges HealthKit → Firebase.
 *
 * Mount this once inside a provider that supplies AuthContext.
 * It requests HealthKit permissions, periodically reads the latest vitals,
 * and writes new samples to the `health_data` Firestore collection.
 * It also syncs workouts to the `activities` collection.
 *
 * Renders nothing — pure side-effect component.
 */
import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { useHealthKit } from '@/hooks/useHealthKit';
import type { VitalsSample, WorkoutRecord } from '@/services/healthkit';

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 min

export function HealthDataTracker() {
  const { user } = useAuth();
  const { isAvailable, isAuthorized, vitals, workouts, refresh } = useHealthKit();

  // Track what we've already persisted to avoid duplicate writes
  const lastSaved = useRef<Record<string, string>>({});
  const savedWorkoutUuids = useRef<Set<string>>(new Set());

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

  const persistWorkout = useCallback(
    async (workout: WorkoutRecord) => {
      if (!user) return;

      // Skip if we already saved this workout in this session
      if (savedWorkoutUuids.current.has(workout.uuid)) return;
      savedWorkoutUuids.current.add(workout.uuid);

      try {
        // Check Firestore for existing record with this UUID to avoid cross-session duplicates
        const q = query(
          collection(db, 'activities'),
          where('userId', '==', user.uid),
          where('healthkitUuid', '==', workout.uuid),
        );
        const existing = await getDocs(q);
        if (!existing.empty) return;

        await addDoc(collection(db, 'activities'), {
          userId: user.uid,
          activityType: workout.activityType,
          durationMinutes: workout.durationMinutes,
          intensity: inferIntensity(workout),
          description: buildWorkoutDescription(workout),
          occurredAt: Timestamp.fromDate(new Date(workout.startDate)),
          createdAt: Timestamp.now(),
          source: 'healthkit',
          healthkitUuid: workout.uuid,
          caloriesBurned: workout.caloriesBurned,
          distanceKm: workout.distanceKm,
          indoor: workout.indoor,
        });

        if (__DEV__) console.log('[HealthDataTracker] Synced workout:', workout.activityType, workout.durationMinutes, 'min');
      } catch (err) {
        if (__DEV__) console.warn('[HealthDataTracker] Workout sync failed:', err);
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

  // When workouts change, persist new ones
  useEffect(() => {
    if (!user || !isAuthorized || workouts.length === 0) return;

    for (const w of workouts) {
      persistWorkout(w);
    }
  }, [workouts, user, isAuthorized, persistWorkout]);

  // Periodic refresh as a safety net
  useEffect(() => {
    if (Platform.OS !== 'ios' || !isAuthorized) return;

    const interval = setInterval(refresh, SYNC_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAuthorized, refresh]);

  return null;
}

/** Infer intensity from workout type and duration. */
function inferIntensity(w: WorkoutRecord): 'low' | 'moderate' | 'high' {
  // High-intensity activity types
  const highTypes = new Set(['Running', 'HIIT', 'Boxing', 'Jump Rope', 'Swimming']);
  // Low-intensity activity types
  const lowTypes = new Set(['Walking', 'Yoga', 'Mind & Body', 'Tai Chi', 'Flexibility', 'Cooldown', 'Golf']);

  if (highTypes.has(w.activityType)) return 'high';
  if (lowTypes.has(w.activityType)) return 'low';
  return 'moderate';
}

/** Build a concise description string for a synced workout. */
function buildWorkoutDescription(w: WorkoutRecord): string {
  const parts: string[] = [`Synced from Apple Watch`];
  if (w.caloriesBurned) parts.push(`${w.caloriesBurned} kcal`);
  if (w.distanceKm) parts.push(`${w.distanceKm} km`);
  if (w.indoor) parts.push('(indoor)');
  return parts.join(' · ');
}
