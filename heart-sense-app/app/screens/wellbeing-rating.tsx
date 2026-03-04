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
import { logWellbeingRating, getPreviousWellbeing } from '@/lib/symptomService';
import { ArrowLeft, Zap, Wind, PersonStanding, TrendingUp, Calendar } from 'lucide-react-native';
import { theme } from '@/theme/colors';

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
  const HEADER_APPROX = 100;
  const PAD_ABOVE_KEYBOARD = 20;

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
          <Text style={styles.title}>Well-being Rating</Text>
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
          <View style={styles.previousBox}>
            <View style={styles.previousHeader}>
              <TrendingUp color={theme.primary} size={18} />
              <Text style={styles.previousTitle}>Previous Rating</Text>
            </View>
            <View style={styles.previousContent}>
              <View style={styles.previousRow}>
                <Text style={styles.previousLabel}>Energy: {previousRating.energyLevel}/5</Text>
                <Text style={styles.previousLabel}>Mood: {previousRating.moodRating}/5</Text>
                <Text style={styles.previousLabel}>Stress: {previousRating.stressLevel}/5</Text>
              </View>
              <View style={styles.previousDateRow}>
                <Calendar color="#666" size={14} />
                <Text style={styles.previousDate}>{formatPreviousDate(previousRating.recordedAt)}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.section}>
          <View style={styles.labelRow}>
            <Zap color={theme.primary} size={20} />
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
            <Wind color={theme.primary} size={20} />
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
            <PersonStanding color={theme.primary} size={20} />
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

        <View ref={notesSectionRef} style={styles.section} collapsable={false}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={styles.textArea}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes about how you're feeling..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            onFocus={() => { notesFocusedRef.current = true; }}
            onBlur={() => { notesFocusedRef.current = false; }}
          />
        </View>

        {submitted && (
          <View style={styles.successBanner}>
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
    backgroundColor: theme.primary,
    borderColor: theme.primary,
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
    color: theme.primary,
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
  previousBox: {
    backgroundColor: theme.primaryLight,
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#bfdbfe',
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
    color: '#1e40af',
  },
  previousDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  previousDate: {
    fontSize: 13,
    color: '#1e40af',
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
    backgroundColor: '#99c2e6',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
