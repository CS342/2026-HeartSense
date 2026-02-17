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

// ── Workout models ──────────────────────────────────────────────────

/**
 * Mapping from WorkoutActivityType enum values to human-readable names.
 * Only the activity types relevant to a cardiac health study are included.
 */
export const WORKOUT_ACTIVITY_NAMES: Record<number, string> = {
  1: 'American Football',
  6: 'Basketball',
  8: 'Boxing',
  9: 'Climbing',
  11: 'Cross Training',
  13: 'Cycling',
  14: 'Dance',
  16: 'Elliptical',
  20: 'Strength Training',
  21: 'Golf',
  24: 'Hiking',
  29: 'Mind & Body',
  35: 'Rowing',
  37: 'Running',
  41: 'Soccer',
  44: 'Stair Climbing',
  46: 'Swimming',
  48: 'Tennis',
  50: 'Traditional Strength Training',
  52: 'Walking',
  57: 'Yoga',
  58: 'Barre',
  59: 'Core Training',
  62: 'Flexibility',
  63: 'HIIT',
  64: 'Jump Rope',
  66: 'Pilates',
  72: 'Tai Chi',
  73: 'Mixed Cardio',
  79: 'Pickleball',
  80: 'Cooldown',
  3000: 'Other',
};

/** A normalised workout record from HealthKit. */
export interface WorkoutRecord {
  /** HealthKit UUID — used for de-duplication. */
  uuid: string;
  /** Human-readable activity name (e.g. "Running"). */
  activityType: string;
  /** Raw WorkoutActivityType enum value. */
  activityTypeRaw: number;
  /** Duration in minutes. */
  durationMinutes: number;
  /** Total energy burned in kcal, if available. */
  caloriesBurned: number | null;
  /** Total distance in km, if available. */
  distanceKm: number | null;
  /** ISO-8601 start timestamp. */
  startDate: string;
  /** ISO-8601 end timestamp. */
  endDate: string;
  /** Whether this was an indoor workout. */
  indoor: boolean;
}
