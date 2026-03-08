/**
 * HealthKitClient — thin abstraction over @kingstinct/react-native-healthkit.
 *
 * The rest of the app calls these functions; they never import the library directly.
 * Every public function is safe to call on Android/web — it returns null / false.
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import {
  HK_IDENTIFIERS,
  READ_IDENTIFIERS,
  WRITE_IDENTIFIERS,
  type LatestVitals,
  type VitalsSample,
  type DailyActivity,
  type WorkoutRecord,
} from './types';
import { toVitalsSample, toCalendarDate, toWorkoutRecord } from './mappers';
import { sendElevatedHeartRatePushCallable } from '@/lib/firebase';
import { showLocalNotification } from '@/lib/notificationService';
import { ELEVATED_HR_NOTIFICATION_SCREEN } from '@/lib/elevatedHeartRateNotification';

// NitroModules (used by react-native-healthkit) crash in Expo Go.
// Defer the require so it only runs in a real native build.
const isExpoGo = Constants.appOwnership === 'expo';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let HealthKit: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let isHealthDataAvailable: (() => boolean) | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let requestAuthorization: ((opts: any) => Promise<void>) | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let getMostRecentQuantitySample: ((id: any) => Promise<any>) | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let queryQuantitySamples: ((id: any, opts: any) => Promise<any[]>) | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let queryWorkoutSamples: ((opts: any) => Promise<any[]>) | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let getMostRecentWorkout: (() => Promise<any>) | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let UpdateFrequency: any = null;

if (!isExpoGo) {
  try {
    const hk = require('@kingstinct/react-native-healthkit');
    HealthKit = hk.default ?? hk;
    isHealthDataAvailable = hk.isHealthDataAvailable;
    requestAuthorization = hk.requestAuthorization;
    getMostRecentQuantitySample = hk.getMostRecentQuantitySample;
    queryQuantitySamples = hk.queryQuantitySamples;
    queryWorkoutSamples = hk.queryWorkoutSamples;
    getMostRecentWorkout = hk.getMostRecentWorkout;
    UpdateFrequency = hk.UpdateFrequency;
  } catch (e) {
    if (__DEV__) console.warn('[HealthKit] Failed to load native module:', e);
  }
}

// ── Availability ────────────────────────────────────────────────────

export function checkAvailability(): boolean {
  if (isExpoGo) return false;
  if (Platform.OS !== 'ios') return false;
  try {
    return isHealthDataAvailable?.() ?? false;
  } catch {
    return false;
  }
}

// ── Authorization ───────────────────────────────────────────────────

/** Identifier needed to read workouts from HealthKit. */
const WORKOUT_TYPE_IDENTIFIER = 'HKWorkoutTypeIdentifier';

export async function requestHealthPermissions(): Promise<boolean> {
  if (!checkAvailability()) return false;
  try {
    await requestAuthorization?.({
      toRead: [...READ_IDENTIFIERS, WORKOUT_TYPE_IDENTIFIER] as any,
      toShare: WRITE_IDENTIFIERS as any,
    });
    return true;
  } catch (err) {
    if (__DEV__) console.warn('[HealthKit] Authorization failed:', err);
    return false;
  }
}

// ── Latest vitals (most-recent sample per metric) ───────────────────

export async function getLatestVitals(): Promise<LatestVitals> {
  if (!checkAvailability()) {
    return { heartRate: null, restingHeartRate: null, hrv: null, respiratoryRate: null, steps: null, lastUpdated: null };
  }

  const [hr, rhr, hrv, rr, steps] = await Promise.all([
    safeGetLatest('heartRate'),
    safeGetLatest('restingHeartRate'),
    safeGetLatest('heartRateVariability'),
    safeGetLatest('respiratoryRate'),
    safeGetLatest('stepCount'),
  ]);

  const allDates = [hr, rhr, hrv, rr, steps]
    .filter(Boolean)
    .map(s => new Date(s!.startDate).getTime());
  const lastUpdated = allDates.length > 0
    ? new Date(Math.max(...allDates)).toISOString()
    : null;

  return { heartRate: hr, restingHeartRate: rhr, hrv, respiratoryRate: rr, steps, lastUpdated };
}

async function safeGetLatest(
  key: keyof typeof HK_IDENTIFIERS,
): Promise<VitalsSample | null> {
  try {
    const raw = await getMostRecentQuantitySample?.(HK_IDENTIFIERS[key] as any);
    return toVitalsSample(key, raw as any);
  } catch {
    return null;
  }
}

// ── Vitals over a date range ────────────────────────────────────────

export async function getVitals(
  from: Date,
  to: Date,
): Promise<VitalsSample[]> {
  if (!checkAvailability()) return [];

  const keys = ['heartRate', 'restingHeartRate', 'heartRateVariability', 'respiratoryRate', 'stepCount'] as const;
  const results: VitalsSample[] = [];

  for (const key of keys) {
    try {
      const samples = await queryQuantitySamples?.(HK_IDENTIFIERS[key] as any, {
        limit: 0,
        filter: { date: { startDate: from, endDate: to } },
      });
      if (Array.isArray(samples)) {
        for (const s of samples) {
          const mapped = toVitalsSample(key, s as any);
          if (mapped) results.push(mapped);
        }
      }
    } catch {
      // metric unavailable — skip silently
    }
  }

  return results;
}

// ── Daily activity (step counts aggregated per day) ─────────────────

export async function getDailyActivity(
  from: Date,
  to: Date,
): Promise<DailyActivity[]> {
  if (!checkAvailability()) return [];

  try {
    const samples = await queryQuantitySamples?.(HK_IDENTIFIERS.stepCount as any, {
      limit: 0,
      filter: { date: { startDate: from, endDate: to } },
    });

    if (!Array.isArray(samples)) return [];

    // Bucket by calendar date
    const buckets = new Map<string, number>();
    for (const s of samples) {
      const raw = s as any;
      const date = toCalendarDate(raw.startDate);
      buckets.set(date, (buckets.get(date) ?? 0) + (raw.quantity ?? 0));
    }

    return Array.from(buckets.entries())
      .map(([date, steps]) => ({ date, steps: Math.round(steps) }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

// ── Workouts ─────────────────────────────────────────────────────────

/**
 * Query recent workouts from HealthKit.
 * Returns up to `limit` workouts, most-recent first.
 */
export async function getRecentWorkouts(limit = 20): Promise<WorkoutRecord[]> {
  if (!checkAvailability()) return [];

  try {
    const proxies = await queryWorkoutSamples?.({
      limit,
      ascending: false,
    });

    if (!Array.isArray(proxies)) return [];

    const results: WorkoutRecord[] = [];
    for (const proxy of proxies) {
      try {
        // Fetch per-workout statistics (calories, distance)
        const stats = await (proxy as any).getAllStatistics();
        results.push(toWorkoutRecord(proxy as any, stats));
      } catch {
        // If stats fail, still record the workout without them
        results.push(toWorkoutRecord(proxy as any));
      }
    }

    return results;
  } catch (err) {
    if (__DEV__) console.warn('[HealthKit] queryWorkoutSamples failed:', err);
    return [];
  }
}

/**
 * Get the single most-recent workout.
 */
export async function getLatestWorkout(): Promise<WorkoutRecord | null> {
  if (!checkAvailability()) return null;

  try {
    const proxy = await getMostRecentWorkout?.();
    if (!proxy) return null;

    let stats: Record<string, any> | undefined;
    try {
      stats = await (proxy as any).getAllStatistics();
    } catch {
      // stats unavailable — continue without
    }

    return toWorkoutRecord(proxy as any, stats);
  } catch (err) {
    if (__DEV__) console.warn('[HealthKit] getMostRecentWorkout failed:', err);
    return null;
  }
}


export async function subscribeToHighHeartRateEvent(): Promise<boolean> {
  console.log('Subscribing to high heart rate event');
  if (!checkAvailability() || !HealthKit) return false;

  // Step 1: Request authorization for the category type
  await HealthKit.requestAuthorization({ toRead: [HK_IDENTIFIERS.highHeartRateEvent] });

  // Step 2: Enable background delivery (this is what wakes your app)
  await HealthKit.enableBackgroundDelivery(
    HK_IDENTIFIERS.highHeartRateEvent,
    UpdateFrequency?.immediate
  );

  console.log('Subscribing to changes to high heart rate');
  // Step 3: Subscribe to changes (this sets up the HKObserverQuery + event listener)
  const subscription = HealthKit.subscribeToChanges(
    HK_IDENTIFIERS.highHeartRateEvent, 
    () => {
      // This callback fires when a new high heart rate event lands in HealthKit.
      void handleHighHeartRateEvent();
    }
  );

  console.log('Subscribed to changes', subscription);
  return subscription !== null;
}

export async function handleHighHeartRateEvent(): Promise<void> {
  console.log('High heart rate detected');
  const message = `We detected an elevated heart rate. Please log a symptom.`;
  // Local notification (shows when app is in foreground)
  await showLocalNotification(
    'Elevated Heart Rate Detected',
    message,
    { screen: ELEVATED_HR_NOTIFICATION_SCREEN }
  );

  // Ask backend to send a push so the user gets it when app is in background or closed
  try {
    const { data } = await sendElevatedHeartRatePushCallable();
    if (!data?.success && data?.error) {
      console.warn('[handleHighHeartRateEvent] Push failed:', data.error);
    }
  } catch (err) {
    console.warn('[handleHighHeartRateEvent] Push call failed:', err);
  }
}