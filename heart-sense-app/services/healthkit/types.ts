/**
 * HealthKit service types.
 *
 * All values are normalised to simple units:
 *   heart rate → bpm (count/min)
 *   HRV        → ms (SDNN)
 *   respiratory → breaths/min
 *   steps      → count
 *   timestamps → ISO-8601 strings with timezone offset
 */

// ── Identifier constants ────────────────────────────────────────────

export const HK_IDENTIFIERS = {
  heartRate: 'HKQuantityTypeIdentifierHeartRate',
  restingHeartRate: 'HKQuantityTypeIdentifierRestingHeartRate',
  heartRateVariability: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  respiratoryRate: 'HKQuantityTypeIdentifierRespiratoryRate',
  stepCount: 'HKQuantityTypeIdentifierStepCount',
} as const;

export type HKIdentifierKey = keyof typeof HK_IDENTIFIERS;

/** The identifiers we request read access for. */
export const READ_IDENTIFIERS = Object.values(HK_IDENTIFIERS);

/** We don't write anything back to HealthKit for now. */
export const WRITE_IDENTIFIERS: readonly string[] = [];

// ── Domain models ───────────────────────────────────────────────────

export interface VitalsSample {
  /** Which metric this sample represents. */
  type: HKIdentifierKey;
  /** Numeric value in normalised units. */
  value: number;
  /** Human-readable unit string (e.g. "bpm", "ms", "breaths/min"). */
  unit: string;
  /** ISO-8601 start timestamp. */
  startDate: string;
  /** ISO-8601 end timestamp. */
  endDate: string;
}

export interface DailyActivity {
  /** Calendar date in YYYY-MM-DD format. */
  date: string;
  /** Total step count for the day. */
  steps: number;
}

export interface DailyVitals {
  /** Calendar date in YYYY-MM-DD format. */
  date: string;
  heartRate: { min: number; max: number; avg: number } | null;
  restingHeartRate: number | null;
  hrv: number | null;
  respiratoryRate: number | null;
  steps: number;
}

/** Snapshot of the most-recent value for each metric. */
export interface LatestVitals {
  heartRate: VitalsSample | null;
  restingHeartRate: VitalsSample | null;
  hrv: VitalsSample | null;
  respiratoryRate: VitalsSample | null;
  steps: VitalsSample | null;
  /** When the most recent sample (of any type) was recorded. */
  lastUpdated: string | null;
}
