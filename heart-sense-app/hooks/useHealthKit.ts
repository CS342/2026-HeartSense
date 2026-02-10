/**
 * React hooks for HealthKit integration.
 *
 * useHealthKit() — one-stop hook for components that need:
 *   • availability check
 *   • permission request
 *   • latest vitals (auto-refreshed)
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform, AppState } from 'react-native';
import {
  checkAvailability,
  requestHealthPermissions,
  getLatestVitals,
  getRecentWorkouts,
  type LatestVitals,
  type WorkoutRecord,
} from '@/services/healthkit';

const REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface UseHealthKitResult {
  /** true on iOS with HealthKit support */
  isAvailable: boolean;
  /** true once the user has been prompted for permissions */
  isAuthorized: boolean;
  /** Latest snapshot of all vitals (null until first fetch) */
  vitals: LatestVitals | null;
  /** Recent workouts from HealthKit (most-recent first) */
  workouts: WorkoutRecord[];
  /** true while initial data is loading */
  isLoading: boolean;
  /** Call to (re-)request permissions and fetch data */
  initialize: () => Promise<void>;
  /** Force an immediate data refresh */
  refresh: () => Promise<void>;
}

export function useHealthKit(): UseHealthKitResult {
  const [isAvailable] = useState(() => checkAvailability());
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [vitals, setVitals] = useState<LatestVitals | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    if (!isAvailable) return;
    try {
      const [vitalsData, workoutsData] = await Promise.all([
        getLatestVitals(),
        getRecentWorkouts(20),
      ]);
      setVitals(vitalsData);
      setWorkouts(workoutsData);
    } catch {
      // silently ignore — will retry
    }
  }, [isAvailable]);

  const initialize = useCallback(async () => {
    if (Platform.OS !== 'ios' || !isAvailable) {
      setIsLoading(false);
      return;
    }

    const granted = await requestHealthPermissions();
    setIsAuthorized(granted);

    if (granted) {
      await fetchData();
    }
    setIsLoading(false);
  }, [isAvailable, fetchData]);

  // Auto-initialize on mount (iOS only)
  useEffect(() => {
    if (Platform.OS !== 'ios') {
      setIsLoading(false);
      return;
    }
    initialize();
  }, [initialize]);

  // Periodic refresh while app is in foreground
  useEffect(() => {
    if (!isAuthorized || !isAvailable) return;

    intervalRef.current = setInterval(fetchData, REFRESH_INTERVAL_MS);

    // Also refresh when app returns from background
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetchData();
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, [isAuthorized, isAvailable, fetchData]);

  return {
    isAvailable,
    isAuthorized,
    vitals,
    workouts,
    isLoading,
    initialize,
    refresh: fetchData,
  };
}
