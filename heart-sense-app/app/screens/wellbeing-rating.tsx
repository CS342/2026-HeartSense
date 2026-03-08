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

function QuickBounce({ text, color, onDone }: { text: string; color: string; onDone: () => void }) {
  const letters = text.split('');
  const anims = useRef(letters.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    Animated.stagger(25, letters.map((_, i) =>
      Animated.sequence([
        Animated.spring(anims[i], { toValue: -10, useNativeDriver: true, speed: 50, bounciness: 8 }),
        Animated.spring(anims[i], { toValue: 0, useNativeDriver: true, speed: 50, bounciness: 4 }),
      ])
    )).start(() => setTimeout(onDone, 100));
  }, []);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
      {letters.map((char, i) => (
        <Animated.Text key={i} style={{ fontSize: 18, fontWeight: '700', color, transform: [{ translateY: anims[i] }] }}>
          {char === ' ' ? '\u00A0' : char}
        </Animated.Text>
      ))}
    </View>
  );
}
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { logWellbeingRating, getPreviousWellbeing } from '@/lib/symptomService';
import { ArrowLeft, Zap, Wind, PersonStanding, TrendingUp, Calendar, Heart } from 'lucide-react-native';
import { theme } from '@/theme/colors';

const MOOD_EMOJIS: Record<number, string> = {
  1: '😣', 2: '😔', 3: '😐', 4: '🙂', 5: '😄',
};

// Shared color scale: 1 = green → 5 = red
const RATING_COLORS: Record<number, string> = {
  1: '#dc2626',
  2: '#ea580c',
  3: '#eab308',
  4: '#65a30d',
  5: '#16a34a',
};

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
  const { isDark, colors } = useTheme();
  const [energyLevel, setEnergyLevel] = useState(3);
  const [stressLevel, setStressLevel] = useState(3);
  const [moodRating, setMoodRating] = useState(3);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [previousRating, setPreviousRating] = useState<{
    energyLevel: number;
    moodRating: number;
    stressLevel: number;
    recordedAt: string | null;
  } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const notesSectionRef = useRef<View>(null);
  const notesFocusedRef = useRef(false);
  const scrollYRef = useRef(0);
  const moodEmojiAnim = useRef(new Animated.Value(1)).current;
  const prevMoodRef = useRef(moodRating);
  const heartSubmitAnim = useRef(new Animated.Value(0)).current;
  const HEADER_APPROX = 100;
  const PAD_ABOVE_KEYBOARD = 20;

  useEffect(() => {
    if (prevMoodRef.current !== moodRating) {
      prevMoodRef.current = moodRating;
      Animated.sequence([
        Animated.spring(moodEmojiAnim, { toValue: 1.4, useNativeDriver: true, speed: 50, bounciness: 14 }),
        Animated.spring(moodEmojiAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }),
      ]).start();
    }
  }, [moodRating]);

  useEffect(() => {
    if (submitted) {
      Animated.sequence([
        Animated.spring(heartSubmitAnim, { toValue: 1.4, useNativeDriver: true, speed: 15, bounciness: 18 }),
        Animated.spring(heartSubmitAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 8 }),
      ]).start();
    }
  }, [submitted]);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => {
      const kbHeight = e.endCoordinates.height;
      setKeyboardHeight(kbHeight);
      if (!notesFocusedRef.current || !notesSectionRef.current || !scrollRef.current) return;
      const windowHeight = Dimensions.get('window').height;
      const maxVisibleY = windowHeight - kbHeight - HEADER_APPROX - PAD_ABOVE_KEYBOARD;
      timeoutId = setTimeout(() => {
        notesSectionRef.current?.measureInWindow((_x, y, _w, h) => {
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

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await getPreviousWellbeing(user.uid);
      setPreviousRating(data);
    })();
  }, [user]);

  const formatPreviousDate = (timestamp: string | null) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'earlier today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    const weeks = Math.floor(diffDays / 7);
    if (diffDays < 30) return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

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

      setSubmitted(true);
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: colors.background }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft color={colors.text} size={24} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>Well-being Rating</Text>
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
        {previousRating && (
          <View style={[styles.previousBox, { backgroundColor: isDark ? '#1e2a3a' : theme.primaryLight, borderColor: isDark ? '#2a4a6a' : '#bfdbfe' }]}>
            <View style={styles.previousHeader}>
              <TrendingUp color={theme.primary} size={18} />
              <Text style={styles.previousTitle}>Previous Rating</Text>
            </View>
            <View style={styles.previousContent}>
              <View style={styles.previousRow}>
                <Text style={[styles.previousLabel, { color: isDark ? '#60a5fa' : '#1e40af' }]}>Energy: {previousRating.energyLevel}/5</Text>
                <Text style={[styles.previousLabel, { color: isDark ? '#60a5fa' : '#1e40af' }]}>Mood: {previousRating.moodRating}/5</Text>
                <Text style={[styles.previousLabel, { color: isDark ? '#60a5fa' : '#1e40af' }]}>Stress: {previousRating.stressLevel}/5</Text>
              </View>
              <View style={styles.previousDateRow}>
                <Calendar color={colors.textSecondary} size={14} />
                <Text style={[styles.previousDate, { color: isDark ? '#60a5fa' : '#1e40af' }]}>{formatPreviousDate(previousRating.recordedAt)}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Zap color={theme.primary} size={20} />
            <Text style={[styles.label, { color: colors.text }]}>Energy level (1–5)</Text>
          </View>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{selectedEnergy?.description}</Text>
          <View style={styles.scaleRow}>
            {ENERGY_LEVELS.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.scaleButton,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                  energyLevel === item.value && {
                    backgroundColor: RATING_COLORS[item.value],
                    borderColor: RATING_COLORS[item.value],
                  },
                ]}
                onPress={() => setEnergyLevel(item.value)}
              >
                <Text
                  style={[
                    styles.scaleButtonText,
                    { color: colors.textSecondary },
                    energyLevel === item.value && styles.scaleButtonTextSelected,
                  ]}
                >
                  {item.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.scaleLabel, { color: RATING_COLORS[energyLevel] }]}>{selectedEnergy?.label}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Wind color={theme.primary} size={20} />
            <Text style={[styles.label, { color: colors.text }]}>Stress level (1–5)</Text>
          </View>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{selectedStress?.description}</Text>
          <View style={styles.scaleRow}>
            {STRESS_LEVELS.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.scaleButton,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                  stressLevel === item.value && {
                    backgroundColor: RATING_COLORS[item.value],
                    borderColor: RATING_COLORS[item.value],
                  },
                ]}
                onPress={() => setStressLevel(item.value)}
              >
                <Text
                  style={[
                    styles.scaleButtonText,
                    { color: colors.textSecondary },
                    stressLevel === item.value && styles.scaleButtonTextSelected,
                  ]}
                >
                  {item.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.scaleLabel, { color: RATING_COLORS[stressLevel] }]}>{selectedStress?.label}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <PersonStanding color={theme.primary} size={20} />
            <Text style={[styles.label, { color: colors.text }]}>Mood (1–5)</Text>
          </View>
          <Text style={[styles.description, { color: colors.textSecondary }]}>{selectedMood?.description}</Text>
          <Animated.Text style={{ fontSize: 42, textAlign: 'center', marginBottom: 12, transform: [{ scale: moodEmojiAnim }] }}>
            {MOOD_EMOJIS[moodRating]}
          </Animated.Text>
          <View style={styles.scaleRow}>
            {MOOD_RATINGS.map((item) => (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.scaleButton,
                  { backgroundColor: colors.inputBg, borderColor: colors.border },
                  moodRating === item.value && {
                    backgroundColor: RATING_COLORS[item.value],
                    borderColor: RATING_COLORS[item.value],
                  },
                ]}
                onPress={() => setMoodRating(item.value)}
              >
                <Text
                  style={[
                    styles.scaleButtonText,
                    { color: colors.textSecondary },
                    moodRating === item.value && styles.scaleButtonTextSelected,
                  ]}
                >
                  {item.value}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.scaleLabel, { color: RATING_COLORS[moodRating] }]}>{selectedMood?.label}</Text>
        </View>

        <View ref={notesSectionRef} style={styles.section} collapsable={false}>
          <Text style={[styles.label, { color: colors.text }]}>Notes (optional)</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes about how you're feeling..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            onFocus={() => { notesFocusedRef.current = true; }}
            onBlur={() => { notesFocusedRef.current = false; }}
          />
        </View>

        {submitted && (
          <View style={styles.successBanner}>
            <Animated.View style={{ transform: [{ scale: heartSubmitAnim }], marginBottom: 6 }}>
              <Heart color="#fff" size={30} fill="#fff" />
            </Animated.View>
            <QuickBounce
              text="Rating Saved!"
              color="#fff"
              onDone={() => { if (router.canGoBack()) router.back(); else router.replace('/'); }}
            />
          </View>
        )}
        <TouchableOpacity
          style={[styles.submitButton, (loading || submitted) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading || submitted}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Saving...' : 'Save Rating'}
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
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
  },
  description: {
    fontSize: 14,
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
    alignItems: 'center',
  },
  scaleButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  scaleButtonTextSelected: {
    color: '#fff',
  },
  scaleLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 120,
    marginTop: 4,
  },
  previousBox: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
  },
  previousHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  previousTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.primary,
  },
  previousContent: {
    gap: 8,
  },
  previousRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  previousLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  previousDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previousDate: {
    fontSize: 13,
  },
  successBanner: {
    backgroundColor: '#7c3aed',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButton: {
    backgroundColor: theme.primary,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
