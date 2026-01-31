import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import {
  Heart,
  Activity,
  Stethoscope,
  TrendingUp,
  AlertCircle,
  HelpCircle,
} from 'lucide-react-native';

interface QuickStats {
  todaySymptoms: number;
  todayRating: number | null;
  todayActivities: number;
  weeklyEntries: number;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<QuickStats>({
    todaySymptoms: 0,
    todayRating: null,
    todayActivities: 0,
    weeklyEntries: 0,
  });
  const [loading, setLoading] = useState(true);
  const [daysSinceLastEntry, setDaysSinceLastEntry] = useState<number | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    if (!user) return;

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const weekAgoStr = weekAgo.toISOString();

      const todayISODate = today.toISOString().split('T')[0];

      const [symptomsSnap, activitiesSnap, weeklySnap, todayRatingSnap] = await Promise.all([
        getDocs(query(collection(db, 'symptoms'), where('user_id', '==', user.uid), where('occurred_at', '>=', todayStr))),
        getDocs(query(collection(db, 'activities'), where('user_id', '==', user.uid), where('occurred_at', '>=', todayStr))),
        getDocs(query(collection(db, 'symptoms'), where('user_id', '==', user.uid), where('occurred_at', '>=', weekAgoStr))),
        getDocs(query(collection(db, 'well_being_ratings'), where('user_id', '==', user.uid), where('rating_date', '==', todayISODate), limit(1))),
      ]);

      setStats({
        todaySymptoms: symptomsSnap.size || 0,
        todayRating: todayRatingSnap.empty ? null : (todayRatingSnap.docs[0].data() as any).rating || null,
        todayActivities: activitiesSnap.size || 0,
        weeklyEntries: weeklySnap.size || 0,
      });

      await checkLastEntry();
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkLastEntry = async () => {
    if (!user) return;

    try {
      const [lastSymptomSnap, lastActivitySnap, lastRatingSnap] = await Promise.all([
        getDocs(query(collection(db, 'symptoms'), where('user_id', '==', user.uid), orderBy('occurred_at', 'desc'), limit(1))),
        getDocs(query(collection(db, 'activities'), where('user_id', '==', user.uid), orderBy('occurred_at', 'desc'), limit(1))),
        getDocs(query(collection(db, 'well_being_ratings'), where('user_id', '==', user.uid), orderBy('rating_date', 'desc'), limit(1))),
      ]);

      const dates = [
        lastSymptomSnap.docs[0]?.data()?.occurred_at,
        lastActivitySnap.docs[0]?.data()?.occurred_at,
        lastRatingSnap.docs[0]?.data()?.rating_date,
      ].filter(Boolean);

      if (dates.length === 0) {
        setDaysSinceLastEntry(null);
        return;
      }

      const mostRecentDate = new Date(Math.max(...dates.map(d => new Date(d!).getTime())));
      const now = new Date();
      const diffMs = now.getTime() - mostRecentDate.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays >= 2) {
        setDaysSinceLastEntry(diffDays);
      } else {
        setDaysSinceLastEntry(null);
      }
    } catch (error) {
      console.error('Error checking last entry:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Good day!</Text>
              <Text style={styles.subtitle}>How are you feeling today?</Text>
            </View>
            <TouchableOpacity style={styles.helpButton} onPress={() => router.push('/screens/help')}>
              <HelpCircle color="#0066cc" size={28} />
            </TouchableOpacity>
          </View>
        </View>

        {daysSinceLastEntry !== null && daysSinceLastEntry >= 2 && (
          <View style={styles.alertBanner}>
            <View style={styles.alertIconContainer}>
              <AlertCircle color="#ea580c" size={24} />
            </View>
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>Haven't logged in {daysSinceLastEntry} days</Text>
              <Text style={styles.alertText}>
                Regular tracking helps us better understand your health patterns. Please log your symptoms and well-being today.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Today's Entries</Text>
            <Text style={styles.statValue}>{stats.todaySymptoms + stats.todayActivities}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Well-being</Text>
            <Text style={styles.statValue}>
              {stats.todayRating ? `${stats.todayRating}/10` : '-'}
            </Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>This Week</Text>
            <Text style={styles.statValue}>{stats.weeklyEntries}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/screens/symptom-entry')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#fee' }]}>
              <Heart color="#dc2626" size={28} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Log Symptom</Text>
              <Text style={styles.actionDescription}>
                Record any symptoms you're experiencing
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/screens/wellbeing-rating')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#e6f2ff' }]}>
              <TrendingUp color="#0066cc" size={28} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Rate Well-being</Text>
              <Text style={styles.actionDescription}>
                How do you feel overall today?
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/screens/activity-entry')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#f0fdf4' }]}>
              <Activity color="#16a34a" size={28} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Log Activity</Text>
              <Text style={styles.actionDescription}>
                Track your daily activities
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => router.push('/screens/medical-condition')}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#fef3e7' }]}>
              <Stethoscope color="#ea580c" size={28} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Medical Change</Text>
              <Text style={styles.actionDescription}>
                Report changes in your condition
              </Text>
            </View>
          </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 32,
    backgroundColor: '#fff',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  helpButton: {
    padding: 4,
  },
  greeting: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
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
  actionCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#666',
  },
  alertBanner: {
    flexDirection: 'row',
    backgroundColor: '#fff7ed',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fed7aa',
  },
  alertIconContainer: {
    marginRight: 12,
    paddingTop: 2,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#9a3412',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    color: '#9a3412',
    lineHeight: 20,
  },
});
