import { useState, useEffect, useCallback } from "react";
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Switch,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { countWellbeingRatings, countMedicalChanges } from "@/lib/symptomService";

import {
  User,
  Mail,
  Calendar,
  LogOut,
  Save,
  Bell,
  BarChart3,
  Info,
} from "lucide-react-native";
import { theme } from "@/theme/colors";

interface Profile {
  full_name: string;
  email: string;
  date_of_birth: string; // store as "YYYY-MM-DD" string in Firestore (recommended) or empty string in UI
}

interface AccountStats {
  totalEntries: number;
  daysActive: number;
  joinedDate: string; // ISO string
  lastActivity: string; // ISO string
}

interface NotificationPreferences {
  notify_daily_reminder: boolean;
  notify_messages: boolean;
  notify_health_insights: boolean;
  notify_activity_milestones: boolean;
}

function toJSDate(value: any): Date | null {
  if (!value) return null;
  // Firestore Timestamp
  if (value instanceof Timestamp) return value.toDate();
  // Some Firestore SDKs return objects with toDate()
  if (typeof value?.toDate === "function") return value.toDate();
  // ISO string / date string
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d;
}

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    email: "",
    date_of_birth: "",
  });

  const [stats, setStats] = useState<AccountStats>({
    totalEntries: 0,
    daysActive: 0,
    joinedDate: "",
    lastActivity: "",
  });

  const [notifications, setNotifications] = useState<NotificationPreferences>({
    notify_daily_reminder: true,
    notify_messages: true,
    notify_health_insights: true,
    notify_activity_milestones: true,
  });

  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!user) return;

      // load everything when screen comes into focus
      loadProfile();
      loadAccountStats();
      loadNotificationPreferences();
    }, [user])
  );

  const ensureProfileDocExists = async () => {
    if (!user) return;

    const ref = doc(db, "profiles", user.uid);
    const snap = await getDoc(ref);

    if (!snap.exists()) {
      await setDoc(
        ref,
        {
          email: user.email || "",
          full_name: "",
          date_of_birth: null, // store null when not set
          gender: null,
          height_cm: null,
          weight_kg: null,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        },
        { merge: true }
      );
    }
  };

  const loadProfile = async () => {
    if (!user) return;

    try {
      await ensureProfileDocExists();

      const ref = doc(db, "profiles", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data: any = snap.data();

        setProfile({
          full_name: (data.full_name as string) || "",
          email: (data.email as string) || user.email || "",
          date_of_birth: (data.date_of_birth as string) || "",
        });
      } else {
        // fallback (shouldn't happen after ensure)
        setProfile({
          full_name: "",
          email: user.email || "",
          date_of_birth: "",
        });
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  };

  const loadNotificationPreferences = async () => {
    if (!user) return;

    try {
      const ref = doc(db, "user_preferences", user.uid);
      const snap = await getDoc(ref);

      if (snap.exists()) {
        const data: any = snap.data();
        setNotifications({
          notify_daily_reminder: !!data.notify_daily_reminder,
          notify_messages: !!data.notify_messages,
          notify_health_insights: !!data.notify_health_insights,
          notify_activity_milestones: !!data.notify_activity_milestones,
        });
      } else {
        // create defaults
        const defaults: NotificationPreferences = {
          notify_daily_reminder: true,
          notify_messages: true,
          notify_health_insights: true,
          notify_activity_milestones: true,
        };

        await setDoc(
          ref,
          {
            ...defaults,
            created_at: serverTimestamp(),
            updated_at: serverTimestamp(),
          },
          { merge: true }
        );

        setNotifications(defaults);
      }
    } catch (error) {
      console.error("Error loading notification preferences:", error);
    }
  };

  const updateNotificationPreference = async (
    key: keyof NotificationPreferences,
    value: boolean
  ) => {
    if (!user) return;

    const prev = notifications;
    const updatedPrefs = { ...notifications, [key]: value };
    setNotifications(updatedPrefs);

    try {
      // Ensure doc exists (in case user never loaded prefs)
      await setDoc(
        doc(db, "user_preferences", user.uid),
        {
          [key]: value,
          updated_at: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error("Error updating notification preference:", error);
      setNotifications(prev);
      Alert.alert("Error", "Failed to update notification preference");
    }
  };

  const loadAccountStats = async () => {
    if (!user) return;

    try {
      console.log('loadAccountStats: Loading for user:', user.uid);

      // Get profile created_at
      const profileSnap = await getDoc(doc(db, "profiles", user.uid));
      const joined = profileSnap.exists() ? (profileSnap.data() as any)?.created_at : null;
      const joinedDate = toJSDate(joined);

      // Fetch docs for counts + dates (using camelCase field name)
      const colNames = ["symptoms", "activities"];

      const [snapsRes, wellbeingRes, medicalRes] = await Promise.all([
        Promise.all(
          colNames.map((name) =>
            getDocs(query(collection(db, name), where("userId", "==", user.uid)))
          )
        ),
        countWellbeingRatings(user.uid),
        countMedicalChanges(user.uid),
      ]);

      const snaps = snapsRes;
      console.log('loadAccountStats: Symptoms count:', snaps[0].docs.length);
      console.log('loadAccountStats: Activities count:', snaps[1].docs.length);

      const allDocs = snaps.flatMap((s) => s.docs.map((d) => d.data() as any));
      const totalEntries = allDocs.length + wellbeingRes.count + medicalRes.count;

      console.log('loadAccountStats: Total entries:', totalEntries);
      console.log('loadAccountStats: Sample doc:', allDocs[0]);

      const allDates: Date[] = allDocs
        .map((x) => toJSDate(x.createdAt))
        .filter((d): d is Date => d !== null);

      const uniqueDays = new Set(allDates.map((d) => d.toDateString())).size;

      const lastActivityDate =
        allDates.length > 0
          ? new Date(Math.max(...allDates.map((d) => d.getTime())))
          : null;

      setStats({
        totalEntries,
        daysActive: uniqueDays,
        joinedDate: joinedDate ? joinedDate.toISOString() : "",
        lastActivity: lastActivityDate ? lastActivityDate.toISOString() : "",
      });

      console.log('loadAccountStats: Stats set:', { totalEntries, daysActive: uniqueDays });
    } catch (error) {
      console.error("Error loading account stats:", error);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setLoading(true);
    try {
      await updateDoc(doc(db, "profiles", user.uid), {
        full_name: profile.full_name,
        date_of_birth: profile.date_of_birth ? profile.date_of_birth : null, // store null if empty
        updated_at: serverTimestamp(),
      });

      setEditing(false);
      await loadProfile();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          router.replace("/auth/login");
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <User color={theme.primary} size={48} />
          </View>
          <Text style={styles.userName}>{profile.full_name || "User"}</Text>
          <Text style={styles.userEmail}>{profile.email}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <BarChart3 color={theme.primary} size={20} />
            <Text style={styles.sectionTitle}>Account Summary</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.totalEntries}</Text>
              <Text style={styles.statLabel}>Total Entries</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.daysActive}</Text>
              <Text style={styles.statLabel}>Days Active</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Member Since</Text>
            <Text style={styles.infoValue}>
              {stats.joinedDate
                ? new Date(stats.joinedDate).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })
                : "-"}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Last Activity</Text>
            <Text style={styles.infoValue}>
              {stats.lastActivity
                ? new Date(stats.lastActivity).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
                : "No activity yet"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User color={theme.primary} size={20} />
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>

          <View style={styles.field}>
            <View style={styles.fieldIcon}>
              <User color="#666" size={20} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Full Name</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={profile.full_name}
                  onChangeText={(text) =>
                    setProfile({ ...profile, full_name: text })
                  }
                  placeholder="Enter your full name"
                  placeholderTextColor="#999"
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {profile.full_name || "Not set"}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.fieldIcon}>
              <Mail color="#666" size={20} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Email</Text>
              <Text style={styles.fieldValue}>{profile.email}</Text>
            </View>
          </View>

          <View style={styles.field}>
            <View style={styles.fieldIcon}>
              <Calendar color="#666" size={20} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={styles.fieldLabel}>Date of Birth</Text>
              {editing ? (
                <TextInput
                  style={styles.input}
                  value={profile.date_of_birth}
                  onChangeText={(text) =>
                    setProfile({ ...profile, date_of_birth: text })
                  }
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#999"
                />
              ) : (
                <Text style={styles.fieldValue}>
                  {profile.date_of_birth
                    ? new Date(profile.date_of_birth).toLocaleDateString(
                      "en-US",
                      {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      }
                    )
                    : "Not set"}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Bell color={theme.primary} size={20} />
            <Text style={styles.sectionTitle}>Notification Settings</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Daily Reminders</Text>
              <Text style={styles.settingDescription}>
                Get reminded to log your daily health entries
              </Text>
            </View>
            <Switch
              value={notifications.notify_daily_reminder}
              onValueChange={(value) =>
                updateNotificationPreference("notify_daily_reminder", value)
              }
              trackColor={{ false: "#d1d5db", true: theme.primaryLight }}
              thumbColor={
                notifications.notify_daily_reminder ? theme.primary : "#f4f3f4"
              }
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>New Messages</Text>
              <Text style={styles.settingDescription}>
                Notifications when you receive messages from providers
              </Text>
            </View>
            <Switch
              value={notifications.notify_messages}
              onValueChange={(value) =>
                updateNotificationPreference("notify_messages", value)
              }
              trackColor={{ false: "#d1d5db", true: theme.primaryLight }}
              thumbColor={
                notifications.notify_messages ? theme.primary : "#f4f3f4"
              }
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Health Insights</Text>
              <Text style={styles.settingDescription}>
                Receive personalized health tips and insights
              </Text>
            </View>
            <Switch
              value={notifications.notify_health_insights}
              onValueChange={(value) =>
                updateNotificationPreference("notify_health_insights", value)
              }
              trackColor={{ false: "#d1d5db", true: theme.primaryLight }}
              thumbColor={
                notifications.notify_health_insights ? theme.primary : "#f4f3f4"
              }
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={styles.settingTitle}>Activity Milestones</Text>
              <Text style={styles.settingDescription}>
                Celebrate your progress and achievements
              </Text>
            </View>
            <Switch
              value={notifications.notify_activity_milestones}
              onValueChange={(value) =>
                updateNotificationPreference("notify_activity_milestones", value)
              }
              trackColor={{ false: "#d1d5db", true: theme.primaryLight }}
              thumbColor={
                notifications.notify_activity_milestones ? theme.primary : "#f4f3f4"
              }
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Info color={theme.primary} size={20} />
            <Text style={styles.sectionTitle}>About</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Data Privacy</Text>
            <TouchableOpacity>
              <Text style={styles.linkText}>View Policy</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Terms of Service</Text>
            <TouchableOpacity>
              <Text style={styles.linkText}>View Terms</Text>
            </TouchableOpacity>
          </View>
        </View>

        {editing ? (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              disabled={loading}
            >
              <Save color="#fff" size={20} />
              <Text style={styles.buttonText}>
                {loading ? "Saving..." : "Save Changes"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setEditing(false);
                loadProfile();
              }}
              disabled={loading}
            >
              <Text style={[styles.buttonText, { color: "#666" }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.editButton]}
              onPress={() => setEditing(true)}
            >
              <Text style={styles.buttonText}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.signOutButton]}
              onPress={handleSignOut}
            >
              <LogOut color="#dc2626" size={20} />
              <Text style={[styles.buttonText, { color: "#dc2626" }]}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    padding: 24,
    paddingTop: 32,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  title: { fontSize: 32, fontWeight: "700", color: "#1a1a1a" },
  scrollView: { flex: 1 },
  avatarContainer: {
    alignItems: "center",
    paddingVertical: 32,
    backgroundColor: "#fff",
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  userEmail: { fontSize: 14, color: "#666" },
  section: { padding: 16, backgroundColor: "#fff", marginTop: 16 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  statsGrid: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statBox: {
    flex: 1,
    backgroundColor: "#f9fafb",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e5e5",
  },
  statValue: {
    fontSize: 28,
    fontWeight: "700",
    color: theme.primary,
    marginBottom: 4,
  },
  statLabel: { fontSize: 12, color: "#666", textAlign: "center" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoLabel: { fontSize: 14, color: "#666" },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#1a1a1a" },
  linkText: { fontSize: 14, fontWeight: "600", color: theme.primary },
  field: {
    flexDirection: "row",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  fieldIcon: { marginRight: 12, paddingTop: 2 },
  fieldContent: { flex: 1 },
  fieldLabel: { fontSize: 12, color: "#666", marginBottom: 4 },
  fieldValue: { fontSize: 16, color: "#1a1a1a" },
  input: {
    fontSize: 16,
    color: "#1a1a1a",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 8,
    backgroundColor: "#f9f9f9",
  },
  buttonContainer: { padding: 16, gap: 12 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    gap: 8,
  },
  editButton: { backgroundColor: theme.primary },
  saveButton: { backgroundColor: "#16a34a" },
  cancelButton: { backgroundColor: "#f3f4f6" },
  signOutButton: {
    backgroundColor: "#fee",
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  settingContent: { flex: 1, marginRight: 12 },
  settingTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  settingDescription: { fontSize: 13, color: "#666", lineHeight: 18 },
});
