import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { logWellbeingRating } from '@/lib/symptomService';
import { ArrowLeft, Zap, Wind, PersonStanding } from 'lucide-react-native';

const ENERGY_LEVELS = [
  { value: 1, label: 'Very low', description: 'Barely able to get through the day' },
  { value: 2, label: 'Low', description: 'Tired, need more rest' },
  { value: 3, label: 'Moderate', description: 'Getting by, average energy' },
  { value: 4, label: 'Good', description: 'Feeling energized and alert' },
  { value: 5, label: 'Very high', description: 'Full of energy, ready for anything' },
];

const STRESS_LEVELS = [
  { value: 1, label: 'Very low', description: 'Completely relaxed and calm' },
  { value: 2, label: 'Low', description: 'Mostly at ease' },
  { value: 3, label: 'Moderate', description: 'Some tension, manageable' },
  { value: 4, label: 'High', description: 'Quite stressed, hard to unwind' },
  { value: 5, label: 'Very high', description: 'Overwhelmed, very tense' },
];

const MOOD_RATINGS = [
  { value: 1, label: 'Very poor', description: 'Down, struggling with low spirits' },
  { value: 2, label: 'Poor', description: 'Not great, feeling low' },
  { value: 3, label: 'Fair', description: 'Okay overall, neither up nor down' },
  { value: 4, label: 'Good', description: 'In a positive frame of mind' },
  { value: 5, label: 'Very good', description: 'In great spirits, feeling upbeat' },
];

export default function WellbeingRating() {
  const { user } = useAuth();
  const router = useRouter();
  const [energyLevel, setEnergyLevel] = useState(3);
  const [stressLevel, setStressLevel] = useState(3);
  const [moodRating, setMoodRating] = useState(3);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const uid = user?.uid;
    if (!uid) {
      Alert.alert('Error', 'You must be signed in to save a rating');
      return;
    }

    setLoading(true);

    try {
      const { error } = await logWellbeingRating({
        userId: uid,
        energyLevel,
        moodRating,
        notes,
        stressLevel,
        recordedAt: new Date(),
      });

      if (error) throw new Error(error);

      Alert.alert('Success', 'Well-being rating saved successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save rating');
    } finally {
      setLoading(false);
    }
  };

  const selectedEnergy = ENERGY_LEVELS.find((e) => e.value === energyLevel);
  const selectedStress = STRESS_LEVELS.find((s) => s.value === stressLevel);
  const selectedMood = MOOD_RATINGS.find((m) => m.value === moodRating);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#1a1a1a" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Well-being Rating</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Zap color="#0066cc" size={20} />
            <Text style={styles.label}>Energy level (1–5)</Text>
          </View>
          <Text style={styles.description}>{selectedEnergy?.description}</Text>
          <View style={styles.scaleRow}>
            {ENERGY_LEVELS.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.scaleButton,
                  energyLevel === item.value && styles.scaleButtonSelected,
                ]}
                onPress={() => setEnergyLevel(item.value)}
              >
                <Text
                  style={[
                    styles.scaleButtonText,
                    energyLevel === item.value && styles.scaleButtonTextSelected,
                  ]}
                >
                  {item.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.scaleLabel}>{selectedEnergy?.label}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Wind color="#0066cc" size={20} />
            <Text style={styles.label}>Stress level (1–5)</Text>
          </View>
          <Text style={styles.description}>{selectedStress?.description}</Text>
          <View style={styles.scaleRow}>
            {STRESS_LEVELS.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.scaleButton,
                  stressLevel === item.value && styles.scaleButtonSelected,
                ]}
                onPress={() => setStressLevel(item.value)}
              >
                <Text
                  style={[
                    styles.scaleButtonText,
                    stressLevel === item.value && styles.scaleButtonTextSelected,
                  ]}
                >
                  {item.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.scaleLabel}>{selectedStress?.label}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <PersonStanding color="#0066cc" size={20} />
            <Text style={styles.label}>Mood (1–5)</Text>
          </View>
          <Text style={styles.description}>{selectedMood?.description}</Text>
          <View style={styles.scaleRow}>
            {MOOD_RATINGS.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.scaleButton,
                  moodRating === item.value && styles.scaleButtonSelected,
                ]}
                onPress={() => setMoodRating(item.value)}
              >
                <Text
                  style={[
                    styles.scaleButtonText,
                    moodRating === item.value && styles.scaleButtonTextSelected,
                  ]}
                >
                  {item.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.scaleLabel}>{selectedMood?.label}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={styles.textArea}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes about how you're feeling..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Saving...' : 'Save Rating'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 28,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  scaleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  scaleButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  scaleButtonSelected: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  scaleButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  scaleButtonTextSelected: {
    color: '#fff',
  },
  scaleLabel: {
    fontSize: 13,
    color: '#0066cc',
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 120,
    marginTop: 4,
  },
  submitButton: {
    backgroundColor: '#0066cc',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 32,
  },
  submitButtonDisabled: {
    backgroundColor: '#99c2e6',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
