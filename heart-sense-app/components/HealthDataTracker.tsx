import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

interface HealthDataTrackerProps {
  onDataCollected?: (data: any) => void;
}

export function HealthDataTracker({ onDataCollected }: HealthDataTrackerProps) {
  const { user } = useAuth();
  const [isTracking, setIsTracking] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    startTracking();

    return () => {
      stopTracking();
    };
  }, []);

  const startTracking = async () => {
    setIsTracking(true);
  };

  const stopTracking = () => {
    setIsTracking(false);
  };

  const saveHealthData = async (dataType: string, value: number, unit: string) => {
    if (!user) return;

    try {
      await addDoc(collection(db, 'health_data'), {
        user_id: user.uid,
        data_type: dataType,
        value,
        unit,
        recorded_at: new Date().toISOString(),
      });

      onDataCollected?.({ dataType, value, unit });
    } catch (error) {
      console.error('Error saving health data:', error);
    }
  };

  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <Text style={styles.infoText}>
          Health data tracking is available on mobile devices
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.statusText}>
        Health tracking: {isTracking ? 'Active' : 'Inactive'}
      </Text>
      <Text style={styles.infoText}>
        This app can collect step count, heart rate, and accelerometer data from your device.
        Enable permissions in your device settings to start tracking.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#86efac',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#15803d',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 18,
  },
});
