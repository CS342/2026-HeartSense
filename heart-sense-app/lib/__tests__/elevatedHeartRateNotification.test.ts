/**
 * Tests for elevatedHeartRateNotification.ts
 *
 * Mocks:
 *  - @react-native-async-storage/async-storage — cooldown persistence
 *  - firebase/firestore + ./firebase          — user preference reads
 *  - ./notificationService                   — notification delivery
 */
import {
  checkAndNotifyIfElevated,
  getElevatedHrPrefs,
  ELEVATED_HR_NOTIFICATION_SCREEN,
} from '../elevatedHeartRateNotification';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDoc } from 'firebase/firestore';
import { showLocalNotification } from '../notificationService';
import type { LatestVitals } from '@/services/healthkit';

// ── Mocks ────────────────────────────────────────────────────────────

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn() },
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({})),
  getDoc: jest.fn(),
}));

jest.mock('../firebase', () => ({ db: {} }));

jest.mock('../notificationService', () => ({
  showLocalNotification: jest.fn(),
}));

// ── Typed mock handles ────────────────────────────────────────────────

const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<typeof AsyncStorage.getItem>;
const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<typeof AsyncStorage.setItem>;
const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
const mockShowLocalNotification = showLocalNotification as jest.MockedFunction<typeof showLocalNotification>;

// ── Test helpers ──────────────────────────────────────────────────────

/** Build a LatestVitals stub with only heartRate populated. */
function makeVitals(bpm: number | null): LatestVitals {
  return {
    heartRate: bpm != null
      ? { type: 'heartRate', value: bpm, unit: 'bpm', startDate: '', endDate: '' }
      : null,
    restingHeartRate: null,
    hrv: null,
    respiratoryRate: null,
    steps: null,
    lastUpdated: null,
  };
}

/** Build a Firestore DocumentSnapshot stub. */
function makeSnap(exists: boolean, data?: Record<string, unknown>) {
  return { exists: () => exists, data: () => data } as any;
}

const USER_ID = 'user-abc';
const COOLDOWN_MS = 30 * 60 * 1000;

beforeEach(() => {
  jest.clearAllMocks();
  // Default: no cooldown stored, Firestore returns no prefs
  mockGetItem.mockResolvedValue(null);
  mockSetItem.mockResolvedValue(undefined);
  mockGetDoc.mockResolvedValue(makeSnap(false));
  mockShowLocalNotification.mockResolvedValue('notif-id');
});

// ── getElevatedHrPrefs ────────────────────────────────────────────────

describe('getElevatedHrPrefs', () => {
  it('returns the default threshold (100 bpm) when the user has no stored prefs', async () => {
    mockGetDoc.mockResolvedValueOnce(makeSnap(false));

    const prefs = await getElevatedHrPrefs(USER_ID);

    expect(prefs.elevated_heart_rate_threshold_bpm).toBe(100);
  });

  it('returns the custom threshold from Firestore when set', async () => {
    mockGetDoc.mockResolvedValueOnce(
      makeSnap(true, { elevated_heart_rate_threshold_bpm: 130 })
    );

    const prefs = await getElevatedHrPrefs(USER_ID);

    expect(prefs.elevated_heart_rate_threshold_bpm).toBe(130);
  });

  it('falls back to the default threshold when Firestore throws', async () => {
    mockGetDoc.mockRejectedValueOnce(new Error('network error'));

    const prefs = await getElevatedHrPrefs(USER_ID);

    expect(prefs.elevated_heart_rate_threshold_bpm).toBe(100);
  });

  it('falls back to the default when the stored value is not a number', async () => {
    mockGetDoc.mockResolvedValueOnce(
      makeSnap(true, { elevated_heart_rate_threshold_bpm: 'high' })
    );

    const prefs = await getElevatedHrPrefs(USER_ID);

    expect(prefs.elevated_heart_rate_threshold_bpm).toBe(100);
  });
});

// ── checkAndNotifyIfElevated ──────────────────────────────────────────

describe('checkAndNotifyIfElevated', () => {
  describe('when heart rate data is unavailable', () => {
    it('does nothing when vitals.heartRate is null', async () => {
      await checkAndNotifyIfElevated(USER_ID, makeVitals(null));

      expect(mockShowLocalNotification).not.toHaveBeenCalled();
    });
  });

  describe('when heart rate is below the threshold', () => {
    it('does not notify for a normal reading (72 bpm, default threshold 100)', async () => {
      await checkAndNotifyIfElevated(USER_ID, makeVitals(72));

      expect(mockShowLocalNotification).not.toHaveBeenCalled();
    });

    it('does not notify one bpm below the threshold (99 bpm)', async () => {
      await checkAndNotifyIfElevated(USER_ID, makeVitals(99));

      expect(mockShowLocalNotification).not.toHaveBeenCalled();
    });
  });

  describe('when heart rate meets or exceeds the threshold', () => {
    it('sends a notification at exactly the default threshold (100 bpm)', async () => {
      await checkAndNotifyIfElevated(USER_ID, makeVitals(100));

      expect(mockShowLocalNotification).toHaveBeenCalledTimes(1);
    });

    it('sends a notification for a clearly elevated reading (130 bpm)', async () => {
      await checkAndNotifyIfElevated(USER_ID, makeVitals(130));

      expect(mockShowLocalNotification).toHaveBeenCalledTimes(1);
    });

    it('prompts the user to log a symptom in the notification body', async () => {
      await checkAndNotifyIfElevated(USER_ID, makeVitals(110));

      const [, body] = mockShowLocalNotification.mock.calls[0];
      expect(body.toLowerCase()).toContain('symptom');
    });

    it('passes the symptom-entry screen in the notification data', async () => {
      await checkAndNotifyIfElevated(USER_ID, makeVitals(110));

      const [, , data] = mockShowLocalNotification.mock.calls[0];
      expect(data).toMatchObject({ screen: ELEVATED_HR_NOTIFICATION_SCREEN });
    });

    it('persists the notification timestamp in AsyncStorage to enforce cooldown', async () => {
      await checkAndNotifyIfElevated(USER_ID, makeVitals(110));

      expect(mockSetItem).toHaveBeenCalledWith(
        expect.stringContaining(USER_ID),
        expect.any(String)
      );
    });
  });

  describe('cooldown behaviour', () => {
    it('suppresses a notification when the cooldown has not expired', async () => {
      // Simulate a notification sent 5 minutes ago
      const fiveMinutesAgo = String(Date.now() - 5 * 60 * 1000);
      mockGetItem.mockResolvedValueOnce(fiveMinutesAgo);

      await checkAndNotifyIfElevated(USER_ID, makeVitals(110));

      expect(mockShowLocalNotification).not.toHaveBeenCalled();
    });

    it('sends a notification once the cooldown has expired (> 30 min)', async () => {
      // Simulate a notification sent 31 minutes ago
      const thirtyOneMinutesAgo = String(Date.now() - (COOLDOWN_MS + 60_000));
      mockGetItem.mockResolvedValueOnce(thirtyOneMinutesAgo);

      await checkAndNotifyIfElevated(USER_ID, makeVitals(110));

      expect(mockShowLocalNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe('custom Firestore threshold', () => {
    it('respects a user-specific threshold from Firestore (130 bpm)', async () => {
      mockGetDoc.mockResolvedValueOnce(
        makeSnap(true, { elevated_heart_rate_threshold_bpm: 130 })
      );

      // 120 bpm is below 130 — should not notify
      await checkAndNotifyIfElevated(USER_ID, makeVitals(120));

      expect(mockShowLocalNotification).not.toHaveBeenCalled();
    });

    it('notifies when heart rate exceeds the custom Firestore threshold', async () => {
      mockGetDoc.mockResolvedValueOnce(
        makeSnap(true, { elevated_heart_rate_threshold_bpm: 130 })
      );

      await checkAndNotifyIfElevated(USER_ID, makeVitals(135));

      expect(mockShowLocalNotification).toHaveBeenCalledTimes(1);
    });
  });

  describe('ELEVATED_HR_NOTIFICATION_SCREEN', () => {
    it('is exported and equals "symptom-entry"', () => {
      expect(ELEVATED_HR_NOTIFICATION_SCREEN).toBe('symptom-entry');
    });
  });
});
