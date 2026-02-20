/**
 * Elevated heart rate notification — when HealthKit reports heart rate above
 * the user's threshold, show a local notification asking them to log a symptom.
 * Users receive these by default; cooldown avoids spam.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { showLocalNotification } from './notificationService';
import type { LatestVitals } from '@/services/healthkit';

const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes between notifications
const DEFAULT_THRESHOLD_BPM = 100;
const STORAGE_KEY_PREFIX = '@heartsense/elevatedHrNotifiedAt_';

export const ELEVATED_HR_NOTIFICATION_SCREEN = 'symptom-entry';

export interface ElevatedHrPrefs {
  elevated_heart_rate_threshold_bpm: number;
}

/**
 * Load elevated heart rate threshold from Firestore (users receive notifications by default).
 */
export async function getElevatedHrPrefs(userId: string): Promise<ElevatedHrPrefs> {
  try {
    const ref = doc(db, 'user_preferences', userId);
    const snap = await getDoc(ref);
    const data = snap.exists() ? snap.data() : undefined;
    return {
      elevated_heart_rate_threshold_bpm:
        typeof data?.elevated_heart_rate_threshold_bpm === 'number'
          ? data.elevated_heart_rate_threshold_bpm
          : DEFAULT_THRESHOLD_BPM,
    };
  } catch {
    return {
      elevated_heart_rate_threshold_bpm: DEFAULT_THRESHOLD_BPM,
    };
  }
}

/**
 * If latest vitals show heart rate at or above the user's threshold and cooldown
 * has passed, show a local notification prompting them to log a symptom. Tapping opens symptom-entry.
 */
export async function checkAndNotifyIfElevated(
  userId: string,
  vitals: LatestVitals
): Promise<void> {
  const hr = vitals.heartRate?.value;
  if (hr == null) return;

  const prefs = await getElevatedHrPrefs(userId);
  if (hr < prefs.elevated_heart_rate_threshold_bpm) return;

  const storageKey = `${STORAGE_KEY_PREFIX}${userId}`;
  const lastStr = await AsyncStorage.getItem(storageKey);
  if (lastStr) {
    const last = parseInt(lastStr, 10);
    if (!isNaN(last) && Date.now() - last < COOLDOWN_MS) return;
  }

  await showLocalNotification(
    'Elevated heart rate detected',
    'An elevated heart rate was detected. Consider logging a symptom to help your care team.',
    { screen: ELEVATED_HR_NOTIFICATION_SCREEN }
  );
  await AsyncStorage.setItem(storageKey, String(Date.now()));
}
