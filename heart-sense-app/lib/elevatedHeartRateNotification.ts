import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import { showLocalNotification } from './notificationService';
import type { LatestVitals } from '@/services/healthkit';

export const ELEVATED_HR_NOTIFICATION_SCREEN = 'symptom-entry';

const DEFAULT_THRESHOLD_BPM = 100;
const COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

function cooldownKey(userId: string) {
  return `elevated_hr_last_notified_${userId}`;
}

export interface ElevatedHrPrefs {
  elevated_heart_rate_threshold_bpm: number;
}

export async function getElevatedHrPrefs(userId: string): Promise<ElevatedHrPrefs> {
  try {
    const snap = await getDoc(doc(db, 'user_preferences', userId));
    if (snap.exists()) {
      const value = snap.data()?.elevated_heart_rate_threshold_bpm;
      if (typeof value === 'number') {
        return { elevated_heart_rate_threshold_bpm: value };
      }
    }
  } catch {
    // network error or permission denied — fall through to default
  }
  return { elevated_heart_rate_threshold_bpm: DEFAULT_THRESHOLD_BPM };
}

export async function checkAndNotifyIfElevated(
  userId: string,
  vitals: LatestVitals
): Promise<void> {
  if (!vitals.heartRate) return;

  const bpm = vitals.heartRate.value;
  const { elevated_heart_rate_threshold_bpm: threshold } = await getElevatedHrPrefs(userId);

  if (bpm < threshold) return;

  // Enforce cooldown
  const key = cooldownKey(userId);
  const lastNotified = await AsyncStorage.getItem(key);
  if (lastNotified && Date.now() - Number(lastNotified) < COOLDOWN_MS) return;

  await showLocalNotification(
    'Elevated Heart Rate Detected',
    `Your heart rate is ${bpm} bpm. Would you like to log a symptom?`,
    { screen: ELEVATED_HR_NOTIFICATION_SCREEN }
  );

  await AsyncStorage.setItem(key, String(Date.now()));
}
