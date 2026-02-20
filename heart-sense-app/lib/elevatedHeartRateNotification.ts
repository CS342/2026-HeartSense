/**
 * elevatedHeartRateNotification — checks if a heart rate reading is elevated
 * and fires a local notification when it is.
 *
 * The default threshold is 100 bpm (clinical tachycardia boundary at rest).
 * A custom threshold can be supplied to accommodate per-user profiles.
 */
import { showLocalNotification } from './notificationService';

export const DEFAULT_ELEVATED_HR_THRESHOLD_BPM = 100;

export interface ElevatedHeartRateResult {
  /** Whether the reading exceeded the threshold. */
  isElevated: boolean;
  /** The heart rate value that was checked (bpm). */
  heartRateBpm: number;
  /** The threshold that was used (bpm). */
  threshold: number;
  /** Whether a local notification was successfully sent. */
  notificationSent: boolean;
}

/**
 * Checks whether `heartRateBpm` exceeds `thresholdBpm` and, if so,
 * schedules a local notification alerting the user.
 *
 * @param heartRateBpm  - Current heart rate in beats per minute.
 * @param thresholdBpm  - Alert threshold (defaults to 100 bpm).
 * @returns             A result object describing what happened.
 */
export async function checkAndNotifyElevatedHeartRate(
  heartRateBpm: number,
  thresholdBpm: number = DEFAULT_ELEVATED_HR_THRESHOLD_BPM,
): Promise<ElevatedHeartRateResult> {
  const isElevated = heartRateBpm >= thresholdBpm;

  if (!isElevated) {
    return { isElevated, heartRateBpm, threshold: thresholdBpm, notificationSent: false };
  }

  try {
    await showLocalNotification(
      'Elevated Heart Rate Detected',
      `Your heart rate is ${Math.round(heartRateBpm)} bpm, which is above your alert threshold of ${thresholdBpm} bpm. Consider resting and consulting your care team if this persists.`,
      { heartRateBpm, threshold: thresholdBpm },
    );
    return { isElevated, heartRateBpm, threshold: thresholdBpm, notificationSent: true };
  } catch {
    return { isElevated, heartRateBpm, threshold: thresholdBpm, notificationSent: false };
  }
}
