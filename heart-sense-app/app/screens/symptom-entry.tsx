import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { logSymptom, getPreviousSymptom } from '@/lib/symptomService';
import { ArrowLeft, TrendingUp, Calendar, Clock } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

const SYMPTOM_TYPES = [
  'Chest Pain',
  'Shortness of Breath',
  'Palpitations',
  'Dizziness',
  'Fatigue',
  'Headache',
  'Nausea',
  'Other',
];

interface PreviousSymptom {
  severity: number;
  occurred_at: string;
}

export default function SymptomEntry() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedType, setSelectedType] = useState('');
  const [severity, setSeverity] = useState(5);
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previousSymptom, setPreviousSymptom] = useState<PreviousSymptom | null>(null);

  const formatDateTime = (date: Date) =>
    date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const onPickerChange = (event: { type: string }, date?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (event.type !== 'dismissed' && date) setOccurredAt(date);
  };

  useEffect(() => {
    if (selectedType && user) {
      loadPreviousSymptom();
    } else {
      setPreviousSymptom(null);
    }
  }, [selectedType]);

  const loadPreviousSymptom = async () => {
    if (!user || !selectedType) return;

    try {
      const { data, error } = await getPreviousSymptom(user.uid, selectedType);

      if (error) throw new Error(error);

      setPreviousSymptom(data);
    } catch (error) {
      console.error('Error loading previous symptom:', error);
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'earlier today';
    } else if (diffDays === 1) {
      return 'yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Error', 'Please select a symptom type');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setLoading(true);

    try {
      const { error } = await logSymptom({
        userId: user.uid,
        symptomType: selectedType,
        severity,
        description,
        occurredAt,
      });

      if (error) throw new Error(error);

      Alert.alert('Success', 'Symptom logged successfully');
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to log symptom');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color="#1a1a1a" size={24} />
        </TouchableOpacity>
        <Text style={styles.title}>Log Symptom</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.label}>Symptom Type</Text>
          <View style={styles.typeGrid}>
            {SYMPTOM_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.typeButton,
                  selectedType === type && styles.typeButtonSelected,
                ]}
                onPress={() => setSelectedType(type)}
              >
                <Text
                  style={[
                    styles.typeButtonText,
                    selectedType === type && styles.typeButtonTextSelected,
                  ]}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {previousSymptom && (
          <View style={styles.previousSymptomBox}>
            <View style={styles.previousSymptomHeader}>
              <TrendingUp color="#0066cc" size={18} />
              <Text style={styles.previousSymptomTitle}>Previous Entry</Text>
            </View>
            <View style={styles.previousSymptomContent}>
              <View style={styles.previousSymptomItem}>
                <Text style={styles.previousSymptomLabel}>Last severity:</Text>
                <Text style={styles.previousSymptomValue}>{previousSymptom.severity}/10</Text>
              </View>
              <View style={styles.previousSymptomItem}>
                <Calendar color="#666" size={16} />
                <Text style={styles.previousSymptomDate}>
                  {formatDate(previousSymptom.occurred_at)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>When did this symptom occur?</Text>
          <TouchableOpacity
            style={styles.dateTimeButton}
            onPress={() => setShowPicker(true)}
            activeOpacity={0.7}
          >
            <Clock color="#0066cc" size={20} />
            <Text style={styles.dateTimeText}>{formatDateTime(occurredAt)}</Text>
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              value={occurredAt}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onPickerChange}
              textColor='black'
              accentColor='black'
            />
          )}
          {Platform.OS === 'ios' && showPicker && (
            <TouchableOpacity
              style={styles.donePickerButton}
              onPress={() => setShowPicker(false)}
            >
              <Text style={styles.donePickerText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Severity (1-10)</Text>
          <View style={styles.severityContainer}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.severityButton,
                  severity === num && styles.severityButtonSelected,
                ]}
                onPress={() => setSeverity(num)}
              >
                <Text
                  style={[
                    styles.severityText,
                    severity === num && styles.severityTextSelected,
                  ]}
                >
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Additional Details</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your symptom in more detail..."
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
            {loading ? 'Saving...' : 'Log Symptom'}
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
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  typeButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
  },
  typeButtonSelected: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  typeButtonText: {
    fontSize: 14,
    color: '#666',
  },
  typeButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  severityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  severityButtonSelected: {
    backgroundColor: '#0066cc',
    borderColor: '#0066cc',
  },
  severityText: {
    fontSize: 14,
    color: '#666',
  },
  severityTextSelected: {
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
  previousSymptomBox: {
    backgroundColor: '#eff6ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  previousSymptomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  previousSymptomTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066cc',
  },
  previousSymptomContent: {
    gap: 8,
  },
  previousSymptomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previousSymptomLabel: {
    fontSize: 14,
    color: '#1e40af',
  },
  previousSymptomValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e40af',
  },
  previousSymptomDate: {
    fontSize: 13,
    color: '#1e40af',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  donePickerButton: {
    alignItems: 'center',
  },
  donePickerText: {
    fontSize: 16,
    color: '#0066cc',
    fontWeight: '600',
  },
});
