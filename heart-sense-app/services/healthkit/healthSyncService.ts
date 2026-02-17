/**
 * healthSyncService — Daily bulk sync + on-demand symptom vitals fetch.
 *
 * Two entry points:
 *   performDailySync(userId)        — pull 24h of HealthKit data → Firestore (once per day)
 *   fetchVitalsAroundSymptom(date)  — pull vitals in a ±30-min window for symptom context
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  checkAvailability,
  getVitals,
  getDailyActivity,
  getRecentWorkouts,
} from './HealthKitClient';
import type { VitalsSample, WorkoutRecord } from './types';
import { WORKOUT_ACTIVITY_NAMES } from './types';

// ── Types ───────────────────────────────────────────────────────────

export interface SymptomVitalsContext {
  windowStart: string;
  windowEnd: string;
  samples: VitalsSample[];
  fetchedAt: string;
}

// ── Constants ───────────────────────────────────────────────────────

const LAST_SYNC_KEY = '@heartsense/lastSyncDate';

// ── Daily Bulk Sync ─────────────────────────────────────────────────

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

async function shouldSyncToday(): Promise<boolean> {
  const last = await AsyncStorage.getItem(LAST_SYNC_KEY);
  return last !== todayDateString();
}

/**
 * Pull the last 24 hours of HealthKit data and persist to Firestore.
 * Skips if already synced today (only marked after real data is written).
 * Uses deterministic doc IDs for idempotency.
 */
export async function performDailySync(
  userId: string,
): Promise<{ vitalsCount: number; workoutsCount: number; stepsCount: number }> {
  if (!checkAvailability()) {
    if (__DEV__) console.log('[healthSyncService] Skipped — HealthKit not available');
    return { vitalsCount: 0, workoutsCount: 0, stepsCount: 0 };
  }
  if (!(await shouldSyncToday())) {
    if (__DEV__) console.log('[healthSyncService] Skipped — already synced today');
    return { vitalsCount: 0, workoutsCount: 0, stepsCount: 0 };
  }

  if (__DEV__) console.log('[healthSyncService] Starting daily sync…');

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  let vitalsCount = 0;
  let workoutsCount = 0;
  let stepsCount = 0;

  try {
    // ── Vitals (heart rate, resting HR, HRV, respiratory rate, steps) ──
    const vitals = await getVitals(yesterday, now);
    if (__DEV__) console.log(`[healthSyncService] Fetched ${vitals.length} vitals samples from HealthKit`);
    for (const sample of vitals) {
      const docId = `${userId}_${sample.type}_${sample.startDate}`;
      await setDoc(doc(db, 'health_data', docId), {
        user_id: userId,
        data_type: sample.type,
        value: sample.value,
        unit: sample.unit,
        recorded_at: sample.startDate,
        created_at: new Date().toISOString(),
      }, { merge: true });
      vitalsCount++;
    }

    // ── Daily step totals ──
    const dailySteps = await getDailyActivity(yesterday, now);
    if (__DEV__) console.log(`[healthSyncService] Fetched ${dailySteps.length} daily step records`);
    for (const day of dailySteps) {
      const docId = `${userId}_dailySteps_${day.date}`;
      await setDoc(doc(db, 'health_data', docId), {
        user_id: userId,
        data_type: 'dailySteps',
        value: day.steps,
        unit: 'count',
        recorded_at: day.date,
        created_at: new Date().toISOString(),
      }, { merge: true });
      stepsCount++;
    }

    // ── Workouts ──
    const workouts = await getRecentWorkouts(50);
    // Filter to only workouts within the last 24 hours
    const recentWorkouts = workouts.filter(
      (w) => new Date(w.startDate).getTime() >= yesterday.getTime(),
    );
    if (__DEV__) console.log(`[healthSyncService] Fetched ${recentWorkouts.length} workouts in last 24h`);
    for (const w of recentWorkouts) {
      const docId = `${userId}_workout_${w.uuid}`;
      await setDoc(doc(db, 'activities', docId), {
        userId,
        activityType: w.activityType,
        durationMinutes: w.durationMinutes,
        intensity: inferIntensity(w),
        description: buildWorkoutDescription(w),
        occurredAt: Timestamp.fromDate(new Date(w.startDate)),
        createdAt: Timestamp.now(),
        source: 'healthkit',
        healthkitUuid: w.uuid,
        caloriesBurned: w.caloriesBurned,
        distanceKm: w.distanceKm,
        indoor: w.indoor,
      }, { merge: true });
      workoutsCount++;
    }

    const totalWritten = vitalsCount + stepsCount + workoutsCount;

    // Only mark today as synced if we actually wrote data.
    // This prevents the case where sync runs before HealthKit permissions
    // are granted, gets 0 results, and then never retries.
    if (totalWritten > 0) {
      await AsyncStorage.setItem(LAST_SYNC_KEY, todayDateString());
    }

    if (__DEV__) {
      console.log(
        `[healthSyncService] Daily sync complete: ${vitalsCount} vitals, ${stepsCount} step records, ${workoutsCount} workouts` +
          (totalWritten === 0 ? ' (no data — will retry on next launch)' : ''),
      );
    }
  } catch (err) {
    if (__DEV__) console.warn('[healthSyncService] Daily sync failed:', err);
  }

  return { vitalsCount, workoutsCount, stepsCount };
}

// ── On-Demand Symptom Vitals ────────────────────────────────────────

/**
 * Query HealthKit for vitals in a ±30-minute window around a symptom time.
 * Returns raw samples for embedding on the symptom Firestore document.
 */
export async function fetchVitalsAroundSymptom(
  occurredAt: Date,
): Promise<SymptomVitalsContext> {
  const windowMs = 30 * 60 * 1000; // 30 minutes
  const from = new Date(occurredAt.getTime() - windowMs);
  const to = new Date(Math.min(occurredAt.getTime() + windowMs, Date.now()));

  let samples: VitalsSample[] = [];
  if (checkAvailability()) {
    try {
      samples = await getVitals(from, to);
    } catch (err) {
      if (__DEV__) console.warn('[healthSyncService] Symptom vitals fetch failed:', err);
    }
  }

  return {
    windowStart: from.toISOString(),
    windowEnd: to.toISOString(),
    samples,
    fetchedAt: new Date().toISOString(),
  };
}

// ── Helpers (moved from HealthDataTracker) ──────────────────────────

function inferIntensity(w: WorkoutRecord): 'low' | 'moderate' | 'high' {
  const highTypes = new Set(['Running', 'HIIT', 'Boxing', 'Jump Rope', 'Swimming']);
  const lowTypes = new Set(['Walking', 'Yoga', 'Mind & Body', 'Tai Chi', 'Flexibility', 'Cooldown', 'Golf']);
  if (highTypes.has(w.activityType)) return 'high';
  if (lowTypes.has(w.activityType)) return 'low';
  return 'moderate';
}

function buildWorkoutDescription(w: WorkoutRecord): string {
  const parts: string[] = ['Synced from Apple Watch'];
  if (w.caloriesBurned) parts.push(`${w.caloriesBurned} kcal`);
  if (w.distanceKm) parts.push(`${w.distanceKm} km`);
  if (w.indoor) parts.push('(indoor)');
  return parts.join(' · ');
}
