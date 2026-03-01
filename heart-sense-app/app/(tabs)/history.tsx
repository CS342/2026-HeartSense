import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { getSymptoms, getActivities, getWellbeingRatings, getMedicalChanges } from '@/lib/symptomService';
import { Heart, Activity, Stethoscope, TrendingUp, X, ChevronRight } from 'lucide-react-native';
import { theme } from '@/theme/colors';

type EntryType = 'all' | 'symptom' | 'wellbeing' | 'activity' | 'medical';

interface TimelineEntry {
  id: string;
  type: 'symptom' | 'wellbeing' | 'activity' | 'medical';
  title: string;
  description: string;
  timestamp: string;
  details?: any;
}

const FILTER_OPTIONS: { key: EntryType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'symptom', label: 'Symptoms' },
  { key: 'wellbeing', label: 'Well-being' },
  { key: 'activity', label: 'Activities' },
  { key: 'medical', label: 'Medical' },
];

export default function HistoryScreen() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<EntryType>('all');
  const [selectedEntry, setSelectedEntry] = useState<TimelineEntry | null>(null);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [user])
  );

  const loadHistory = async () => {
    if (!user) return;

    try {
      const [symptomsRes, activitiesRes, wellbeingRes, medicalChangesRes] = await Promise.all([
        getSymptoms(user.uid, 50),
        getActivities(user.uid, 50),
        getWellbeingRatings(user.uid, 50),
        getMedicalChanges(user.uid, 50),
      ]);

      const timeline: TimelineEntry[] = [];

      if (symptomsRes.data && Array.isArray(symptomsRes.data)) {
        symptomsRes.data.forEach((s: any) => {
          timeline.push({
            id: s.id,
            type: 'symptom',
            title: s.symptomType,
            description: s.description || `Severity: ${s.severity}/5`,
            timestamp: s.occurredAt,
            details: s,
          });
        });
      }

      if (activitiesRes.data && Array.isArray(activitiesRes.data)) {
        activitiesRes.data.forEach((a: any) => {
          const durationInfo = `${a.durationMinutes} min - ${a.intensity} intensity`;
          const description = a.description
            ? `${a.description} • ${durationInfo}`
            : durationInfo;

          timeline.push({
            id: a.id,
            type: 'activity',
            title: a.activityType,
            description,
            timestamp: a.occurredAt,
            details: a,
          });
        });
      }

      if (wellbeingRes.data && Array.isArray(wellbeingRes.data)) {
        wellbeingRes.data.forEach((w: any) => {
          timeline.push({
            id: w.id,
            type: 'wellbeing',
            title: 'Well-being Rating',
            description: `Energy: ${w.energyLevel} · Mood: ${w.moodRating} · Stress: ${w.stressLevel}`,
            timestamp: w.recordedAt,
            details: w,
          });
        });
      }

      if (medicalChangesRes.data && Array.isArray(medicalChangesRes.data)) {
        medicalChangesRes.data.forEach((m: any) => {
          timeline.push({
            id: m.id,
            type: 'medical',
            title: m.conditionType,
            description: m.description,
            timestamp: m.occurredAt,
            details: m,
          });
        });
      }

      timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEntries(timeline);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEntries = activeFilter === 'all'
    ? entries
    : entries.filter((e) => e.type === activeFilter);

  const getIcon = (type: string) => {
    switch (type) {
      case 'symptom':
        return <Heart color="#dc2626" size={20} />;
      case 'wellbeing':
        return <TrendingUp color={theme.primary} size={20} />;
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

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'symptom': return 'Symptom';
      case 'wellbeing': return 'Well-being';
      case 'activity': return 'Activity';
      case 'medical': return 'Medical Change';
      default: return '';
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

  const formatFullDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const renderDetailContent = (entry: TimelineEntry) => {
    const d = entry.details;
    if (!d) return null;

    switch (entry.type) {
      case 'symptom':
        return (
          <>
            <DetailRow label="Symptom" value={d.symptomType} />
            <DetailRow label="Severity" value={`${d.severity}/5`} />
            {d.description ? <DetailRow label="Details" value={d.description} /> : null}
            <DetailRow label="Occurred" value={formatFullDate(d.occurredAt)} />
            {d.vitalsContext?.samples?.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Vitals at time of symptom</Text>
                {d.vitalsContext.samples.map((s: any, i: number) => (
                  <Text key={i} style={styles.detailVital}>
                    {s.type}: {s.value} {s.unit}
                  </Text>
                ))}
              </View>
            )}
          </>
        );
      case 'wellbeing':
        return (
          <>
            <DetailRow label="Energy" value={`${d.energyLevel}/5`} />
            <DetailRow label="Mood" value={`${d.moodRating}/5`} />
            <DetailRow label="Stress" value={`${d.stressLevel}/5`} />
            {d.notes ? <DetailRow label="Notes" value={d.notes} /> : null}
            <DetailRow label="Recorded" value={formatFullDate(d.recordedAt)} />
          </>
        );
      case 'activity':
        return (
          <>
            <DetailRow label="Activity" value={d.activityType} />
            <DetailRow label="Duration" value={`${d.durationMinutes} minutes`} />
            <DetailRow label="Intensity" value={d.intensity} />
            {d.description ? <DetailRow label="Details" value={d.description} /> : null}
            <DetailRow label="Occurred" value={formatFullDate(d.occurredAt)} />
          </>
        );
      case 'medical':
        return (
          <>
            <DetailRow label="Type" value={d.conditionType} />
            <DetailRow label="Description" value={d.description} />
            <DetailRow label="Occurred" value={formatFullDate(d.occurredAt)} />
          </>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>{filteredEntries.length} {activeFilter === 'all' ? 'total' : activeFilter} entries</Text>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTER_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.filterChip, activeFilter === opt.key && styles.filterChipActive]}
              onPress={() => setActiveFilter(opt.key)}
            >
              <Text style={[styles.filterChipText, activeFilter === opt.key && styles.filterChipTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.scrollView}>
        {filteredEntries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>
              {activeFilter === 'all' ? 'No entries yet' : `No ${activeFilter} entries`}
            </Text>
            <Text style={styles.emptyText}>
              {activeFilter === 'all'
                ? 'Start tracking your health to see your history here'
                : `You haven't logged any ${activeFilter} entries yet`}
            </Text>
          </View>
        ) : (
          <View style={styles.timeline}>
            {filteredEntries.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={styles.entryCard}
                onPress={() => setSelectedEntry(entry)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconContainer, { backgroundColor: getBackgroundColor(entry.type) }]}>
                  {getIcon(entry.type)}
                </View>
                <View style={styles.entryContent}>
                  <Text style={styles.entryTitle}>{entry.title}</Text>
                  <Text style={styles.entryDescription} numberOfLines={2}>{entry.description}</Text>
                  <Text style={styles.entryTime}>{formatDate(entry.timestamp)}</Text>
                </View>
                <View style={styles.chevronContainer}>
                  <ChevronRight color="#ccc" size={18} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={selectedEntry !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedEntry(null)}
      >
        {selectedEntry && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <View style={[styles.modalIconContainer, { backgroundColor: getBackgroundColor(selectedEntry.type) }]}>
                  {getIcon(selectedEntry.type)}
                </View>
                <Text style={styles.modalType}>{getTypeLabel(selectedEntry.type)}</Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedEntry(null)} style={styles.modalClose}>
                <X color="#666" size={24} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalTitle}>{selectedEntry.title}</Text>
              <Text style={styles.modalTimestamp}>{formatFullDate(selectedEntry.timestamp)}</Text>
              <View style={styles.detailDivider} />
              {renderDetailContent(selectedEntry)}
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
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
    paddingBottom: 16,
    backgroundColor: '#fff',
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
  filterContainer: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
    paddingBottom: 12,
  },
  filterScroll: {
    paddingHorizontal: 24,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  filterChipActive: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterChipTextActive: {
    color: '#fff',
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
    alignItems: 'center',
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
  chevronContainer: {
    marginLeft: 8,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  modalClose: {
    padding: 4,
  },
  modalContent: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  modalTimestamp: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  detailDivider: {
    height: 1,
    backgroundColor: '#e5e5e5',
    marginBottom: 20,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: '#1a1a1a',
    lineHeight: 22,
  },
  detailSection: {
    marginTop: 8,
    marginBottom: 16,
    padding: 14,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  detailSectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  detailVital: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 4,
  },
});
