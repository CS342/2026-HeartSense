import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import {
  countSymptomsSince,
  countActivitiesSince,
  countWellbeingRatingsSince,
  countMedicalChangesSince,
  getSymptoms,
  getActivities,
  getWellbeingRatings,
} from '@/lib/symptomService';
import { callFunction } from '@/lib/firebase';
import {
  Heart,
  Activity,
  Stethoscope,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  PersonStanding,
  Zap,
  Wind,
  Bell,
} from 'lucide-react-native';
import { theme } from '@/theme/colors';

interface QuickStats {
  todayEntries: number;
  weeklyEntries: number;
}

type LatestWellbeing = {
  energyLevel: number;
  moodRating: number;
  stressLevel: number;
} | null;

interface EngagementAlert {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: { toDate?: () => Date } | string;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<QuickStats>({
    todayEntries: 0,
    weeklyEntries: 0,
  });
  const [latestWellbeing, setLatestWellbeing] = useState<LatestWellbeing>(null);
  const [loading, setLoading] = useState(true);
  const [daysSinceLastEntry, setDaysSinceLastEntry] = useState<number | null>(null);
  const [engagementAlerts, setEngagementAlerts] = useState<EngagementAlert[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadStats();
      loadEngagementAlerts();
    }, [user])
  );

  const loadEngagementAlerts = async () => {
    if (!user) return;
    try {
      const result = await callFunction<{ limit?: number }, { alerts: EngagementAlert[]; unreadCount: number }>(
        'getEngagementAlerts',
        { limit: 20 }
      );
      setEngagementAlerts(result?.alerts ?? []);
    } catch (e: unknown) {
      const err = e as { code?: string; message?: string; details?: unknown };
      console.error("[Home] getEngagementAlerts failed:", {
        message: err?.message,
        code: err?.code,
        details: err?.details,
        fullError: e,
      });
      setEngagementAlerts([]);
    }
  };

  const loadStats = async () => {
    if (!user) {
      console.log('loadStats: No user');
      return;
    }

    console.log('loadStats: Loading stats for user:', user.uid);

    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      console.log('Today date:', today);

      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      console.log('Week ago date:', weekAgo);

      const [
        todaySymptomsRes,
        todayActivitiesRes,
        todayWellbeingRes,
        todayMedicalRes,
        weeklySymptomsRes,
        weeklyActivitiesRes,
        weeklyWellbeingRes,
        weeklyMedicalRes,
        wellbeingRes,
      ] = await Promise.all([
        countSymptomsSince(user.uid, today),
        countActivitiesSince(user.uid, today),
        countWellbeingRatingsSince(user.uid, today),
        countMedicalChangesSince(user.uid, today),
        countSymptomsSince(user.uid, weekAgo),
        countActivitiesSince(user.uid, weekAgo),
        countWellbeingRatingsSince(user.uid, weekAgo),
        countMedicalChangesSince(user.uid, weekAgo),
        getWellbeingRatings(user.uid, 1),
      ]);

      const rating = wellbeingRes.data?.[0];
      setLatestWellbeing(
        rating
          ? {
            energyLevel: rating.energyLevel,
            moodRating: rating.moodRating,
            stressLevel: rating.stressLevel,
          }
          : null
      );

      const todayTotal =
        todaySymptomsRes.count +
        todayActivitiesRes.count +
        todayWellbeingRes.count +
        todayMedicalRes.count;
      const weekTotal =
        weeklySymptomsRes.count +
        weeklyActivitiesRes.count +
        weeklyWellbeingRes.count +
        weeklyMedicalRes.count;

      setStats({
        todayEntries: todayTotal,
        weeklyEntries: weekTotal,
      });

      console.log('Stats set:', { todayEntries: todayTotal, weeklyEntries: weekTotal });

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
      const [symptomsRes, activitiesRes] = await Promise.all([
        getSymptoms(user.uid, 1),
        getActivities(user.uid, 1),
      ]);

      const dates = [
        symptomsRes.data?.[0]?.occurredAt,
        activitiesRes.data?.[0]?.occurredAt,
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
              <HelpCircle color={theme.primary} size={28} />
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

        {engagementAlerts.length > 0 && (
          <View style={styles.engagementAlertsSection}>
            <View style={styles.engagementAlertsHeader}>
              <Bell color="#0066cc" size={20} />
              <Text style={styles.engagementAlertsTitle}>Notifications</Text>
            </View>
            {engagementAlerts.slice(0, 5).map((alert) => (
              <View key={alert.id} style={[styles.engagementAlertCard, !alert.read && styles.engagementAlertUnread]}>
                <Text style={styles.engagementAlertTitle}>{alert.title}</Text>
                <Text style={styles.engagementAlertMessage}>{alert.message}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Today's Entries</Text>
            <Text style={styles.statValue}>{stats.todayEntries}</Text>
          </View>
          <View style={[styles.statCard, styles.wellbeingCard]}>
            {/* <Text style={styles.statLabel}>Well-being</Text> */}
            {latestWellbeing ? (
              <>
                <View style={styles.wellbeingRow}>
                  <View style={styles.labelRow}>
                    <Zap color={theme.primary} size={20} />
                    <Text style={styles.label}>Energy</Text>
                  </View>
                  <Text style={styles.wellbeingRowValue}>{latestWellbeing.energyLevel}</Text>
                </View>
                <View style={styles.wellbeingRow}>
                  <View style={styles.labelRow}>
                    <Wind color={theme.primary} size={20} />
                    <Text style={styles.label}>Stress</Text>
                  </View>
                  <Text style={styles.wellbeingRowValue}>{latestWellbeing.stressLevel}</Text>
                </View>
                <View style={styles.wellbeingRow}>
                  <View style={styles.labelRow}>
                    <PersonStanding color={theme.primary} size={20} />
                    <Text style={styles.label}>Mood</Text>
                  </View>
                  <Text style={styles.wellbeingRowValue}>{latestWellbeing.moodRating}</Text>
                </View>

              </>
            ) : (
              <Text style={styles.wellbeingEmpty}>No rating yet</Text>
            )}
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
  wellbeingCard: {
    justifyContent: 'flex-start',
  },
  wellbeingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  wellbeingRowLabel: {
    fontSize: 12,
    color: '#666',
  },
  wellbeingRowValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  wellbeingEmpty: {
    fontSize: 13,
    color: '#999',
    marginTop: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#666',
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
  engagementAlertsSection: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  engagementAlertsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  engagementAlertsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  engagementAlertCard: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  engagementAlertUnread: {
    backgroundColor: '#eff6ff',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: 0,
    borderLeftWidth: 3,
    borderLeftColor: '#0066cc',
  },
  engagementAlertTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  engagementAlertMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
