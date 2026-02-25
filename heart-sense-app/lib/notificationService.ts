import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { db } from "./firebase";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  Timestamp,
  updateDoc,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// Configure how notifications appear when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/** Get EAS project ID for Expo push token (required for push to work). */
function getExpoProjectId(): string | undefined {
  return (
    (Constants.expoConfig?.extra?.projectId as string | undefined)?.trim() ||
    (Constants.expoConfig?.extra?.eas?.projectId as string | undefined)?.trim() ||
    (Constants.easConfig?.projectId as string | undefined)?.trim()
  );
}

// Register for push notifications and return the token (so it can be saved to the backend).
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Failed to get push notification permissions");
      return null;
    }

    const projectId = getExpoProjectId();
    if (projectId) {
      const result = await Notifications.getExpoPushTokenAsync({ projectId });
      token = result.data;
    } else {
      token = (await Notifications.getExpoPushTokenAsync()).data;
    }
    console.log("Push notification token:", token ? `${token.slice(0, 30)}...` : null);
  } else {
    // For simulator, we can still show local notifications
    console.log("Running on simulator - using local notifications only");
  }

  return token;
}

/**
 * Save the device's Expo push token to Firestore so the backend can send push
 * notifications when the user is not in the app (e.g. engagement alerts).
 */
export async function savePushTokenToBackend(userId: string, token: string): Promise<void> {
  try {
    await setDoc(
      doc(db, "user_preferences", userId),
      {
        expo_push_token: token.trim(),
        expo_push_token_updated_at: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.warn("Failed to save push token to backend:", err);
  }
}

// Schedule a local notification immediately
export async function showLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<string> {
  // Request permissions first
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.log('Notification permissions not granted');
    return '';
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 1, // Show after 1 second (works better on simulator)
    },
  });

  return notificationId;
}

// Schedule a notification for a specific time
export async function scheduleNotification(
  title: string,
  body: string,
  triggerDate: Date,
  data?: Record<string, unknown>
): Promise<string> {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return notificationId;
}

// Listen to Firestore engagement_alerts and show notifications
export function subscribeToEngagementAlerts(
  userId: string,
  onAlert?: (alert: EngagementAlert) => void
): () => void {
  const alertsRef = collection(db, "engagement_alerts");

  // Use a simpler query first to debug - without orderBy to avoid index requirements
  // Note: The composite index is required for the full query with orderBy
  const q = query(
    alertsRef,
    where("userId", "==", userId),
    where("isRead", "==", false),
    limit(10)
  );

  console.log("Subscribing to engagement alerts for user:", userId);
  console.log("Query filters: userId ==", userId, ", isRead == false, limit 10 (no orderBy for debugging)");

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      console.log("Engagement alerts snapshot received:");
      console.log("  - Total docs in snapshot:", snapshot.docs.length);
      console.log("  - Number of changes:", snapshot.docChanges().length);
      console.log("  - From cache:", snapshot.metadata.fromCache);
      console.log("  - Has pending writes:", snapshot.metadata.hasPendingWrites);

      // Log all docs in snapshot for debugging
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        console.log("  - Doc:", doc.id, "userId:", data.userId, "isRead:", data.isRead, "title:", data.title);
      });

      // Log all changes
      snapshot.docChanges().forEach((change) => {
        console.log("  - Change type:", change.type, "doc:", change.doc.id);
      });

      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
          const alert = change.doc.data() as EngagementAlert;
          alert.id = change.doc.id;

          console.log("Processing new engagement alert:", alert.title, "id:", alert.id);

          try {
            // Show local notification
            console.log("Scheduling local notification...");
            const notifId = await showLocalNotification(alert.title, alert.message, {
              alertId: alert.id,
              alertType: alert.alertType,
            });
            console.log("Local notification scheduled, id:", notifId);

            // Mark as notified
            await updateDoc(doc(db, "engagement_alerts", change.doc.id), {
              notifiedAt: Timestamp.now(),
            });
            console.log("Alert marked as notified");

            if (onAlert) {
              onAlert(alert);
            }
          } catch (err) {
            console.error("Error processing engagement alert:", err);
          }
        }
      });
    },
    (error) => {
      console.error("Engagement alerts subscription error:", error);
      console.error("Error code:", (error as { code?: string }).code);
      console.error("You may need to create a composite index. Check the error message for a link.");
    }
  );

  return unsubscribe;
}

// Types
export interface EngagementAlert {
  id?: string;
  userId: string;
  alertType: string;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  isRead: boolean;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  metadata?: Record<string, unknown>;
}

// Cancel all scheduled notifications
export async function cancelAllNotifications(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// Get all pending notifications
export async function getPendingNotifications(): Promise<Notifications.NotificationRequest[]> {
  return await Notifications.getAllScheduledNotificationsAsync();
}

/**
 * Schedule a daily notification at 9am to remind user to log well-being and symptoms
 */
export async function scheduleDailyMorningCheckIn(): Promise<string> {
  // Request permissions first
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== 'granted') {
    console.log('Notification permissions not granted');
    return '';
  }

  // Cancel any existing daily check-in notifications to avoid duplicates
  const pending = await getPendingNotifications();
  for (const notif of pending) {
    if (notif.content.data?.type === 'daily-checkin') {
      await Notifications.cancelScheduledNotificationAsync(notif.identifier);
    }
  }

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: "Good morning! 🌅",
      body: "Time for your daily check-in. Log your well-being and any symptoms.",
      data: { type: 'daily-checkin' },
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: 9,
      minute: 0,
      repeats: true,
    },
  });

  console.log('Daily 9am check-in notification scheduled:', notificationId);
  return notificationId;
}
