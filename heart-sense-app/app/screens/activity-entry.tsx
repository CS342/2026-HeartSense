import { useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
  Keyboard,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { logActivity } from '@/lib/symptomService';
import { ArrowLeft, Calendar } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '@/theme/colors';

const ACTIVITY_TYPES = [
  'Exercise',
  'Walking',
  'Running',
  'Cycling',
  'Swimming',
  'Work',
  'Rest',
  'Sleep',
  'Social',
  'Other',
];

const INTENSITY_LEVELS = [
  { value: 'low', label: 'Low', color: '#16a34a' },
  { value: 'moderate', label: 'Moderate', color: '#ea580c' },
  { value: 'high', label: 'High', color: '#dc2626' },
];

export default function ActivityEntry() {
  const { user } = useAuth();
  const router = useRouter();
  const [selectedType, setSelectedType] = useState('');
  const [intensity, setIntensity] = useState<'low' | 'moderate' | 'high'>('moderate');
  const [duration, setDuration] = useState('');
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const textAreaSectionRef = useRef<View>(null);
  const durationSectionRef = useRef<View>(null);
  const textAreaFocusedRef = useRef(false);
  const durationFocusedRef = useRef(false);
  const scrollYRef = useRef(0);
  const HEADER_APPROX = 100;
  const PAD_ABOVE_KEYBOARD = 20;

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      const kbHeight = e.endCoordinates.height;
      setKeyboardHeight(kbHeight);
      if (!scrollRef.current) return;
      const sectionRef = textAreaFocusedRef.current ? textAreaSectionRef : durationFocusedRef.current ? durationSectionRef : null;
      if (!sectionRef?.current) return;
      const windowHeight = Dimensions.get('window').height;
      const maxVisibleY = windowHeight - kbHeight - HEADER_APPROX - PAD_ABOVE_KEYBOARD;
      timeoutId = setTimeout(() => {
        sectionRef.current?.measureInWindow((_x, y, _w, h) => {
          const sectionBottom = y + h;
          const scrollDelta = sectionBottom - maxVisibleY;
          if (scrollDelta > 0) {
            scrollRef.current?.scrollTo({
              y: scrollYRef.current + scrollDelta,
              animated: true,
            });
          }
        });
      }, Platform.OS === 'ios' ? 200 : 400);
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      clearTimeout(timeoutId);
      showSub.remove();
      hideSub.remove();
    };
  }, []);

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

  const handleSubmit = async () => {
    if (!selectedType) {
      Alert.alert('Error', 'Please select an activity type');
      return;
    }

    if (!duration) {
      Alert.alert('Error', 'Please enter duration');
      return;
    }

    if (!user) {
      Alert.alert('Error', 'You must be logged in');
      return;
    }

    setLoading(true);

    try {
      const { error } = await logActivity({
        userId: user.uid,
        activityType: selectedType,
        durationMinutes: parseInt(duration),
        intensity,
        description,
        occurredAt,
      });

      if (error) throw new Error(error);

      Alert.alert('Success', 'Activity logged successfully');
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to log activity');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color="#1a1a1a" size={24} />
          </TouchableOpacity>
          <Text style={styles.title}>Log Activity</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          ref={scrollRef}
          onScroll={(ev: { nativeEvent: { contentOffset: { y: number } } }) => { scrollYRef.current = ev.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          style={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 60 + keyboardHeight }]}
        >
          <View style={styles.section}>
            <Text style={styles.label}>Activity Type</Text>
            <View style={styles.typeGrid}>
              {ACTIVITY_TYPES.map((type) => (
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

          <View style={styles.section}>
            <Text style={styles.label}>Intensity</Text>
            <View style={styles.intensityContainer}>
              {INTENSITY_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.value}
                  style={[
                    styles.intensityButton,
                    intensity === level.value && {
                      backgroundColor: level.color,
                      borderColor: level.color,
                    },
                  ]}
                  onPress={() => setIntensity(level.value as any)}
                >
                  <Text
                    style={[
                      styles.intensityText,
                      intensity === level.value && styles.intensityTextSelected,
                    ]}
                  >
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>When did you perform this activity?</Text>
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
                  <Calendar color={theme.primary} size={20} />
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

          <View ref={durationSectionRef} style={styles.section} collapsable={false}>
            <Text style={styles.label}>Duration (minutes)</Text>
            <TextInput
              style={styles.input}
              value={duration}
              onChangeText={setDuration}
              placeholder="Enter duration in minutes"
              keyboardType="number-pad"
              onFocus={() => { durationFocusedRef.current = true; }}
              onBlur={() => { durationFocusedRef.current = false; }}
            />
          </View>

          <View ref={textAreaSectionRef} style={styles.section} collapsable={false}>
            <Text style={styles.label}>Additional Details</Text>
            <TextInput
              style={styles.textArea}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your activity in more detail..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              onFocus={() => { textAreaFocusedRef.current = true; }}
              onBlur={() => { textAreaFocusedRef.current = false; }}
            />
          </View>

          <TouchableOpacity
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Saving...' : 'Log Activity'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
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
  intensityContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  intensityButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#f9f9f9',
    alignItems: 'center',
  },
  intensityText: {
    fontSize: 14,
    color: '#666',
  },
  intensityTextSelected: {
    color: '#fff',
    fontWeight: '600',
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
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
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
});
