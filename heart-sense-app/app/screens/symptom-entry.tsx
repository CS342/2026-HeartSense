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
  Animated,
} from 'react-native';

function BouncingText({ text, onDone }: { text: string; onDone: () => void }) {
  const letters = text.split('');
  const anims = useRef(letters.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    const bounces = letters.map((_, i) =>
      Animated.sequence([
        Animated.spring(anims[i], { toValue: -10, useNativeDriver: true, speed: 40, bounciness: 10 }),
        Animated.spring(anims[i], { toValue: 0, useNativeDriver: true, speed: 40, bounciness: 6 }),
      ])
    );
    Animated.stagger(25, bounces).start(() => {
      setTimeout(onDone, 100);
    });
  }, []);

  return (
    <View style={bounceStyles.row}>
      {letters.map((char, i) => (
        <Animated.Text
          key={i}
          style={[bounceStyles.letter, { transform: [{ translateY: anims[i] }] }]}
        >
          {char === ' ' ? '\u00A0' : char}
        </Animated.Text>
      ))}
    </View>
  );
}

const bounceStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  letter: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
});
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { logSymptom, getPreviousSymptom } from '@/lib/symptomService';
import { fetchVitalsAroundSymptom } from '@/services/healthkit/healthSyncService';
import { ArrowLeft, TrendingUp, Calendar, Clock } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '@/theme/colors';

const SEVERITY_COLORS: Record<number, string> = {
  1: '#22c55e',
  2: '#84cc16',
  3: '#eab308',
  4: '#f97316',
  5: '#ef4444',
};

const SYMPTOM_TYPES = [
  'Dizziness',
  'Fainting',
  'Chest Pain',
  'Racing Heart',
  'Shortness of Breath',
  'Palpitations',
  'Fatigue',
  'Swelling',
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
  'Swelling': {
    1: 'No swelling',
    2: 'Mild puffiness in ankles or feet, barely noticeable',
    3: 'Moderate swelling in legs or ankles, shoes feel tight',
    4: 'Severe swelling in legs, feet, or abdomen, limits movement',
    5: 'Extreme swelling, skin feels stretched and painful',
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
  const { isDark, colors, fs } = useTheme();
  const [selectedType, setSelectedType] = useState('');
  const [severity, setSeverity] = useState(3);
  const [description, setDescription] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [previousSymptom, setPreviousSymptom] = useState<PreviousSymptom | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const textAreaSectionRef = useRef<View>(null);
  const textAreaFocusedRef = useRef(false);
  const scrollYRef = useRef(0);
  const HEADER_APPROX = 100;
  const PAD_ABOVE_KEYBOARD = 20;

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      const kbHeight = e.endCoordinates.height;
      setKeyboardHeight(kbHeight);
      if (!textAreaFocusedRef.current || !textAreaSectionRef.current || !scrollRef.current) return;
      const windowHeight = Dimensions.get('window').height;
      const maxVisibleY = windowHeight - kbHeight - HEADER_APPROX - PAD_ABOVE_KEYBOARD;
      timeoutId = setTimeout(() => {
        textAreaSectionRef.current?.measureInWindow((_x, y, _w, h) => {
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
      // Fetch vitals around symptom time (best-effort, non-fatal)
      let vitalsContext;
      if (Platform.OS === 'ios') {
        try {
          vitalsContext = await fetchVitalsAroundSymptom(occurredAt);
        } catch {
          // HealthKit unavailable or failed — log symptom without vitals
        }
      }

      const { error } = await logSymptom({
        userId: user.uid,
        symptomType: selectedType,
        severity,
        description,
        occurredAt,
        vitalsContext,
      });

      if (error) throw new Error(error);

      setSubmitted(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to log symptom');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Log Symptom</Text>
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
            <Text style={[styles.label, { color: colors.text }]}>Symptom Type</Text>
            <View style={styles.typeGrid}>
              {SYMPTOM_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.typeButton,
                    { backgroundColor: colors.inputBg, borderColor: colors.border },
                    selectedType === type && styles.typeButtonSelected,
                  ]}
                  onPress={() => setSelectedType(type)}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      { color: colors.textSecondary },
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
            <View style={[styles.previousSymptomBox, { backgroundColor: isDark ? colors.surface : theme.primaryLight, borderColor: isDark ? colors.border : '#bfdbfe' }]}>
              <View style={styles.previousSymptomHeader}>
                <TrendingUp color={theme.primary} size={18} />
                <Text style={styles.previousSymptomTitle}>Previous Entry</Text>
              </View>
              <View style={styles.previousSymptomContent}>
                <View style={styles.previousSymptomItem}>
                  <Text style={[styles.previousSymptomLabel, isDark && { color: colors.textSecondary }]}>Last severity:</Text>
                  <Text style={[styles.previousSymptomValue, isDark && { color: colors.text }]}>{previousSymptom.severity}/5</Text>
                </View>
                <View style={styles.previousSymptomItem}>
                  <Calendar color={colors.textSecondary} size={16} />
                  <Text style={[styles.previousSymptomDate, isDark && { color: colors.textSecondary }]}>
                    {formatDate(previousSymptom.occurredAt)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>When did this symptom occur?</Text>
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
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.inputBg,
                  color: colors.text,
                  fontFamily: 'system-ui',
                }}
              />
            ) : (
              <View style={styles.dateTimeContainer}>
                <TouchableOpacity
                  style={[styles.dateTimeButton, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
                  onPress={() => setShowPicker(true)}
                  activeOpacity={0.7}
                >
                  <Clock color={theme.primary} size={20} />
                  <Text style={[styles.dateTimeText, { color: colors.text }]}>{formatDateTime(occurredAt)}</Text>
                </TouchableOpacity>

                {showPicker && (
                  <View style={styles.dateTimePickerWrapper}>
                    <DateTimePicker
                      value={occurredAt}
                      mode="datetime"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onPickerChange}
                      maximumDate={new Date()}
                      textColor={colors.text}
                      accentColor={colors.text}
                      style={styles.dateTimePicker}
                    />
                  </View>
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
            )}
          </View>

          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.text }]}>Severity (1-5)</Text>
            {Platform.OS === 'web' ? (
              <View>
                <input
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  value={severity}
                  onChange={(e: any) => setSeverity(Number(e.target.value))}
                  style={{ width: '100%', accentColor: SEVERITY_COLORS[severity], height: 6, cursor: 'pointer' }}
                />
                <View style={styles.severityLabels}>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <Text key={num} style={[styles.severityLabel, { color: severity === num ? SEVERITY_COLORS[num] : colors.textTertiary, fontWeight: severity === num ? '700' : '400' }]}>
                      {num}
                    </Text>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.severityContainer}>
                {[1, 2, 3, 4, 5].map((num) => (
                  <TouchableOpacity
                    key={num}
                    style={[
                      styles.severityButton,
                      { borderColor: SEVERITY_COLORS[num], backgroundColor: colors.inputBg },
                      severity === num && { backgroundColor: SEVERITY_COLORS[num], borderColor: SEVERITY_COLORS[num] },
                    ]}
                    onPress={() => setSeverity(num)}
                  >
                    <Text style={[styles.severityText, { color: severity === num ? '#fff' : SEVERITY_COLORS[num] }]}>
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            <View style={[styles.severityDescriptionBox, { borderColor: SEVERITY_COLORS[severity], backgroundColor: SEVERITY_COLORS[severity] + '18' }]}>
              <Text style={[styles.severityDescriptionText, { color: SEVERITY_COLORS[severity] }]}>
                {selectedType ? getSeverityDescription() : 'Select a symptom type to see description'}
              </Text>
            </View>
          </View>

          <View ref={textAreaSectionRef} style={styles.section} collapsable={false}>
            <Text style={[styles.label, { color: colors.text }]}>Additional Details</Text>
            <TextInput
              style={[styles.textArea, { color: colors.text, backgroundColor: colors.inputBg, borderColor: colors.border }]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your symptom in more detail..."
              placeholderTextColor={colors.textTertiary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              onFocus={() => { textAreaFocusedRef.current = true; }}
              onBlur={() => { textAreaFocusedRef.current = false; }}
            />
          </View>

          {submitted && (
            <View style={styles.successBanner}>
              <BouncingText
                text="Symptom Logged!"
                onDone={() => {
                  if (router.canGoBack()) router.back();
                  else router.replace('/');
                }}
              />
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitButton, (loading || submitted) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={loading || submitted}
          >
            <Text style={styles.submitButtonText}>
              {loading ? 'Saving...' : 'Log Symptom'}
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
  severityLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 2,
  },
  severityLabel: {
    fontSize: 14,
    textAlign: 'center',
  },
  severityDescriptionBox: {
    marginTop: 16,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  severityDescriptionText: {
    fontSize: 15,
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
  dateTimeContainer: {
    width: '100%',
  },
  dateTimePickerWrapper: {
    height: 216,
    width: '100%',
    marginVertical: 8,
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
    position: 'relative',
  },
  dateTimeText: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  dateTimePicker: {
    height: 216,
    width: '100%',
  },
  successBanner: {
    backgroundColor: theme.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
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
