/**
 * Tests for elevatedHeartRateNotification.ts
 *
 * Strategy: mock `./notificationService` so that no real Expo APIs are
 * called and we can assert on showLocalNotification's arguments.
 */
import {
  checkAndNotifyElevatedHeartRate,
  DEFAULT_ELEVATED_HR_THRESHOLD_BPM,
} from '../elevatedHeartRateNotification';

// ── Mock notificationService ─────────────────────────────────────────

jest.mock('../notificationService', () => ({
  showLocalNotification: jest.fn(),
}));

import { showLocalNotification } from '../notificationService';
const mockShowLocalNotification = showLocalNotification as jest.MockedFunction<
  typeof showLocalNotification
>;

// ── Helpers ──────────────────────────────────────────────────────────

beforeEach(() => {
  mockShowLocalNotification.mockReset();
  // Default: notification call succeeds and returns a dummy ID
  mockShowLocalNotification.mockResolvedValue('notif-id-123');
});

// ── Tests ─────────────────────────────────────────────────────────────

describe('DEFAULT_ELEVATED_HR_THRESHOLD_BPM', () => {
  it('is 100 bpm', () => {
    expect(DEFAULT_ELEVATED_HR_THRESHOLD_BPM).toBe(100);
  });
});

describe('checkAndNotifyElevatedHeartRate', () => {
  describe('when heart rate is below the threshold', () => {
    it('does not send a notification for a normal reading', async () => {
      const result = await checkAndNotifyElevatedHeartRate(72);

      expect(mockShowLocalNotification).not.toHaveBeenCalled();
      expect(result).toEqual({
        isElevated: false,
        heartRateBpm: 72,
        threshold: DEFAULT_ELEVATED_HR_THRESHOLD_BPM,
        notificationSent: false,
      });
    });

    it('does not send a notification when heart rate is one below the threshold', async () => {
      const result = await checkAndNotifyElevatedHeartRate(99);

      expect(mockShowLocalNotification).not.toHaveBeenCalled();
      expect(result.isElevated).toBe(false);
      expect(result.notificationSent).toBe(false);
    });
  });

  describe('when heart rate meets or exceeds the threshold', () => {
    it('sends a notification at exactly the threshold (100 bpm)', async () => {
      const result = await checkAndNotifyElevatedHeartRate(100);

      expect(mockShowLocalNotification).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        isElevated: true,
        heartRateBpm: 100,
        threshold: DEFAULT_ELEVATED_HR_THRESHOLD_BPM,
        notificationSent: true,
      });
    });

    it('sends a notification for a clearly elevated reading (130 bpm)', async () => {
      const result = await checkAndNotifyElevatedHeartRate(130);

      expect(mockShowLocalNotification).toHaveBeenCalledTimes(1);
      expect(result.isElevated).toBe(true);
      expect(result.notificationSent).toBe(true);
    });

    it('includes the heart rate and threshold in the notification body', async () => {
      await checkAndNotifyElevatedHeartRate(115);

      const [, body] = mockShowLocalNotification.mock.calls[0];
      expect(body).toContain('115');
      expect(body).toContain('100');
    });

    it('passes the heart rate and threshold as notification data', async () => {
      await checkAndNotifyElevatedHeartRate(110);

      const [, , data] = mockShowLocalNotification.mock.calls[0];
      expect(data).toMatchObject({ heartRateBpm: 110, threshold: 100 });
    });
  });

  describe('custom threshold', () => {
    it('does not notify when heart rate is below a custom threshold', async () => {
      const result = await checkAndNotifyElevatedHeartRate(110, 120);

      expect(mockShowLocalNotification).not.toHaveBeenCalled();
      expect(result.isElevated).toBe(false);
      expect(result.threshold).toBe(120);
    });

    it('notifies when heart rate exceeds a custom threshold', async () => {
      const result = await checkAndNotifyElevatedHeartRate(125, 120);

      expect(mockShowLocalNotification).toHaveBeenCalledTimes(1);
      expect(result.isElevated).toBe(true);
      expect(result.threshold).toBe(120);
    });

    it('reflects the custom threshold in the notification body', async () => {
      await checkAndNotifyElevatedHeartRate(125, 120);

      const [, body] = mockShowLocalNotification.mock.calls[0];
      expect(body).toContain('120');
    });
  });

  describe('when the notification call fails', () => {
    it('returns notificationSent: false and does not throw', async () => {
      mockShowLocalNotification.mockRejectedValueOnce(new Error('permission denied'));

      const result = await checkAndNotifyElevatedHeartRate(105);

      expect(result.isElevated).toBe(true);
      expect(result.notificationSent).toBe(false);
    });
  });

  describe('notification title', () => {
    it('uses a descriptive title mentioning elevated heart rate', async () => {
      await checkAndNotifyElevatedHeartRate(110);

      const [title] = mockShowLocalNotification.mock.calls[0];
      expect(title.toLowerCase()).toContain('heart rate');
    });
  });
});
