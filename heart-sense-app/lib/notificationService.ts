import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
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

// Register for push notifications
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

    token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log("Push notification token:", token);
  } else {
    // For simulator, we can still show local notifications
    console.log("Running on simulator - using local notifications only");
  }

  return token;
}

// Schedule a local notification immediately
export async function showLocalNotification(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<string> {
  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data,
      sound: true,
    },
    trigger: null, // null means show immediately
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
  const q = query(
    alertsRef,
    where("userId", "==", userId),
    where("isRead", "==", false),
    orderBy("createdAt", "desc"),
    limit(10)
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach(async (change) => {
      if (change.type === "added") {
        const alert = change.doc.data() as EngagementAlert;
        alert.id = change.doc.id;

        // Show local notification
        await showLocalNotification(alert.title, alert.message, {
          alertId: alert.id,
          alertType: alert.alertType,
        });

        // Mark as notified
        await updateDoc(doc(db, "engagement_alerts", change.doc.id), {
          notifiedAt: Timestamp.now(),
        });

        if (onAlert) {
          onAlert(alert);
        }
      }
    });
  });

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
