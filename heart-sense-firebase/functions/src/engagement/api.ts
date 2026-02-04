/**
 * HTTP Callable Functions for Engagement API
 * These functions can be called directly from the frontend
 */

import {onCall, CallableRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {
  getOrCreateEngagementStats,
  recalculateWeeklyCount,
  recalculateMonthlyCount,
  getDateStringDaysAgo,
  createEngagementAlert,
} from "../utils/engagementUtils";
import {UserEngagementStats, EngagementAlert, UserMilestone} from "../types/engagement";

const db = admin.firestore();

/**
 * Get user's engagement stats
 * Callable from the frontend to display engagement metrics
 */
export const getEngagementStats = onCall(
  async (request: CallableRequest): Promise<{success: boolean; data?: UserEngagementStats; error?: string}> => {
    const auth = request.auth;
    if (!auth) {
      return {success: false, error: "Authentication required"};
    }

    const userId = auth.uid;

    try {
      const stats = await getOrCreateEngagementStats(userId);

      // Recalculate weekly and monthly counts for accuracy
      const weeklyCount = await recalculateWeeklyCount(userId);
      const monthlyCount = await recalculateMonthlyCount(userId);

      // Update if different
      if (weeklyCount !== stats.weeklyEntryCount || monthlyCount !== stats.monthlyEntryCount) {
        await db.collection("engagement_stats").doc(userId).update({
          weeklyEntryCount: weeklyCount,
          monthlyEntryCount: monthlyCount,
          updatedAt: Timestamp.now(),
        });
        stats.weeklyEntryCount = weeklyCount;
        stats.monthlyEntryCount = monthlyCount;
      }

      return {success: true, data: stats};
    } catch (error) {
      logger.error(`Error getting engagement stats: ${error}`);
      return {success: false, error: "Failed to get engagement stats"};
    }
  }
);

/**
 * Get user's engagement alerts
 * Returns unread and recent alerts for the user
 */
export const getEngagementAlerts = onCall(
  async (request: CallableRequest): Promise<{
    success: boolean;
    data?: {alerts: EngagementAlert[]; unreadCount: number};
    error?: string;
  }> => {
    const auth = request.auth;
    if (!auth) {
      return {success: false, error: "Authentication required"};
    }

    const userId = auth.uid;
    const limit = (request.data as {limit?: number})?.limit || 20;

    try {
      // Get recent alerts (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const alertsSnapshot = await db
        .collection("engagement_alerts")
        .where("userId", "==", userId)
        .where("createdAt", ">=", Timestamp.fromDate(sevenDaysAgo))
        .orderBy("createdAt", "desc")
        .limit(limit)
        .get();

      const alerts: EngagementAlert[] = [];
      let unreadCount = 0;

      alertsSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        const alert = {id: doc.id, ...doc.data()} as EngagementAlert;
        alerts.push(alert);
        if (!alert.read) {
          unreadCount++;
        }
      });

      return {success: true, data: {alerts, unreadCount}};
    } catch (error) {
      logger.error(`Error getting engagement alerts: ${error}`);
      return {success: false, error: "Failed to get engagement alerts"};
    }
  }
);

/**
 * Mark an engagement alert as read
 */
export const markAlertRead = onCall(
  async (request: CallableRequest): Promise<{success: boolean; error?: string}> => {
    const auth = request.auth;
    if (!auth) {
      return {success: false, error: "Authentication required"};
    }

    const alertId = (request.data as {alertId?: string})?.alertId;
    if (!alertId) {
      return {success: false, error: "Alert ID is required"};
    }

    try {
      const alertRef = db.collection("engagement_alerts").doc(alertId);
      const alertDoc = await alertRef.get();

      if (!alertDoc.exists) {
        return {success: false, error: "Alert not found"};
      }

      const alertData = alertDoc.data() as EngagementAlert;
      if (alertData.userId !== auth.uid) {
        return {success: false, error: "Unauthorized"};
      }

      await alertRef.update({read: true});
      return {success: true};
    } catch (error) {
      logger.error(`Error marking alert as read: ${error}`);
      return {success: false, error: "Failed to mark alert as read"};
    }
  }
);

/**
 * Mark all engagement alerts as read
 */
export const markAllAlertsRead = onCall(
  async (request: CallableRequest): Promise<{success: boolean; count?: number; error?: string}> => {
    const auth = request.auth;
    if (!auth) {
      return {success: false, error: "Authentication required"};
    }

    const userId = auth.uid;

    try {
      const unreadAlertsSnapshot = await db
        .collection("engagement_alerts")
        .where("userId", "==", userId)
        .where("read", "==", false)
        .get();

      const batch = db.batch();
      unreadAlertsSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        batch.update(doc.ref, {read: true});
      });

      await batch.commit();
      return {success: true, count: unreadAlertsSnapshot.size};
    } catch (error) {
      logger.error(`Error marking all alerts as read: ${error}`);
      return {success: false, error: "Failed to mark alerts as read"};
    }
  }
);

/**
 * Get user's achieved milestones
 */
export const getUserMilestones = onCall(
  async (request: CallableRequest): Promise<{
    success: boolean;
    data?: UserMilestone[];
    error?: string;
  }> => {
    const auth = request.auth;
    if (!auth) {
      return {success: false, error: "Authentication required"};
    }

    const userId = auth.uid;

    try {
      const milestonesSnapshot = await db
        .collection("user_milestones")
        .where("userId", "==", userId)
        .orderBy("achievedAt", "desc")
        .get();

      const milestones: UserMilestone[] = [];
      milestonesSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        milestones.push({id: doc.id, ...doc.data()} as UserMilestone);
      });

      return {success: true, data: milestones};
    } catch (error) {
      logger.error(`Error getting user milestones: ${error}`);
      return {success: false, error: "Failed to get milestones"};
    }
  }
);

/**
 * Get daily engagement history for a date range
 */
export const getDailyEngagementHistory = onCall(
  async (request: CallableRequest): Promise<{
    success: boolean;
    data?: {date: string; entryCount: number}[];
    error?: string;
  }> => {
    const auth = request.auth;
    if (!auth) {
      return {success: false, error: "Authentication required"};
    }

    const userId = auth.uid;
    const days = (request.data as {days?: number})?.days || 30;

    try {
      const startDate = getDateStringDaysAgo(days);

      const logsSnapshot = await db
        .collection("daily_engagement_logs")
        .where("userId", "==", userId)
        .where("date", ">=", startDate)
        .orderBy("date", "asc")
        .get();

      const history: {date: string; entryCount: number}[] = [];
      logsSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        const log = doc.data();
        history.push({
          date: log.date,
          entryCount: log.entryCount,
        });
      });

      return {success: true, data: history};
    } catch (error) {
      logger.error(`Error getting daily history: ${error}`);
      return {success: false, error: "Failed to get daily history"};
    }
  }
);

/**
 * Manually trigger engagement stats recalculation
 * Useful if stats get out of sync
 */
export const recalculateEngagementStats = onCall(
  async (request: CallableRequest): Promise<{success: boolean; data?: UserEngagementStats; error?: string}> => {
    const auth = request.auth;
    if (!auth) {
      return {success: false, error: "Authentication required"};
    }

    const userId = auth.uid;

    try {
      // Get all daily logs for user
      const logsSnapshot = await db
        .collection("daily_engagement_logs")
        .where("userId", "==", userId)
        .orderBy("date", "asc")
        .get();

      let totalEntriesLogged = 0;
      let totalDaysActive = 0;
      let lastActivityDate: string | null = null;

      logsSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        const log = doc.data();
        totalEntriesLogged += log.entryCount;
        totalDaysActive++;
        lastActivityDate = log.date;
      });

      // Update stats
      const weeklyCount = await recalculateWeeklyCount(userId);
      const monthlyCount = await recalculateMonthlyCount(userId);

      const updatedStats: Partial<UserEngagementStats> = {
        totalEntriesLogged,
        totalDaysActive,
        lastActivityDate,
        weeklyEntryCount: weeklyCount,
        monthlyEntryCount: monthlyCount,
        updatedAt: Timestamp.now(),
      };

      await db.collection("engagement_stats").doc(userId).set(
        updatedStats,
        {merge: true}
      );

      const finalStats = await getOrCreateEngagementStats(userId);
      return {success: true, data: finalStats};
    } catch (error) {
      logger.error(`Error recalculating engagement stats: ${error}`);
      return {success: false, error: "Failed to recalculate stats"};
    }
  }
);

/**
 * Dismiss an engagement alert
 * Permanently removes the alert for the user
 */
export const dismissAlert = onCall(
  async (request: CallableRequest): Promise<{success: boolean; error?: string}> => {
    const auth = request.auth;
    if (!auth) {
      return {success: false, error: "Authentication required"};
    }

    const alertId = (request.data as {alertId?: string})?.alertId;
    if (!alertId) {
      return {success: false, error: "Alert ID is required"};
    }

    try {
      const alertRef = db.collection("engagement_alerts").doc(alertId);
      const alertDoc = await alertRef.get();

      if (!alertDoc.exists) {
        return {success: false, error: "Alert not found"};
      }

      const alertData = alertDoc.data() as EngagementAlert;
      if (alertData.userId !== auth.uid) {
        return {success: false, error: "Unauthorized"};
      }

      await alertRef.delete();
      return {success: true};
    } catch (error) {
      logger.error(`Error dismissing alert: ${error}`);
      return {success: false, error: "Failed to dismiss alert"};
    }
  }
);

/**
 * Send a test notification (engagement alert) to the current user immediately.
 * Use this to verify that notifications appear in the app (e.g. Messages tab).
 */
export const sendTestNotificationNow = onCall(
  async (request: CallableRequest): Promise<{success: boolean; error?: string}> => {
    const auth = request.auth;
    if (!auth) {
      return {success: false, error: "Authentication required"};
    }

    try {
      await createEngagementAlert(
        auth.uid,
        "inactivity_warning",
        "Test notification",
        "This is a test. If you see this, the notification flow works!",
        "low",
        {type: "test_now"},
        24
      );
      return {success: true};
    } catch (error) {
      logger.error(`Error sending test notification: ${error}`);
      return {success: false, error: "Failed to send test notification"};
    }
  }
);

/**
 * Register current user to receive a test notification at 2:30 PM (Pacific).
 * Call this once from the app; the scheduled job will send one engagement alert at 2:30 PM.
 * Remove config after sending so it does not repeat every day.
 */
export const scheduleTestNotificationAt230 = onCall(
  async (request: CallableRequest): Promise<{success: boolean; error?: string}> => {
    const auth = request.auth;
    if (!auth) {
      return {success: false, error: "Authentication required"};
    }

    try {
      await db.collection("config").doc("test_notification").set({
        userId: auth.uid,
        scheduledFor: "2:30 PM America/Los_Angeles",
        createdAt: Timestamp.now(),
      });
      return {success: true};
    } catch (error) {
      logger.error(`Error scheduling test notification: ${error}`);
      return {success: false, error: "Failed to schedule test notification"};
    }
  }
);
