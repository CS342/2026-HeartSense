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
import { useTheme } from '@/contexts/ThemeContext';
import AppLogo from '@/components/AppLogo';
import { useHealthKit } from '@/hooks/useHealthKit';

interface QuickStats {
  todayEntries: number;
  weeklyEntries: number;
}

type LatestWellbeing = {
  energyLevel: number;
  moodRating: number;
  stressLevel: number;
} | null;

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

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
  const { isDark, colors, fs } = useTheme();
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
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.scrollView}>
        <View style={[styles.header, { backgroundColor: isDark ? colors.surface : theme.primary }]}>
          <View style={styles.headerRight}>
            {hkAvailable && (
              <View style={styles.syncBadge}>
                <Watch color="#fff" size={20} />
                <Text style={[styles.syncText, { fontSize: fs(14) }]}>
                  {timeAgo(vitals?.lastUpdated ?? null)}
                </Text>
              </View>
            )}
            <TouchableOpacity style={styles.helpButton} onPress={() => router.push('/screens/help')}>
              <HelpCircle color="#fff" size={28} />
            </TouchableOpacity>
          </View>
          <AppLogo size="small" showTitle={true} variant="light" />
          <View style={styles.headerContent}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.greeting, { fontSize: fs(24) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{getGreeting()}{firstName ? `, ${firstName}` : ''}!</Text>
              <Text style={[styles.subtitle, { fontSize: fs(15) }]}>How are you feeling today?</Text>
            </View>
          </View>
        </View>

        {daysSinceLastEntry !== null && daysSinceLastEntry >= 2 && (
          <View style={[styles.alertBanner, isDark && { backgroundColor: '#3b1a00', borderColor: '#7c3a00' }]}>
            <View style={styles.alertIconContainer}>
              <AlertCircle color="#ea580c" size={24} />
            </View>
            <View style={styles.alertContent}>
              <Text
                style={[
                  styles.alertTitle,
                  { fontSize: fs(16) },
                  isDark && { color: '#fbbf24' },
                ]}
              >
                Haven't logged in {daysSinceLastEntry} days
              </Text>
              <Text
                style={[
                  styles.alertText,
                  { fontSize: fs(14) },
                  isDark && { color: '#fbbf24' },
                ]}
              >
                Regular tracking helps us better understand your health patterns. Please log your symptoms and well-being today.
              </Text>
            </View>
          </View>
        )}

        <View style={styles.statsContainer}>
          <View style={[styles.wellbeingBlock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text
              style={[
                styles.wellbeingBlockTitle,
                { color: colors.textSecondary, fontSize: fs(14) },
              ]}
            >
              Well-Being
            </Text>
            {latestWellbeing ? (
              <View style={styles.wellbeingRow}>
                <View style={styles.wellbeingPill}>
                  <Zap color={theme.primary} size={20} />
                  <Text
                    style={[
                      styles.wellbeingPillLabel,
                      { color: colors.textSecondary, fontSize: fs(14) },
                    ]}
                  >
                    Energy
                  </Text>
                  <Text
                    style={[
                      styles.wellbeingPillValue,
                      { color: colors.text, fontSize: fs(18) },
                    ]}
                  >
                    {latestWellbeing.energyLevel.toFixed(1)}
                  </Text>
                </View>
                <View style={styles.wellbeingPill}>
                  <PersonStanding color={theme.primary} size={22} />
                  <Text
                    style={[
                      styles.wellbeingPillLabel,
                      { color: colors.textSecondary, fontSize: fs(14) },
                    ]}
                  >
                    Mood
                  </Text>
                  <Text
                    style={[
                      styles.wellbeingPillValue,
                      { color: colors.text, fontSize: fs(18) },
                    ]}
                  >
                    {latestWellbeing.moodRating.toFixed(1)}
                  </Text>
                </View>
                <View style={styles.wellbeingPill}>
                  <Wind color={theme.primary} size={22} />
                  <Text
                    style={[
                      styles.wellbeingPillLabel,
                      { color: colors.textSecondary, fontSize: fs(14) },
                    ]}
                  >
                    Stress
                  </Text>
                  <Text
                    style={[
                      styles.wellbeingPillValue,
                      { color: colors.text, fontSize: fs(18) },
                    ]}
                  >
                    {latestWellbeing.stressLevel.toFixed(1)}
                  </Text>
                </View>
              </View>
            ) : (
              <Text
                style={[
                  styles.wellbeingEmpty,
                  { color: colors.textTertiary, fontSize: fs(13) },
                ]}
              >
                —
              </Text>
            )}
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCardSmall}>
              <Text style={[styles.statLabel, { fontSize: fs(14) }]}>
                Today's Entries
              </Text>
              <Text style={[styles.statValue, { fontSize: fs(24) }]}>
                {stats.todayEntries}
              </Text>
            </View>
            <View style={styles.statCardSmall}>
              <Text style={[styles.statLabel, { fontSize: fs(14) }]}>
                This Week
              </Text>
              <Text style={[styles.statValue, { fontSize: fs(24) }]}>
                {stats.weeklyEntries}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fs(20) }]}>Quick Actions</Text>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: isDark ? '#3a1a1a' : '#fee', borderColor: colors.border }]}
            onPress={() => router.push('/screens/symptom-entry')}
          >
            <View style={styles.actionCardHeader}>
              <View style={styles.actionCardIcon}>
                <Heart color="#dc2626" size={32} />
              </View>
              <Text style={[styles.actionCardTitle, { color: colors.text, fontSize: fs(24) }]}>
                Log Symptom
              </Text>
            </View>
            <Text style={[styles.actionCardDescription, { color: colors.textSecondary, fontSize: fs(17) }]}>
              Record any symptoms you're experiencing right now
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: isDark ? '#1a2a3a' : '#e6f2ff', borderColor: colors.border }]}
            onPress={() => router.push('/screens/wellbeing-rating')}
          >
            <View style={styles.actionCardHeader}>
              <View style={styles.actionCardIcon}>
                <TrendingUp color="#0066cc" size={32} />
              </View>
              <Text style={[styles.actionCardTitle, { color: colors.text, fontSize: fs(24) }]}>
                Rate Well-Being
              </Text>
            </View>
            <Text style={[styles.actionCardDescription, { color: colors.textSecondary, fontSize: fs(17) }]}>
              Share how you're feeling overall today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: isDark ? '#1a2e1a' : '#f0fdf4', borderColor: colors.border }]}
            onPress={() => router.push('/screens/activity-entry')}
          >
            <View style={styles.actionCardHeader}>
              <View style={styles.actionCardIcon}>
                <Activity color="#16a34a" size={32} />
              </View>
              <Text style={[styles.actionCardTitle, { color: colors.text, fontSize: fs(24) }]}>
                Log Activity
              </Text>
            </View>
            <Text style={[styles.actionCardDescription, { color: colors.textSecondary, fontSize: fs(17) }]}>
              Track activities and exercises you've done
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionCard, { backgroundColor: isDark ? '#3a2a1a' : '#fef3e7', borderColor: colors.border }]}
            onPress={() => router.push('/screens/medical-condition')}
          >
            <View style={styles.actionCardHeader}>
              <View style={styles.actionCardIcon}>
                <Stethoscope color="#ea580c" size={32} />
              </View>
              <Text style={[styles.actionCardTitle, { color: colors.text, fontSize: fs(24) }]}>
                Medical Change
              </Text>
            </View>
            <Text style={[styles.actionCardDescription, { color: colors.textSecondary, fontSize: fs(17) }]}>
              Report changes in medications or condition
            </Text>
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
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
  },
  statsContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
    alignItems: 'stretch',
  },
  statsRow: {
    flexDirection: 'row',
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
    flex: 1,
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
    fontWeight: '700',
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
    fontWeight: '700',
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
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionCardIcon: {
    marginRight: 12,
  },
  actionCardTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  actionCardDescription: {
    fontSize: 17,
    color: '#666',
    lineHeight: 24,
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
