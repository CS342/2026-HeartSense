import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, Activity, Stethoscope, TrendingUp } from 'lucide-react-native';

export default function AddScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Add Entry</Text>
        <Text style={styles.subtitle}>What would you like to track?</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.cardsContainer}>
          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#fee' }]}
            onPress={() => router.push('/screens/symptom-entry')}
          >
            <View style={styles.cardIcon}>
              <Heart color="#dc2626" size={32} />
            </View>
            <Text style={styles.cardTitle}>Log Symptom</Text>
            <Text style={styles.cardDescription}>
              Record any symptoms you're experiencing right now
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#e6f2ff' }]}
            onPress={() => router.push('/screens/wellbeing-rating')}
          >
            <View style={styles.cardIcon}>
              <TrendingUp color="#0066cc" size={32} />
            </View>
            <Text style={styles.cardTitle}>Rate Well-being</Text>
            <Text style={styles.cardDescription}>
              Share how you're feeling overall today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#f0fdf4' }]}
            onPress={() => router.push('/screens/activity-entry')}
          >
            <View style={styles.cardIcon}>
              <Activity color="#16a34a" size={32} />
            </View>
            <Text style={styles.cardTitle}>Log Activity</Text>
            <Text style={styles.cardDescription}>
              Track activities and exercises you've done
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.card, { backgroundColor: '#fef3e7' }]}
            onPress={() => router.push('/screens/medical-condition')}
          >
            <View style={styles.cardIcon}>
              <Stethoscope color="#ea580c" size={32} />
            </View>
            <Text style={styles.cardTitle}>Medical Change</Text>
            <Text style={styles.cardDescription}>
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
    fontSize: 16,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  cardsContainer: {
    padding: 16,
  },
  card: {
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  cardIcon: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});
