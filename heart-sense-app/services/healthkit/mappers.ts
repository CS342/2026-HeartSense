/**
 * Maps raw HealthKit samples into our normalised domain models.
 */
import type { HKIdentifierKey, VitalsSample } from './types';

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
