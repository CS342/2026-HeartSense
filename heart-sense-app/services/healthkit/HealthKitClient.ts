/**
 * HealthKitClient — thin abstraction over @kingstinct/react-native-healthkit.
 *
 * The rest of the app calls these functions; they never import the library directly.
 * Every public function is safe to call on Android/web — it returns null / false.
 */
import { Platform } from 'react-native';
import {
  isHealthDataAvailable,
  requestAuthorization,
  getMostRecentQuantitySample,
  queryQuantitySamples,
  queryStatisticsForQuantity,
} from '@kingstinct/react-native-healthkit';
import {
  HK_IDENTIFIERS,
  READ_IDENTIFIERS,
  WRITE_IDENTIFIERS,
  type LatestVitals,
  type VitalsSample,
  type DailyActivity,
} from './types';
import { toVitalsSample, toCalendarDate } from './mappers';

// ── Availability ────────────────────────────────────────────────────

export function checkAvailability(): boolean {
  if (Platform.OS !== 'ios') return false;
  try {
    return isHealthDataAvailable();
  } catch {
    return false;
  }
}

// ── Authorization ───────────────────────────────────────────────────

export async function requestHealthPermissions(): Promise<boolean> {
  if (!checkAvailability()) return false;
  try {
    await requestAuthorization({
      toRead: READ_IDENTIFIERS as any,
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
    const raw = await getMostRecentQuantitySample(HK_IDENTIFIERS[key] as any);
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

  const keys = ['heartRate', 'restingHeartRate', 'heartRateVariability', 'respiratoryRate'] as const;
  const results: VitalsSample[] = [];

  for (const key of keys) {
    try {
      const samples = await queryQuantitySamples(HK_IDENTIFIERS[key] as any, {
        from,
        to,
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
    const samples = await queryQuantitySamples(HK_IDENTIFIERS.stepCount as any, {
      from,
      to,
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
