export {
  checkAvailability,
  requestHealthPermissions,
  getLatestVitals,
  getVitals,
  getDailyActivity,
} from './HealthKitClient';

export type {
  VitalsSample,
  DailyActivity,
  DailyVitals,
  LatestVitals,
  HKIdentifierKey,
} from './types';

export { HK_IDENTIFIERS, READ_IDENTIFIERS } from './types';
