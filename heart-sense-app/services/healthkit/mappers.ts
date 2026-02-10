/**
 * Maps raw HealthKit samples into our normalised domain models.
 */
import type { HKIdentifierKey, VitalsSample, WorkoutRecord } from './types';
import { WORKOUT_ACTIVITY_NAMES } from './types';

const UNIT_MAP: Record<HKIdentifierKey, string> = {
  heartRate: 'bpm',
  restingHeartRate: 'bpm',
  heartRateVariability: 'ms',
  respiratoryRate: 'breaths/min',
  stepCount: 'count',
};

/**
 * Convert a raw HealthKit quantity sample into a VitalsSample.
 * The library returns objects with { quantity, unit, startDate, endDate }.
 */
export function toVitalsSample(
  type: HKIdentifierKey,
  raw: { quantity: number; startDate: string; endDate: string } | null | undefined,
): VitalsSample | null {
  if (!raw || raw.quantity == null) return null;

  return {
    type,
    value: raw.quantity,
    unit: UNIT_MAP[type],
    startDate: raw.startDate,
    endDate: raw.endDate,
  };
}

/**
 * Format a Date (or ISO string) into a YYYY-MM-DD calendar date.
 */
export function toCalendarDate(d: Date | string): string {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toISOString().slice(0, 10);
}

/**
 * Convert a raw WorkoutProxy (from the library) into a WorkoutRecord.
 *
 * The WorkoutProxy has:
 *   workoutActivityType: number (enum)
 *   duration: { quantity, unit } (seconds)
 *   startDate / endDate: Date
 *   uuid: string
 *   metadataIndoorWorkout?: boolean
 *
 * Energy burned and distance are fetched via getAllStatistics().
 */
export function toWorkoutRecord(
  raw: {
    uuid: string;
    workoutActivityType: number;
    duration: { quantity: number; unit: string };
    startDate: Date | string;
    endDate: Date | string;
    metadataIndoorWorkout?: boolean;
  },
  stats?: Record<string, { sum?: { quantity: number; unit: string } }>,
): WorkoutRecord {
  const durationSec = raw.duration?.quantity ?? 0;

  // Extract energy burned (kcal) and distance (m→km) from statistics
  let caloriesBurned: number | null = null;
  let distanceKm: number | null = null;

  if (stats) {
    const energy = stats['HKQuantityTypeIdentifierActiveEnergyBurned'];
    if (energy?.sum?.quantity) {
      caloriesBurned = Math.round(energy.sum.quantity);
    }
    const distance =
      stats['HKQuantityTypeIdentifierDistanceWalkingRunning'] ||
      stats['HKQuantityTypeIdentifierDistanceCycling'] ||
      stats['HKQuantityTypeIdentifierDistanceSwimming'];
    if (distance?.sum?.quantity) {
      // Library returns meters; convert to km
      distanceKm = Math.round((distance.sum.quantity / 1000) * 100) / 100;
    }
  }

  const startDate = raw.startDate instanceof Date ? raw.startDate.toISOString() : raw.startDate;
  const endDate = raw.endDate instanceof Date ? raw.endDate.toISOString() : raw.endDate;

  return {
    uuid: raw.uuid,
    activityType: WORKOUT_ACTIVITY_NAMES[raw.workoutActivityType] ?? 'Other',
    activityTypeRaw: raw.workoutActivityType,
    durationMinutes: Math.round(durationSec / 60),
    caloriesBurned,
    distanceKm,
    startDate,
    endDate,
    indoor: raw.metadataIndoorWorkout ?? false,
  };
}
