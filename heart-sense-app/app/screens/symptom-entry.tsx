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
import { theme } from '@/theme/colors';

const SYMPTOM_TYPES = [
  'Dizziness',
  'Fainting',
  'Chest Pain',
  'Racing Heart',
  'Shortness of Breath',
  'Palpitations',
  'Fatigue',
  'Sense of Doom',
  'Weakness',
  'Loss of Vision',
  'Other',
];

const SEVERITY_DESCRIPTIONS: Record<string, Record<number, string>> = {
  'Dizziness': {
    1: 'No dizziness',
    2: 'Mild lightheadedness, barely noticeable',
    3: 'Moderate dizziness, can still perform daily tasks',
    4: 'Severe dizziness, difficulty standing or walking',
    5: 'Cannot function, need to lie down',
  },
  'Fainting': {
    1: 'No fainting',
    2: 'Mild lightheadedness, barely noticeable',
    3: 'Moderate fainting, need to lie down',
    4: 'Severe fainting, cannot stand or walk',
    5: 'Cannot function, intense pain',
  },
  'Chest Pain': {
    1: 'No pain',
    2: 'Mild discomfort, barely noticeable',
    3: 'Moderate pain but tolerable',
    4: 'Severe pain, very distressing',
    5: 'Worst pain imaginable, cannot function',
  },
  'Racing Heart': {
    1: 'Normal heart rate',
    2: 'Mildly elevated, barely noticeable',
    3: 'Moderately fast, uncomfortable',
    4: 'Very rapid heartbeat, distressing',
    5: 'Heart racing uncontrollably, extremely distressing',
  },
  'Shortness of Breath': {
    1: 'Breathing normally',
    2: 'Mildly winded, minimal impact',
    3: 'Moderate breathlessness, limits some activities',
    4: 'Severe difficulty breathing, hard to talk',
    5: 'Cannot breathe adequately, gasping',
  },
  'Palpitations': {
    1: 'No palpitations',
    2: 'Mild flutter, barely noticeable',
    3: 'Moderate irregular heartbeat, uncomfortable',
    4: 'Severe palpitations, very distressing',
    5: 'Constant palpitations, cannot function',
  },
  'Fatigue': {
    1: 'No fatigue, full energy',
    2: 'Mildly tired but functional',
    3: 'Moderately tired, need extra rest',
    4: 'Severe exhaustion, can barely function',
    5: 'Complete exhaustion, cannot get out of bed',
  },
  'Sense of Doom': {
    1: 'No anxiety or dread',
    2: 'Mild unease, barely noticeable',
    3: 'Moderate anxiety or sense of dread',
    4: 'Severe panic, overwhelming fear',
    5: 'Extreme terror, complete sense of impending disaster',
  },
  'Weakness': {
    1: 'No weakness, normal strength',
    2: 'Mildly weak but functional',
    3: 'Moderate weakness, some difficulty with activities',
    4: 'Severe weakness, can barely move',
    5: 'Complete weakness, cannot move',
  },
  'Loss of Vision': {
    1: 'No vision problems',
    2: 'Mild blurriness or spots',
    3: 'Moderate vision changes or impairment',
    4: 'Severe vision loss, nearly blind',
    5: 'Complete loss of vision',
  },
  'Other': {
    1: 'No symptoms',
    2: 'Mild symptoms, barely noticeable',
    3: 'Moderate symptoms, manageable',
    4: 'Severe symptoms, very distressing',
    5: 'Worst symptoms imaginable, cannot function',
  },
};

interface PreviousSymptom {
  severity: number;
  occurredAt: string;
}

export default function SymptomEntry() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedType, setSelectedType] = useState('');
  const [severity, setSeverity] = useState(3);
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

  const toLocalISOString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

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

  const getSeverityDescription = () => {
    if (!selectedType) return '';
    return SEVERITY_DESCRIPTIONS[selectedType]?.[severity] || '';
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
              <TrendingUp color={theme.primary} size={18} />
              <Text style={styles.previousSymptomTitle}>Previous Entry</Text>
            </View>
            <View style={styles.previousSymptomContent}>
              <View style={styles.previousSymptomItem}>
                <Text style={styles.previousSymptomLabel}>Last severity:</Text>
                <Text style={styles.previousSymptomValue}>{previousSymptom.severity}/5</Text>
              </View>
              <View style={styles.previousSymptomItem}>
                <Calendar color="#666" size={16} />
                <Text style={styles.previousSymptomDate}>
                  {formatDate(previousSymptom.occurredAt)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.label}>When did this symptom occur?</Text>
          {Platform.OS === 'web' ? (
            <input
              type="datetime-local"
              value={toLocalISOString(occurredAt)}
              onChange={(e) => setOccurredAt(new Date(e.target.value))}
              style={{
                width: '100%',
                padding: 14,
                fontSize: 16,
                borderRadius: 8,
                border: '1px solid #ddd',
                backgroundColor: '#f9f9f9',
                fontFamily: 'system-ui',
              }}
            />
          ) : (
            <>
              <TouchableOpacity
                style={styles.dateTimeButton}
                onPress={() => setShowPicker(true)}
                activeOpacity={0.7}
              >
                <Clock color={theme.primary} size={20} />
                <Text style={styles.dateTimeText}>{formatDateTime(occurredAt)}</Text>
              </TouchableOpacity>
              {showPicker && (
                <DateTimePicker
                  value={occurredAt}
                  mode="datetime"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onPickerChange}
                  maximumDate={new Date()}
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
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Severity (1-5)</Text>
          <View style={styles.severityContainer}>
            {[1, 2, 3, 4, 5].map((num) => (
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
          {selectedType && (
            <View style={styles.severityDescriptionBox}>
              <Text style={styles.severityDescriptionText}>
                {getSeverityDescription()}
              </Text>
            </View>
          )}
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
    backgroundColor: theme.primary,
    borderColor: theme.primary,
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
    justifyContent: 'space-around',
    gap: 8,
  },
  severityButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  severityButtonSelected: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  severityText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
  },
  severityTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  severityDescriptionBox: {
    marginTop: 16,
    padding: 14,
    backgroundColor: theme.primaryLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.primary,
  },
  severityDescriptionText: {
    fontSize: 15,
    color: theme.primary,
    lineHeight: 22,
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
  },
  submitButton: {
    backgroundColor: theme.primary,
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
    backgroundColor: theme.primaryLight,
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
    color: theme.primary,
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
    color: theme.primary,
    fontWeight: '600',
  },
});
