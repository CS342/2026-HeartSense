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
  getTodayWellbeingRatings,
  calculateWellbeingAverage,
} from '@/lib/symptomService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
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
  Watch,
} from 'lucide-react-native';
import { theme } from '@/theme/colors';
import AppLogo from '@/components/AppLogo';
import { useHealthKit } from '@/hooks/useHealthKit';
import { checkAndNotifyIfElevated } from '@/lib/elevatedHeartRateNotification';

interface QuickStats {
  todayEntries: number;
  weeklyEntries: number;
}

type LatestWellbeing = {
  energyLevel: number;
  moodRating: number;
  stressLevel: number;
} | null;

function timeAgo(isoDate: string | null): string {
  if (!isoDate) return 'Not synced';
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / (1000 * 60));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { vitals, isAvailable: hkAvailable } = useHealthKit();
  const [stats, setStats] = useState<QuickStats>({
    todayEntries: 0,
    weeklyEntries: 0,
  });
  const [latestWellbeing, setLatestWellbeing] = useState<LatestWellbeing>(null);
  const [loading, setLoading] = useState(true);
  const [daysSinceLastEntry, setDaysSinceLastEntry] = useState<number | null>(null);
  const [firstName, setFirstName] = useState<string>('');

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [user])
  );

  // When vitals load (e.g. from HealthKit), check for elevated heart rate and notify if enabled
  useEffect(() => {
    if (!user || !vitals) return;
    checkAndNotifyIfElevated(user.uid, vitals);
  }, [user?.uid, vitals]);

  const loadStats = async () => {
    if (!user) {
      console.log('loadStats: No user');
      return;
    }

    const profileSnap = await getDoc(doc(db, 'profiles', user.uid));
    const fullName: string = profileSnap.data()?.full_name || '';
    setFirstName(fullName.split(' ')[0]);

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
        getTodayWellbeingRatings(user.uid),
      ]);

      if (wellbeingRes.data && wellbeingRes.data.length > 0) {
        const averaged = calculateWellbeingAverage(wellbeingRes.data);
        setLatestWellbeing(averaged);
      } else {
        setLatestWellbeing(null);
      }

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
          <AppLogo size="small" showTitle={true} variant="light" />
          <View style={styles.headerContent}>
            <View>
              <Text style={styles.greeting}>Good day{firstName ? `, ${firstName}` : ''}!</Text>
              <Text style={styles.subtitle}>How are you feeling today?</Text>
            </View>
            <View style={styles.headerRight}>
              {hkAvailable && (
                <View style={styles.syncBadge}>
                  <Watch color="#fff" size={16} />
                  <Text style={styles.syncText}>{timeAgo(vitals?.lastUpdated ?? null)}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.helpButton} onPress={() => router.push('/screens/help')}>
                <HelpCircle color="#fff" size={28} />
              </TouchableOpacity>
            </View>
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

        <View style={styles.statsRow}>
          <View style={styles.statCardSmall}>
            <Text style={styles.statLabel}>Today's{'\n'}Entries</Text>
            <Text style={styles.statValue}>{stats.todayEntries}</Text>
          </View>

          <View style={styles.wellbeingBlock}>
            <Text style={styles.wellbeingBlockTitle}>Well-being</Text>
            {latestWellbeing ? (
              <View style={styles.wellbeingRow}>
                <View style={styles.wellbeingPill}>
                  <Zap color={theme.primary} size={16} />
                  <Text style={styles.wellbeingPillLabel}>Energy</Text>
                  <Text style={styles.wellbeingPillValue}>{latestWellbeing.energyLevel.toFixed(1)}</Text>
                </View>
                <View style={styles.wellbeingPill}>
                  <PersonStanding color={theme.primary} size={16} />
                  <Text style={styles.wellbeingPillLabel}>Mood</Text>
                  <Text style={styles.wellbeingPillValue}>{latestWellbeing.moodRating.toFixed(1)}</Text>
                </View>
                <View style={styles.wellbeingPill}>
                  <Wind color={theme.primary} size={16} />
                  <Text style={styles.wellbeingPillLabel}>Stress</Text>
                  <Text style={styles.wellbeingPillValue}>{latestWellbeing.stressLevel.toFixed(1)}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.wellbeingEmpty}>—</Text>
            )}
          </View>

          <View style={styles.statCardSmall}>
            <Text style={styles.statLabel}>This{'\n'}Week</Text>
            <Text style={styles.statValue}>{stats.weeklyEntries}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.symptom.bg, borderColor: theme.symptom.border }]}
            onPress={() => router.push('/screens/symptom-entry')}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.symptom.icon }]}>
              <Heart color="#fff" size={26} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Log Symptom</Text>
              <Text style={styles.actionDescription}>Record any symptoms you're experiencing</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.wellbeing.bg, borderColor: theme.wellbeing.border }]}
            onPress={() => router.push('/screens/wellbeing-rating')}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.wellbeing.icon }]}>
              <TrendingUp color="#fff" size={26} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Rate Well-being</Text>
              <Text style={styles.actionDescription}>How do you feel overall today?</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.activity.bg, borderColor: theme.activity.border }]}
            onPress={() => router.push('/screens/activity-entry')}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.activity.icon }]}>
              <Activity color="#fff" size={26} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Log Activity</Text>
              <Text style={styles.actionDescription}>Track your daily activities</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: theme.medical.bg, borderColor: theme.medical.border }]}
            onPress={() => router.push('/screens/medical-condition')}
          >
            <View style={[styles.actionIcon, { backgroundColor: theme.medical.icon }]}>
              <Stethoscope color="#fff" size={26} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Medical Change</Text>
              <Text style={styles.actionDescription}>Report changes in your condition</Text>
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
    backgroundColor: '#f5f3ff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: theme.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 14,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  syncText: {
    fontSize: 11,
    color: '#fff',
  },
  helpButton: {
    padding: 4,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
    alignItems: 'stretch',
  },
  statCardSmall: {
    backgroundColor: theme.primary,
    padding: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 64,
  },
  wellbeingBlock: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  wellbeingBlockTitle: {
    fontSize: 11,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  wellbeingRow: {
    flexDirection: 'row',
    gap: 6,
  },
  wellbeingPill: {
    flex: 1,
    alignItems: 'center',
  },
  wellbeingPillLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
  },
  wellbeingPillValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginTop: 1,
  },
  wellbeingEmpty: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 4,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 4,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
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
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
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
