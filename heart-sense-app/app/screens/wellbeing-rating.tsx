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
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Smile, Frown, Meh } from 'lucide-react-native';

const RATINGS = [
  { value: 1, label: 'Very Poor', emoji: '😢' },
  { value: 2, label: 'Poor', emoji: '😟' },
  { value: 3, label: 'Fair', emoji: '😕' },
  { value: 4, label: 'Below Average', emoji: '🙁' },
  { value: 5, label: 'Average', emoji: '😐' },
  { value: 6, label: 'Above Average', emoji: '🙂' },
  { value: 7, label: 'Good', emoji: '😊' },
  { value: 8, label: 'Very Good', emoji: '😄' },
  { value: 9, label: 'Excellent', emoji: '😃' },
  { value: 10, label: 'Outstanding', emoji: '🤩' },
];

export default function WellbeingRating() {
  const { user } = useAuth();
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const today = new Date().toISOString().split('T')[0];

      const { error } = await supabase.from('well_being_ratings').upsert(
        {
          user_id: user?.id,
          rating,
          notes,
          rating_date: today,
        },
        { onConflict: 'user_id,rating_date' }
      );

      if (error) throw error;

      Alert.alert('Success', 'Well-being rating saved successfully');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save rating');
    } finally {
      setLoading(false);
    }
  };

  const selectedRating = RATINGS.find((r) => r.value === rating);

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
        <View style={styles.ratingDisplay}>
          <Text style={styles.emoji}>{selectedRating?.emoji}</Text>
          <Text style={styles.ratingValue}>{rating}/10</Text>
          <Text style={styles.ratingLabel}>{selectedRating?.label}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>How do you feel today?</Text>
          <View style={styles.ratingScale}>
            {RATINGS.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.ratingButton,
                  rating === item.value && styles.ratingButtonSelected,
                ]}
                onPress={() => setRating(item.value)}
              >
                <Text
                  style={[
                    styles.ratingButtonText,
                    rating === item.value && styles.ratingButtonTextSelected,
                  ]}
                >
                  {item.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Notes (Optional)</Text>
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
  ratingDisplay: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 16,
  },
  ratingValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#0066cc',
    marginBottom: 8,
  },
  ratingLabel: {
    fontSize: 20,
    color: '#666',
  },
  section: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  ratingScale: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  ratingButton: {
    width: 60,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ratingButtonSelected: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  ratingButtonText: {
    fontSize: 16,
    color: '#666',
  },
  ratingButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    minHeight: 120,
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
