export {
  checkAvailability,
  requestHealthPermissions,
  getLatestVitals,
  getVitals,
  getDailyActivity,
  getRecentWorkouts,
  getLatestWorkout,
} from './HealthKitClient';

export type {
  VitalsSample,
  DailyActivity,
  DailyVitals,
  LatestVitals,
  HKIdentifierKey,
  WorkoutRecord,
} from './types';

export { HK_IDENTIFIERS, READ_IDENTIFIERS, WORKOUT_ACTIVITY_NAMES } from './types';

export { performDailySync, fetchVitalsAroundSymptom } from './healthSyncService';
export type { SymptomVitalsContext } from './healthSyncService';
