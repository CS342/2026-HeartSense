import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Platform,
  SafeAreaView,
  TextInput,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Heart, ClipboardList, Watch, Calendar, User } from 'lucide-react-native';
import { theme } from '@/theme/colors';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const GENDER_OPTIONS = ['Male', 'Female', 'Other', 'Prefer not to say'] as const;

function parseLocalDate(isoDateStr: string): Date | null {
  if (!isoDateStr) return null;
  const parts = isoDateStr.split('-').map(Number);
  const [y, m, d] = parts;
  if (y == null || m == null || d == null || parts.some(isNaN)) return null;
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

export default function OnboardingScreen() {
  const { user } = useAuth();
  const { refetch } = useOnboarding();
  const router = useRouter();
  const [appleWatchConsent, setAppleWatchConsent] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [gender, setGender] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const defaultDobDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 25);
    return d;
  })();
  const dobDate = dateOfBirth ? parseLocalDate(dateOfBirth) ?? defaultDobDate : defaultDobDate;

  const onDobPickerChange = (event: { type: string }, date?: Date) => {
    if (Platform.OS === 'android') setShowDobPicker(false);
    if (event.type !== 'dismissed' && date) {
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(date.getUTCDate()).padStart(2, '0');
      setDateOfBirth(`${yyyy}-${mm}-${dd}`);
    }
  };

  const handleComplete = async () => {
    if (!dateOfBirth) {
      setError('Please provide your date of birth to continue.');
      return;
    }

    if (!appleWatchConsent) {
      setError('Please consent to sharing Apple Watch data (heart rate, accelerometer, step count) to participate in the study.');
      return;
    }

    if (!gender) {
      setError('Please select your gender.');
      return;
    }

    const heightNum = parseFloat(heightCm);
    const weightNum = parseFloat(weightKg);
    if (isNaN(heightNum) || heightNum <= 0 || heightNum > 300) {
      setError('Please enter a valid height in cm (1–300).');
      return;
    }
    if (isNaN(weightNum) || weightNum <= 0 || weightNum > 500) {
      setError('Please enter a valid weight in kg (1–500).');
      return;
    }

    if (!user) return;

    setLoading(true);
    setError('');

    try {
      await updateDoc(doc(db, 'profiles', user.uid), {
        date_of_birth: dateOfBirth,
        gender,
        height_cm: heightNum,
        weight_kg: weightNum,
        apple_watch_consent: true,
        apple_watch_consent_at: serverTimestamp(),
        onboarding_completed: true,
        onboarding_completed_at: serverTimestamp(),
        updated_at: serverTimestamp(),
      });

      await refetch();
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err?.message || 'Failed to save. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Heart color={theme.primary} size={48} strokeWidth={2} />
          </View>
          <Text style={styles.title}>Welcome to Heart Sense</Text>
          <Text style={styles.subtitle}>Clinical Study Setup</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ClipboardList color={theme.primary} size={24} />
            <Text style={styles.sectionTitle}>About This Study</Text>
          </View>
          <Text style={styles.bodyText}>
            Thank you for participating in the Heart Sense clinical study. You have already
            consented to the study and have been in contact with the research team.
          </Text>
          <Text style={[styles.bodyText, styles.bodyTextSpaced]}>
            <Text style={styles.bold}>Your daily logs are essential.</Text> Please log your
            wellbeing every day—this data directly helps our research understand patterns and
            outcomes.
          </Text>
          <Text style={[styles.bodyText, styles.bodyTextSpaced]}>
            All data you share and log (symptoms, activities, wellbeing ratings, and health
            metrics) will be accessible to the research team as part of the study.
          </Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Watch color={theme.primary} size={24} />
            <Text style={styles.sectionTitle}>Apple Watch Data</Text>
          </View>
          <Text style={styles.bodyText}>
            We will collect the following data from your Apple Watch:
          </Text>
          <View style={styles.bulletList}>
            <Text style={styles.bulletItem}>• Heart rate</Text>
            <Text style={styles.bulletItem}>• Accelerometer data</Text>
            <Text style={styles.bulletItem}>• Step count</Text>
          </View>
          <View style={styles.consentRow}>
            <Text style={styles.consentLabel}>
              I consent to sharing my Apple Watch data with the research team
            </Text>
            <Switch
              value={appleWatchConsent}
              onValueChange={setAppleWatchConsent}
              trackColor={{ false: '#9ca3af', true: theme.primaryLight }}
              thumbColor={appleWatchConsent ? theme.primary : '#f4f3f4'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Calendar color={theme.primary} size={24} />
            <Text style={styles.sectionTitle}>Date of Birth</Text>
          </View>
          <Text style={styles.bodyText}>
            Please provide your date of birth. This is required for the study.
          </Text>
          <TouchableOpacity
            style={styles.dobButton}
            onPress={() => setShowDobPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={dateOfBirth ? styles.dobButtonText : styles.dobButtonPlaceholder}>
              {dateOfBirth
                ? (parseLocalDate(dateOfBirth) ?? new Date()).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'Tap to select date of birth'}
            </Text>
          </TouchableOpacity>
          {showDobPicker && (
            <>
              <DateTimePicker
                value={dobDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDobPickerChange}
                maximumDate={new Date()}
                minimumDate={
                  new Date(new Date().setFullYear(new Date().getFullYear() - 120))
                }
                textColor="black"
                accentColor="black"
              />
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.donePickerButton}
                  onPress={() => setShowDobPicker(false)}
                >
                  <Text style={styles.donePickerText}>Done</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User color={theme.primary} size={24} />
            <Text style={styles.sectionTitle}>Additional Information</Text>
          </View>
          <Text style={styles.bodyText}>
            Please provide the following for the study.
          </Text>

          <Text style={styles.fieldLabel}>Gender</Text>
          <View style={styles.genderRow}>
            {GENDER_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.genderOption,
                  gender === opt && styles.genderOptionSelected,
                ]}
                onPress={() => setGender(opt)}
              >
                <Text
                  style={[
                    styles.genderOptionText,
                    gender === opt && styles.genderOptionTextSelected,
                  ]}
                >
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Height (cm)</Text>
          <TextInput
            style={styles.input}
            value={heightCm}
            onChangeText={setHeightCm}
            placeholder="e.g. 170"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />

          <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Weight (kg)</Text>
          <TextInput
            style={styles.input}
            value={weightKg}
            onChangeText={setWeightKg}
            placeholder="e.g. 70"
            keyboardType="numeric"
            placeholderTextColor="#999"
          />
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TouchableOpacity
          style={[styles.continueButton, loading && styles.buttonDisabled]}
          onPress={handleComplete}
          disabled={loading}
        >
          <Text style={styles.continueButtonText}>
            {loading ? 'Saving...' : 'Continue to App'}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 48,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  section: {
    marginBottom: 28,
    padding: 20,
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  bodyText: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
  },
  bodyTextSpaced: {
    marginTop: 12,
  },
  bold: {
    fontWeight: '600',
    color: '#1a1a1a',
  },
  bulletList: {
    marginTop: 12,
    marginLeft: 4,
  },
  bulletItem: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 24,
  },
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
  consentLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#1a1a1a',
    marginRight: 16,
  },
  dobButton: {
    marginTop: 12,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  dobButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  dobButtonPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  donePickerButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  donePickerText: {
    fontSize: 16,
    color: theme.primary,
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    padding: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    color: '#1a1a1a',
  },
  genderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  genderOptionSelected: {
    backgroundColor: theme.primaryLight,
    borderColor: theme.primary,
  },
  genderOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  genderOptionTextSelected: {
    color: theme.primary,
    fontWeight: '600',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#fee',
    borderRadius: 8,
  },
  continueButton: {
    height: 52,
    backgroundColor: theme.primary,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#99c2e6',
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
