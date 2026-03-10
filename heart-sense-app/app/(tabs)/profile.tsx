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
  Platform,
  Modal,
  Pressable,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
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
  Watch,
  Ruler,
  Scale,
  Pencil,
  Check,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  Moon,
  Type,
} from "lucide-react-native";
import { theme } from "@/theme/colors";
import { useTheme } from "@/contexts/ThemeContext";
import AppLogo from "@/components/AppLogo";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { sendPushNotificationCallable } from "@/lib/firebase";

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"] as const;

interface Profile {
  full_name: string;
  email: string;
  date_of_birth: string;
  gender: string;
  height_cm: string;
  weight_kg: string;
  apple_watch_consent: boolean;
}

interface AccountStats {
  totalEntries: number;
  daysActive: number;
  joinedDate: string; // ISO string
  lastActivity: string; // ISO string
}

interface NotificationPreferences {
  notify_daily_reminder: boolean;
  notify_health_insights: boolean;
  notify_activity_milestones: boolean;
  elevated_heart_rate_threshold_bpm: number;
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

/** Parse "YYYY-MM-DD" as local date (avoids UTC midnight shifting display by a day). */
function parseLocalDate(isoDateStr: string): Date | null {
  if (!isoDateStr) return null;
  const parts = isoDateStr.split("-").map(Number);
  const [y, m, d] = parts;
  if (y == null || m == null || d == null || parts.some(isNaN)) return null;
  const date = new Date(y, m - 1, d);
  return isNaN(date.getTime()) ? null : date;
}

const FONT_SIZES = [
  { label: 'Small', scale: 0.85 },
  { label: 'Medium', scale: 1.0 },
  { label: 'Large', scale: 1.2 },
] as const;

export default function ProfileScreen() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { isDark, toggleDarkMode, colors, fontScale, setFontScale, fs } = useTheme();

  const [profile, setProfile] = useState<Profile>({
    full_name: "",
    email: "",
    date_of_birth: "",
    gender: "",
    height_cm: "",
    weight_kg: "",
    apple_watch_consent: false,
  });

  const [stats, setStats] = useState<AccountStats>({
    totalEntries: 0,
    daysActive: 0,
    joinedDate: "",
    lastActivity: "",
  });

  const [notifications, setNotifications] = useState<NotificationPreferences>({
    notify_daily_reminder: true,
    notify_health_insights: true,
    notify_activity_milestones: true,
    elevated_heart_rate_threshold_bpm: 100,
  });

  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingElevatedHrThreshold, setEditingElevatedHrThreshold] = useState(false);
  const [elevatedHrThreshold, setElevatedHrThreshold] = useState(100);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [infoModal, setInfoModal] = useState<{
    visible: boolean;
    title: string;
    content: string;
  }>({ visible: false, title: "", content: "" });
  const [devSectionExpanded, setDevSectionExpanded] = useState(false);
  const [testingNotification, setTestingNotification] = useState(false);

  const defaultDobDate = (() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() - 25);
    return d;
  })();
  const dobDate = (() => {
    const d = parseLocalDate(profile.date_of_birth);
    return d ?? defaultDobDate;
  })();

  const onDobPickerChange = (
    event: { type: string },
    date?: Date
  ) => {
    if (Platform.OS === "android") setShowDobPicker(false);
    if (event.type !== "dismissed" && date) {
      const yyyy = date.getUTCFullYear();
      const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
      const dd = String(date.getUTCDate()).padStart(2, "0");
      setProfile((prev) => ({ ...prev, date_of_birth: `${yyyy}-${mm}-${dd}` }));
    }
  };

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
          gender: (data.gender as string) || "",
          height_cm: data.height_cm != null ? String(data.height_cm) : "",
          weight_kg: data.weight_kg != null ? String(data.weight_kg) : "",
          apple_watch_consent: !!data.apple_watch_consent,
        });
      } else {
        setProfile({
          full_name: "",
          email: user.email || "",
          date_of_birth: "",
          gender: "",
          height_cm: "",
          weight_kg: "",
          apple_watch_consent: false,
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
          notify_health_insights: !!data.notify_health_insights,
          notify_activity_milestones: !!data.notify_activity_milestones,
          elevated_heart_rate_threshold_bpm:
            typeof data.elevated_heart_rate_threshold_bpm === 'number'
              ? Math.max(60, Math.min(200, data.elevated_heart_rate_threshold_bpm))
              : 100,
        });
        setElevatedHrThreshold(data.elevated_heart_rate_threshold_bpm);
      } else {
        // create defaults
        const defaults: NotificationPreferences = {
          notify_daily_reminder: true,
          notify_health_insights: true,
          notify_activity_milestones: true,
          elevated_heart_rate_threshold_bpm: 100,
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
    value: boolean | number
  ) => {
    if (!user) return;

    const prev = notifications;
    const updatedPrefs = { ...notifications, [key]: value };
    setNotifications(updatedPrefs);

    try {
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

    const heightNum = profile.height_cm ? parseFloat(profile.height_cm) : null;
    const weightNum = profile.weight_kg ? parseFloat(profile.weight_kg) : null;
    if (profile.height_cm && (isNaN(heightNum!) || heightNum! <= 0 || heightNum! > 300)) {
      Alert.alert("Invalid input", "Please enter a valid height in cm (1–300).");
      return;
    }
    if (profile.weight_kg && (isNaN(weightNum!) || weightNum! <= 0 || weightNum! > 500)) {
      Alert.alert("Invalid input", "Please enter a valid weight in kg (1–500).");
      return;
    }

    setLoading(true);
    try {
      await updateDoc(doc(db, "profiles", user.uid), {
        full_name: profile.full_name,
        date_of_birth: profile.date_of_birth || null,
        gender: profile.gender || null,
        height_cm: heightNum ?? null,
        weight_kg: weightNum ?? null,
        updated_at: serverTimestamp(),
      });

      setEditing(false);
      setShowDobPicker(false);
      await loadProfile();
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleElevatedHrThresholdChange = (text: string) => {
    if (text.trim() === '') {
      setElevatedHrThreshold(0);
      return;
    }
    const n = parseInt(text, 10);
    setElevatedHrThreshold(Number.isNaN(n) ? 0 : n);
  };

  const handleSaveElevatedHrThreshold = async () => {
    if (!user) return;
    if (elevatedHrThreshold < 60 || elevatedHrThreshold > 200) {
      Alert.alert("Invalid input", "Please enter a valid heart rate threshold between 60 and 200 bpm.");
      return;
    }
    await updateNotificationPreference("elevated_heart_rate_threshold_bpm", elevatedHrThreshold);
    setEditingElevatedHrThreshold(false);
  };

  const openInfoModal = (title: string, content: string) => {
    setInfoModal({ visible: true, title, content });
  };

  const closeInfoModal = () => {
    setInfoModal((prev) => ({ ...prev, visible: false }));
  };

  const DATA_PRIVACY_CONTENT =
    "How your data is shared:\n\n" +
    "• Your profile information, health logs (symptoms, activities, wellbeing ratings), and wearable data are stored securely.\n\n" +
    "• This data is accessible to the Heart Sense research team for the purposes of the clinical study.\n\n" +
    "• The research team uses your data solely for study analysis and does not share it with third parties for marketing or commercial purposes.";

  const TERMS_CONTENT =
    "If you have any concerns about your participation, data, or the study:\n\n" +
    "• Please contact the research team directly. They handle all participant inquiries and concerns.\n\n" +
    "• By participating, you have consented to: logging wellbeing daily, sharing your logged data (symptoms, activities, wellbeing ratings), and sharing Apple Watch data (heart rate, accelerometer, step count) if you opted in.\n\n" +
    "• The research team will address any questions about what you have consented to.";

  const APPLE_WATCH_CONTENT =
    "Apple Watch Data Collection:\n\n" +
    "When you consented during onboarding, the app collects the following from your Apple Watch:\n\n" +
    "• Heart rate\n" +
    "• Accelerometer data\n" +
    "• Step count\n\n" +
    "This data is shared with the research team for the Heart Sense clinical study.";

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

  const triggerTestDailyReminder = async () => {
    if (!user || testingNotification) return;
    setTestingNotification(true);
    try {
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));

      await setDoc(doc(collection(db, "engagement_alerts")), {
        userId: user.uid,
        alertType: "daily_reminder",
        title: "Good morning! 🌅",
        message: "Time for your daily check-in. Log your well-being and any symptoms.",
        priority: "low",
        isRead: false,
        isDismissed: false,
        createdAt: now,
        expiresAt,
        metadata: { test: true },
      });

      Alert.alert("Success", "Daily reminder notification triggered! Check your notifications.");
    } catch (error) {
      console.error("Error triggering daily reminder:", error);
      Alert.alert("Error", "Failed to trigger daily reminder notification.");
    } finally {
      setTestingNotification(false);
    }
  };

  const triggerTestInactivityAlert = async () => {
    if (!user || testingNotification) return;
    setTestingNotification(true);
    try {
      const now = Timestamp.now();
      const expiresAt = Timestamp.fromDate(new Date(Date.now() + 72 * 60 * 60 * 1000));

      await setDoc(doc(collection(db, "engagement_alerts")), {
        userId: user.uid,
        alertType: "inactivity_warning",
        title: "We Miss You! It's been 3 days",
        message: "Even a quick check-in helps track your health journey.",
        priority: "medium",
        isRead: false,
        isDismissed: false,
        createdAt: now,
        expiresAt,
        metadata: { daysInactive: 3, test: true },
      });

      Alert.alert("Success", "Inactivity alert notification triggered! Check your notifications.");
    } catch (error) {
      console.error("Error triggering inactivity alert:", error);
      Alert.alert("Error", "Failed to trigger inactivity alert notification.");
    } finally {
      setTestingNotification(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Modal
        visible={infoModal.visible}
        transparent
        animationType="fade"
        onRequestClose={closeInfoModal}
      >
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.overlay }]} onPress={closeInfoModal}>
          <Pressable style={[styles.modalContent, { backgroundColor: colors.modalBg }]} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text, fontSize: fs(18) }]}>{infoModal.title}</Text>
              <TouchableOpacity onPress={closeInfoModal} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={[styles.modalClose, { color: colors.textSecondary }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalScroll}
              contentContainerStyle={styles.modalScrollContent}
              showsVerticalScrollIndicator={true}
            >
              <Text style={[styles.modalBody, { color: colors.text, fontSize: fs(15) }]}>{infoModal.content}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalButton} onPress={closeInfoModal}>
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      <View style={[styles.header, { backgroundColor: isDark ? colors.surface : theme.primary }]}>
        <AppLogo size="small" showTitle={true} variant="light" />
        <Text style={[styles.title, { fontSize: fs(26) }]}>Profile</Text>
      </View>

      <ScrollView style={styles.scrollView}>
        <View style={[styles.avatarContainer, { backgroundColor: colors.surface }]}>
          <View style={styles.avatar}>
            <User color={theme.primary} size={48} />
          </View>
          <Text style={[styles.userName, { color: colors.text, fontSize: fs(24) }]}>{profile.full_name || "User"}</Text>
          <Text style={[styles.userEmail, { color: colors.textSecondary, fontSize: fs(14) }]}>{profile.email}</Text>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <BarChart3 color={theme.primary} size={20} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fs(16) }]}>Account Summary</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={[styles.statBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { fontSize: fs(28) }]}>{stats.totalEntries}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: fs(12) }]}>Total Entries</Text>
            </View>
            <View style={[styles.statBox, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Text style={[styles.statValue, { fontSize: fs(28) }]}>{stats.daysActive}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary, fontSize: fs(12) }]}>Days Active</Text>
            </View>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary, fontSize: fs(14) }]}>Member Since</Text>
            <Text style={[styles.infoValue, { color: colors.text, fontSize: fs(14) }]}>
              {stats.joinedDate
                ? new Date(stats.joinedDate).toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })
                : "-"}
            </Text>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary, fontSize: fs(14) }]}>Last Activity</Text>
            <Text style={[styles.infoValue, { color: colors.text, fontSize: fs(14) }]}>
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

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <User color={theme.primary} size={20} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fs(16) }]}>Personal Information</Text>
          </View>

          <View style={[styles.field, { borderBottomColor: colors.border }]}>
            <View style={styles.fieldIcon}>
              <User color={colors.textSecondary} size={20} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: fs(12) }]}>Full Name</Text>
              {editing ? (
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                  value={profile.full_name}
                  onChangeText={(text) =>
                    setProfile({ ...profile, full_name: text })
                  }
                  placeholder="Enter your full name"
                  placeholderTextColor={colors.textTertiary}
                />
              ) : (
                <Text style={[styles.fieldValue, { color: colors.text, fontSize: fs(16) }]}>
                  {profile.full_name || "Not set"}
                </Text>
              )}
            </View>
          </View>

          <View style={[styles.field, { borderBottomColor: colors.border }]}>
            <View style={styles.fieldIcon}>
              <Mail color={colors.textSecondary} size={20} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: fs(12) }]}>Email</Text>
              <Text style={[styles.fieldValue, { color: colors.text, fontSize: fs(16) }]}>{profile.email}</Text>
            </View>
          </View>

          <View style={[styles.field, { borderBottomColor: colors.border }]}>
            <View style={styles.fieldIcon}>
              <Calendar color={colors.textSecondary} size={20} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: fs(12) }]}>Date of Birth</Text>
              {editing ? (
                <>
                  <TouchableOpacity
                    style={styles.input}
                    onPress={() => setShowDobPicker(true)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={
                        profile.date_of_birth
                          ? [styles.fieldValue, { color: colors.text, fontSize: fs(16) }]
                          : [styles.inputPlaceholder, { color: colors.textTertiary, fontSize: fs(16) }]
                      }
                    >
                      {profile.date_of_birth
                        ? (parseLocalDate(profile.date_of_birth) ?? new Date()).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                        : "Tap to select date"}
                    </Text>
                  </TouchableOpacity>
                  {showDobPicker && (
                    <View style={styles.dateTimePickerWrapper}>
                      <DateTimePicker
                        value={dobDate}
                        mode="date"
                        display={Platform.OS === "ios" ? "spinner" : "default"}
                        onChange={onDobPickerChange}
                        maximumDate={new Date()}
                        minimumDate={
                          new Date(new Date().setFullYear(new Date().getFullYear() - 120))
                        }
                        textColor={isDark ? "#ffffff" : "#000000"}
                        accentColor={isDark ? theme.primaryLight : "#000000"}
                        style={styles.dateTimePicker}
                      />
                    </View>
                  )}
                  {Platform.OS === "ios" && showDobPicker && (
                    <TouchableOpacity
                      style={styles.donePickerButton}
                      onPress={() => setShowDobPicker(false)}
                    >
                      <Text style={styles.donePickerText}>Done</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                <Text style={[styles.fieldValue, { color: colors.text, fontSize: fs(16) }]}>
                  {profile.date_of_birth
                    ? (parseLocalDate(profile.date_of_birth) ?? new Date()).toLocaleDateString(
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

          <View style={[styles.field, { borderBottomColor: colors.border }]}>
            <View style={styles.fieldIcon}>
              <User color={colors.textSecondary} size={20} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: fs(12) }]}>Gender</Text>
              {editing ? (
                <View style={styles.genderRow}>
                  {GENDER_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.genderOption,
                        profile.gender === opt && styles.genderOptionSelected,
                      ]}
                      onPress={() => setProfile((p) => ({ ...p, gender: opt }))}
                    >
                      <Text
                        style={[
                          styles.genderOptionText,
                          profile.gender === opt && styles.genderOptionTextSelected,
                          { color: profile.gender === opt ? theme.primary : colors.text },
                        ]}
                      >
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={[styles.fieldValue, { color: colors.text, fontSize: fs(16) }]}>
                  {profile.gender || "Not set"}
                </Text>
              )}
            </View>
          </View>

          <View style={[styles.field, { borderBottomColor: colors.border }]}>
            <View style={styles.fieldIcon}>
              <Ruler color={colors.textSecondary} size={20} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: fs(12) }]}>Height (cm)</Text>
              {editing ? (
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                  value={profile.height_cm}
                  onChangeText={(text) =>
                    setProfile((p) => ({ ...p, height_cm: text }))
                  }
                  placeholder="e.g. 170"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textTertiary}
                />
              ) : (
                <Text style={[styles.fieldValue, { color: colors.text, fontSize: fs(16) }]}>
                  {profile.height_cm ? `${profile.height_cm} cm` : "Not set"}
                </Text>
              )}
            </View>
          </View>

          <View style={[styles.field, { borderBottomColor: colors.border }]}>
            <View style={styles.fieldIcon}>
              <Scale color={colors.textSecondary} size={20} />
            </View>
            <View style={styles.fieldContent}>
              <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: fs(12) }]}>Weight (kg)</Text>
              {editing ? (
                <TextInput
                  style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.inputBg }]}
                  value={profile.weight_kg}
                  onChangeText={(text) =>
                    setProfile((p) => ({ ...p, weight_kg: text }))
                  }
                  placeholder="e.g. 70"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textTertiary}
                />
              ) : (
                <Text style={[styles.fieldValue, { color: colors.text, fontSize: fs(16) }]}>
                  {profile.weight_kg ? `${profile.weight_kg} kg` : "Not set"}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Bell color={theme.primary} size={20} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fs(16) }]}>Notification Settings</Text>
          </View>

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, { color: colors.text, fontSize: fs(15) }]}>Daily Reminders</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary, fontSize: fs(13) }]}>
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

          <View style={[styles.settingRow, { borderBottomColor: colors.border }]}>
            <View style={styles.settingContent}>
              <View style={styles.settingTitleRow}>
                <Text style={[styles.settingTitle, { color: colors.text, fontSize: fs(15) }]}>Elevated Heart Rate</Text>
                {editingElevatedHrThreshold ? (
                  <TouchableOpacity
                    style={[
                      styles.settingTitleEditButton,
                      { backgroundColor: theme.primaryLight, borderRadius: 5, padding: 2, paddingBottom: 2 }
                    ]}
                    onPress={handleSaveElevatedHrThreshold}
                  >
                    <Check color={theme.primary} size={20} />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.settingTitleEditButton}
                    onPress={() => setEditingElevatedHrThreshold(true)}
                  >
                    <Pencil color={theme.primary} size={20} />
                  </TouchableOpacity>
                )}
              </View>
              <Text style={[styles.settingDescription, { color: colors.textSecondary, fontSize: fs(13) }]}>
                You'll be notified when an elevated heart rate is detected so you can log a symptom.
              </Text>
              <View style={styles.settingRowContent}>
                <Text style={[styles.settingLabel, { color: colors.text, fontSize: fs(14) }]}>Notify when at or above (bpm): </Text>
                {editingElevatedHrThreshold ? (
                  <TextInput
                    style={styles.thresholdInput}
                    value={elevatedHrThreshold.toString()}
                    onChangeText={(text) => handleElevatedHrThresholdChange(text)}
                    keyboardType="number-pad"
                    maxLength={3}
                    placeholder="100"
                  />
                ) : (
                  <Text style={styles.settingValue}>{notifications.elevated_heart_rate_threshold_bpm}</Text>

                )}
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Moon color={theme.primary} size={20} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fs(16) }]}>Appearance</Text>
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingContent}>
              <Text style={[styles.settingTitle, { color: colors.text, fontSize: fs(15) }]}>Dark Mode</Text>
              <Text style={[styles.settingDescription, { color: colors.textSecondary, fontSize: fs(13) }]}>
                Switch to a darker color scheme
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleDarkMode}
              trackColor={{ false: "#d1d5db", true: theme.primaryLight }}
              thumbColor={isDark ? theme.primary : "#f4f3f4"}
            />
          </View>

          <View style={{ paddingVertical: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 }}>
              <Type color={colors.textSecondary} size={18} />
              <Text style={[styles.settingTitle, { color: colors.text, fontSize: fs(15), marginBottom: 0 }]}>Font Size</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {FONT_SIZES.map((size) => (
                <TouchableOpacity
                  key={size.label}
                  style={[
                    styles.fontSizeButton,
                    { borderColor: colors.border, backgroundColor: colors.inputBg },
                    fontScale === size.scale && styles.fontSizeButtonActive,
                  ]}
                  onPress={() => setFontScale(size.scale)}
                >
                  <Text
                    style={[
                      styles.fontSizeButtonText,
                      { fontSize: 14 * size.scale, color: colors.textSecondary },
                      fontScale === size.scale && styles.fontSizeButtonTextActive,
                    ]}
                  >
                    {size.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={[styles.settingDescription, { color: colors.textSecondary, fontSize: fs(13), marginTop: 8 }]}>
              Adjusts text size across the app
            </Text>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Info color={theme.primary} size={20} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fs(16) }]}>About</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary, fontSize: fs(14) }]}>Data Privacy</Text>
            <TouchableOpacity onPress={() => openInfoModal("Data Privacy", DATA_PRIVACY_CONTENT)}>
              <Text style={styles.linkText}>View Policy</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary, fontSize: fs(14) }]}>Terms of Service</Text>
            <TouchableOpacity onPress={() => openInfoModal("Terms of Service", TERMS_CONTENT)}>
              <Text style={styles.linkText}>View Terms</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <View style={styles.sectionHeader}>
            <Watch color={theme.primary} size={20} />
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: fs(16) }]}>Apple Watch Data</Text>
          </View>
          <View
            style={[
              styles.appleWatchStatus,
              !profile.apple_watch_consent && styles.appleWatchStatusOff,
            ]}
          >
            <Text
              style={[
                styles.appleWatchStatusText,
                !profile.apple_watch_consent && styles.appleWatchStatusTextOff,
              ]}
            >
              {profile.apple_watch_consent
                ? "You have consented to sharing Apple Watch data."
                : "You have not consented to sharing Apple Watch data."}
            </Text>
          </View>
          <View style={[styles.infoRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.infoLabel, { color: colors.textSecondary, fontSize: fs(14) }]}>Apple Watch data collection</Text>
            <TouchableOpacity onPress={() => openInfoModal("Apple Watch Data", APPLE_WATCH_CONTENT)}>
              <Text style={styles.linkText}>View Info</Text>
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
                setShowDobPicker(false);
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
              <Text style={[styles.buttonText, { fontSize: fs(16) }]}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.signOutButton]}
              onPress={handleSignOut}
            >
              <LogOut color="#dc2626" size={20} />
              <Text style={[styles.buttonText, { color: "#dc2626", fontSize: fs(16) }]}>
                Sign Out
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Developer Testing Section */}
        <View style={styles.devSection}>
          <TouchableOpacity
            style={styles.devSectionHeader}
            onPress={() => setDevSectionExpanded(!devSectionExpanded)}
            activeOpacity={0.7}
          >
            <View style={styles.devSectionHeaderLeft}>
              <FlaskConical color="#9ca3af" size={16} />
              <Text style={styles.devSectionTitle}>Developer Testing</Text>
            </View>
            {devSectionExpanded ? (
              <ChevronUp color="#9ca3af" size={18} />
            ) : (
              <ChevronDown color="#9ca3af" size={18} />
            )}
          </TouchableOpacity>

          {devSectionExpanded && (
            <View style={styles.devSectionContent}>
              <Text style={styles.devSectionDescription}>
                Test push notifications. Make sure you have notification permissions enabled.
              </Text>

              <TouchableOpacity
                style={[styles.devButton, testingNotification && styles.devButtonDisabled]}
                onPress={triggerTestDailyReminder}
                disabled={testingNotification}
              >
                <Bell color="#6b7280" size={16} />
                <Text style={styles.devButtonText}>
                  {testingNotification ? "Sending..." : "Test Daily Check-in Notification"}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.devButton, testingNotification && styles.devButtonDisabled]}
                onPress={triggerTestInactivityAlert}
                disabled={testingNotification}
              >
                <Bell color="#6b7280" size={16} />
                <Text style={styles.devButtonText}>
                  {testingNotification ? "Sending..." : "Test Inactivity Alert Notification"}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: {
    padding: 24,
    paddingTop: 20,
    paddingBottom: 20,
    backgroundColor: theme.primary,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: { fontSize: 26, fontWeight: "700", color: "#fff", flex: 1, textAlign: 'right' },
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
    alignItems: "flex-start",
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  fieldIcon: {
    width: 28,
    marginRight: 12,
    paddingTop: 2,
  },
  fieldContent: { flex: 1, minWidth: 0 },
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
  inputPlaceholder: { fontSize: 16, color: "#999" },
  genderRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genderOption: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  genderOptionSelected: {
    backgroundColor: theme.primaryLight,
    borderColor: theme.primary,
  },
  genderOptionText: {
    fontSize: 14,
    color: "#374151",
  },
  genderOptionTextSelected: {
    color: theme.primary,
    fontWeight: "600",
  },
  dateTimePickerWrapper: {
    height: 216,
    width: "100%",
    marginVertical: 8,
  },
  dateTimePicker: {
    height: 216,
    width: "100%",
  },
  donePickerButton: { alignItems: "center", paddingVertical: 12 },
  donePickerText: { fontSize: 16, color: theme.primary, fontWeight: "600" },
  appleWatchStatus: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#86efac",
  },
  appleWatchStatusText: {
    fontSize: 14,
    color: "#166534",
    fontWeight: "500",
  },
  appleWatchStatusOff: {
    backgroundColor: "#f3f4f6",
    borderColor: "#e5e7eb",
  },
  appleWatchStatusTextOff: {
    color: "#6b7280",
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
  thresholdInput: {
    width: 56,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 16,
    textAlign: "center",
  },
  testNotificationButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: theme.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginTop: 16,
  },
  testNotificationButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "100%",
    maxWidth: 400,
    height: "85%",
    maxHeight: 600,
    overflow: "hidden",
    flexDirection: "column",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  modalClose: {
    fontSize: 20,
    color: "#666",
    fontWeight: "400",
  },
  modalScroll: {
    flex: 1,
    minHeight: 0,
  },
  modalScrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  modalBody: {
    fontSize: 15,
    color: "#374151",
    lineHeight: 24,
  },
  modalButton: {
    margin: 20,
    padding: 16,
    backgroundColor: theme.primary,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  settingTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingTitleEditButton: {
    paddingBottom: 8,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  settingRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  settingValue: {
    fontSize: 14,
    color: theme.primary,
    fontWeight: "600",
  },
  devSection: {
    marginTop: 24,
    marginHorizontal: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    borderStyle: "dashed",
    backgroundColor: "#fafafa",
  },
  devSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  devSectionHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  devSectionTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#9ca3af",
  },
  devSectionContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 10,
  },
  devSectionDescription: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 4,
  },
  devButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#f3f4f6",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  devButtonDisabled: {
    opacity: 0.5,
  },
  devButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6b7280",
  },
  fontSizeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  fontSizeButtonActive: {
    backgroundColor: theme.primaryLight,
    borderColor: theme.primary,
  },
  fontSizeButtonText: {
    fontWeight: "500",
  },
  fontSizeButtonTextActive: {
    color: theme.primary,
    fontWeight: "700",
  },
});
