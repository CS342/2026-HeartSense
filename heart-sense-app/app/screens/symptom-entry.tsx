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
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, addDoc } from 'firebase/firestore';
import { ArrowLeft, TrendingUp, Calendar } from 'lucide-react-native';

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
  const [loading, setLoading] = useState(false);
  const [previousSymptom, setPreviousSymptom] = useState<PreviousSymptom | null>(null);

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
      const q = query(
        collection(db, 'symptoms'),
        where('user_id', '==', user.uid),
        where('symptom_type', '==', selectedType),
        orderBy('occurred_at', 'desc'),
        limit(1)
      );

      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0].data() as any;
        setPreviousSymptom({ severity: d.severity, occurred_at: d.occurred_at });
      } else {
        setPreviousSymptom(null);
      }
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

    setLoading(true);

    try {
      await addDoc(collection(db, 'symptoms'), {
        user_id: user?.uid,
        symptom_type: selectedType,
        severity,
        description,
        occurred_at: occurredAt.toISOString(),
        created_at: new Date().toISOString(),
      });

      Alert.alert('Success', 'Symptom logged successfully');
      router.back();
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
});
