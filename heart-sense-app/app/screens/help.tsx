import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { HelpCircle, ChevronDown, ChevronUp, ArrowLeft, MessageCircle } from 'lucide-react-native';
import { theme } from '@/theme/colors';
import { useTheme } from '@/contexts/ThemeContext';

interface FAQ {
  id: string;
  question: string;
  answer: string;
}

const FAQS: FAQ[] = [
  {
    id: '1',
    question: 'When should I report chest pain?',
    answer: 'You should report any chest pain, especially if it\'s new, severe, or different from your usual symptoms. Seek immediate medical attention if you experience severe chest pain, pain spreading to your arm or jaw, shortness of breath, or sweating.',
  },
  {
    id: '2',
    question: 'How often should I log my well-being rating?',
    answer: 'We recommend logging your well-being rating once daily, ideally at the same time each day. This helps us track patterns and changes in your overall health status.',
  },
  {
    id: '3',
    question: 'What activities should I track?',
    answer: 'Track any significant physical activities including exercise, walking, work activities, and even rest periods. This helps us understand how different activities may relate to your symptoms.',
  },
  {
    id: '4',
    question: 'Should I report mild symptoms?',
    answer: 'Yes, please report all symptoms, even mild ones. What seems minor could be important for identifying patterns. Our research relies on complete and accurate data.',
  },
  {
    id: '5',
    question: 'How do I update my medical conditions?',
    answer: 'From the Home screen, tap "Medical Change" to report any changes in your diagnosed conditions, new diagnoses, or updates to existing conditions.',
  },
  {
    id: '6',
    question: 'Can I edit or delete entries?',
    answer: 'Yes, you can edit entries. Go to the History tab, tap on any entry, then tap the pencil icon to make changes. Entries cannot be deleted to maintain data integrity for research purposes.',
  },
  {
    id: '7',
    question: 'Who can see my health data?',
    answer: 'Your data is protected under strict privacy protocols. Only authorized research staff and your healthcare providers can access your information. All data is anonymized for research purposes.',
  },
  {
    id: '8',
    question: 'What if I forget to log for several days?',
    answer: 'While daily logging is ideal, you can log entries for past days when you remember. Try to be as accurate as possible about the timing and details of your symptoms or activities.',
  },
];

export default function HelpScreen() {
  const router = useRouter();
  const { colors, fs } = useTheme();
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft color={theme.primary} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: fs(18) }]}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fs(20) }]}>Frequently Asked Questions</Text>

          {FAQS.map((faq) => (
            <View key={faq.id} style={[styles.faqItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleFAQ(faq.id)}
              >
                <View style={styles.faqQuestionContent}>
                  <HelpCircle color={theme.primary} size={20} />
                  <Text style={[styles.faqQuestionText, { color: colors.text, fontSize: fs(16) }]}>{faq.question}</Text>
                </View>
                {expandedFAQ === faq.id ? (
                  <ChevronUp color={colors.textSecondary} size={20} />
                ) : (
                  <ChevronDown color={colors.textSecondary} size={20} />
                )}
              </TouchableOpacity>
              {expandedFAQ === faq.id && (
                <View style={styles.faqAnswer}>
                  <Text style={[styles.faqAnswerText, { color: colors.textSecondary, fontSize: fs(15) }]}>{faq.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={[styles.contactSection, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.contactTitle, { color: colors.text, fontSize: fs(18) }]}>Need More Help?</Text>
          <Text style={[styles.contactText, { color: colors.textSecondary, fontSize: fs(15) }]}>
            If you have questions that aren't answered here, please contact your healthcare
            provider or the research team.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  aiButton: {
    backgroundColor: theme.primary,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  aiButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  aiTextContainer: {
    flex: 1,
  },
  aiButtonTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  aiButtonSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  faqItem: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  faqQuestionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 12,
    flex: 1,
  },
  faqAnswer: {
    paddingHorizontal: 48,
    paddingBottom: 16,
  },
  faqAnswerText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
  contactSection: {
    padding: 24,
    margin: 16,
    backgroundColor: theme.primaryLight,
    borderRadius: 12,
    marginBottom: 32,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  contactText: {
    fontSize: 15,
    color: '#4b5563',
    lineHeight: 22,
  },
});
