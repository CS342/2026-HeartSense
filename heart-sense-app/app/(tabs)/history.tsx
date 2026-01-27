import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Heart, Activity, Stethoscope, TrendingUp } from 'lucide-react-native';

interface TimelineEntry {
  id: string;
  type: 'symptom' | 'wellbeing' | 'activity' | 'medical';
  title: string;
  description: string;
  timestamp: string;
  details?: any;
}

export default function HistoryScreen() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    if (!user) return;

    try {
      const [symptomsRes, ratingsRes, activitiesRes, conditionsRes] = await Promise.all([
        supabase
          .from('symptoms')
          .select('*')
          .eq('user_id', user.id)
          .order('occurred_at', { ascending: false })
          .limit(50),
        supabase
          .from('well_being_ratings')
          .select('*')
          .eq('user_id', user.id)
          .order('rating_date', { ascending: false })
          .limit(50),
        supabase
          .from('activities')
          .select('*')
          .eq('user_id', user.id)
          .order('occurred_at', { ascending: false })
          .limit(50),
        supabase
          .from('medical_conditions')
          .select('*')
          .eq('user_id', user.id)
          .order('occurred_at', { ascending: false })
          .limit(50),
      ]);

      const timeline: TimelineEntry[] = [];

      symptomsRes.data?.forEach((s) => {
        timeline.push({
          id: s.id,
          type: 'symptom',
          title: s.symptom_type,
          description: s.description || `Severity: ${s.severity}/10`,
          timestamp: s.occurred_at,
          details: s,
        });
      });

      ratingsRes.data?.forEach((r) => {
        timeline.push({
          id: r.id,
          type: 'wellbeing',
          title: 'Well-being Rating',
          description: `Rating: ${r.rating}/10`,
          timestamp: r.rating_date,
          details: r,
        });
      });

      activitiesRes.data?.forEach((a) => {
        timeline.push({
          id: a.id,
          type: 'activity',
          title: a.activity_type,
          description: `${a.duration_minutes} min - ${a.intensity} intensity`,
          timestamp: a.occurred_at,
          details: a,
        });
      });

      conditionsRes.data?.forEach((c) => {
        timeline.push({
          id: c.id,
          type: 'medical',
          title: c.condition_type,
          description: c.description,
          timestamp: c.occurred_at,
          details: c,
        });
      });

      timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      setEntries(timeline);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'symptom':
        return <Heart color="#dc2626" size={20} />;
      case 'wellbeing':
        return <TrendingUp color="#0066cc" size={20} />;
      case 'activity':
        return <Activity color="#16a34a" size={20} />;
      case 'medical':
        return <Stethoscope color="#ea580c" size={20} />;
      default:
        return null;
    }
  };

  const getBackgroundColor = (type: string) => {
    switch (type) {
      case 'symptom':
        return '#fee';
      case 'wellbeing':
        return '#e6f2ff';
      case 'activity':
        return '#f0fdf4';
      case 'medical':
        return '#fef3e7';
      default:
        return '#f9f9f9';
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066cc" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>{entries.length} total entries</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptyText}>Start tracking your health to see your history here</Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {entries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={[styles.iconContainer, { backgroundColor: getBackgroundColor(entry.type) }]}>
                  {getIcon(entry.type)}
                </View>
                <View style={styles.entryContent}>
                  <Text style={styles.entryTitle}>{entry.title}</Text>
                  <Text style={styles.entryDescription}>{entry.description}</Text>
                  <Text style={styles.entryTime}>{formatDate(entry.timestamp)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
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
    padding: 24,
    paddingTop: 32,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  timeline: {
    padding: 16,
  },
  entryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  entryContent: {
    flex: 1,
  },
  entryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  entryDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  entryTime: {
    fontSize: 12,
    color: '#999',
  },
});
