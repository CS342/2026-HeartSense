/**
 * Scheduled Functions for Engagement
 * Runs on a schedule to send reminders, check for inactivity, and generate insights
 */

import {onSchedule} from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {Timestamp, WriteBatch} from "firebase-admin/firestore";
import {
  getInactiveUsers,
  createEngagementAlert,
  getUserNotificationPreferences,
  getTodayDateString,
} from "../utils/engagementUtils";
import {DEFAULT_ENGAGEMENT_CONFIG, UserEngagementStats} from "../types/engagement";

const db = admin.firestore();

/**
 * Scheduled: Daily Reminder Check (runs every day at 9 AM)
 * Sends daily reminders to users who have opted in
 */
export const dailyReminderCheck = onSchedule(
  {
    schedule: "0 9 * * *", // Every day at 9 AM
    timeZone: "America/Los_Angeles",
  },
  async () => {
    logger.info("Running daily reminder check");
    const today = getTodayDateString();

    try {
      // Get all users with daily reminder enabled
      const prefsSnapshot = await db
        .collection("user_preferences")
        .where("notify_daily_reminder", "==", true)
        .get();

      let remindersCreated = 0;

      for (const prefDoc of prefsSnapshot.docs) {
        const userId = prefDoc.id;

        // Check if user has already logged today
        const statsDoc = await db
          .collection("engagement_stats")
          .doc(userId)
          .get();

        if (statsDoc.exists) {
          const stats = statsDoc.data() as UserEngagementStats;
          if (stats.lastActivityDate === today) {
            // User already logged today, no reminder needed
            continue;
          }
        }

        // Check if we already sent a reminder today
        const todayStart = new Date(today + "T00:00:00");
        const existingReminder = await db
          .collection("engagement_alerts")
          .where("userId", "==", userId)
          .where("alertType", "==", "inactivity_warning")
          .where("createdAt", ">=", Timestamp.fromDate(todayStart))
          .limit(1)
          .get();

        if (!existingReminder.empty) {
          continue; // Already reminded today
        }

        // Create daily reminder alert
        await createEngagementAlert(
          userId,
          "inactivity_warning",
          "Daily Health Check-in",
          "Take a moment to log how you're feeling today. " +
          "Regular tracking helps you and your healthcare team spot patterns.",
          "low",
          {type: "daily_reminder"},
          24 // Expires in 24 hours
        );

        remindersCreated++;
      }

      logger.info(`Daily reminder check complete. Created ${remindersCreated} reminders.`);
    } catch (error) {
      logger.error(`Error in daily reminder check: ${error}`);
    }
  }
);

/**
 * Scheduled: Inactivity Alert Check (runs every day at 6 PM)
 * Alerts users who haven't logged in X days
 */
export const inactivityAlertCheck = onSchedule(
  {
    schedule: "0 18 * * *", // Every day at 6 PM
    timeZone: "America/Los_Angeles",
  },
  async () => {
    logger.info("Running inactivity alert check");

    try {
      const inactiveUsers = await getInactiveUsers(
        DEFAULT_ENGAGEMENT_CONFIG.inactivityThresholdDays
      );

      let alertsCreated = 0;

      for (const user of inactiveUsers) {
        // Check user preferences
        const prefs = await getUserNotificationPreferences(user.userId);
        if (prefs?.notify_daily_reminder === false) {
          continue; // User doesn't want reminders
        }

        // Check if we already sent an inactivity alert recently
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentAlert = await db
          .collection("engagement_alerts")
          .where("userId", "==", user.userId)
          .where("alertType", "==", "inactivity_warning")
          .where("createdAt", ">=", Timestamp.fromDate(oneDayAgo))
          .limit(1)
          .get();

        if (!recentAlert.empty) {
          continue; // Already alerted recently
        }

        // Calculate days inactive
        const lastActive = user.lastActivityDate ?
          new Date(user.lastActivityDate) :
          null;
        const daysInactive = lastActive ?
          Math.floor((Date.now() - lastActive.getTime()) / (24 * 60 * 60 * 1000)) :
          0;

        if (daysInactive < DEFAULT_ENGAGEMENT_CONFIG.inactivityThresholdDays) {
          continue;
        }

        // Create inactivity alert
        await createEngagementAlert(
          user.userId,
          "inactivity_warning",
          "We Miss You!",
          `It's been ${daysInactive} days since your last health log. ` +
          "Even a quick check-in helps track your health journey.",
          "medium",
          {daysInactive, lastActivityDate: user.lastActivityDate},
          48 // Expires in 48 hours
        );

        alertsCreated++;
      }

      logger.info(`Inactivity check complete. Created ${alertsCreated} alerts.`);
    } catch (error) {
      logger.error(`Error in inactivity alert check: ${error}`);
    }
  }
);

/**
 * Scheduled: Cleanup Expired Alerts (runs every day at 3 AM)
 * Removes expired engagement alerts to keep the database clean
 */
export const cleanupExpiredAlerts = onSchedule(
  {
    schedule: "0 3 * * *", // Every day at 3 AM
    timeZone: "America/Los_Angeles",
  },
  async () => {
    logger.info("Running expired alerts cleanup");

    try {
      const now = Timestamp.now();

      // Find expired alerts
      const expiredAlertsSnapshot = await db
        .collection("engagement_alerts")
        .where("expiresAt", "<=", now)
        .get();

      // Delete in batches
      const batchSize = 500;
      let deletedCount = 0;

      const batches: WriteBatch[] = [];
      let currentBatch = db.batch();
      let operationCount = 0;

      expiredAlertsSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        currentBatch.delete(doc.ref);
        operationCount++;
        deletedCount++;

        if (operationCount >= batchSize) {
          batches.push(currentBatch);
          currentBatch = db.batch();
          operationCount = 0;
        }
      });

      if (operationCount > 0) {
        batches.push(currentBatch);
      }

      // Execute all batches
      await Promise.all(batches.map((batch) => batch.commit()));

      logger.info(`Cleanup complete. Deleted ${deletedCount} expired alerts.`);
    } catch (error) {
      logger.error(`Error in expired alerts cleanup: ${error}`);
    }
  }
);

/**
 * Scheduled: Monthly Stats Reset (runs on 1st of each month at 1 AM)
 * Resets monthly counters and generates monthly insights
 */
export const monthlyStatsReset = onSchedule(
  {
    schedule: "0 1 1 * *", // 1st of each month at 1 AM
    timeZone: "America/Los_Angeles",
  },
  async () => {
    logger.info("Running monthly stats reset");

    try {
      const statsSnapshot = await db.collection("engagement_stats").get();

      let updatedCount = 0;

      for (const statsDoc of statsSnapshot.docs) {
        const stats = statsDoc.data() as UserEngagementStats;

        // Create monthly summary before reset
        const prefs = await getUserNotificationPreferences(stats.userId);
        if (prefs?.notify_health_insights !== false) {
          await createEngagementAlert(
            stats.userId,
            "health_insight",
            "Monthly Health Recap",
            `Last month you logged ${stats.monthlyEntryCount} entries ` +
            `across ${stats.totalDaysActive} active days. ` +
            "Keep up the great work this month!",
            "low",
            {
              monthlyEntryCount: stats.monthlyEntryCount,
              totalDaysActive: stats.totalDaysActive,
            },
            168 // Expires in 1 week
          );
        }

        // Reset monthly counter (keep other stats)
        await statsDoc.ref.update({
          monthlyEntryCount: 0,
          updatedAt: Timestamp.now(),
        });

        updatedCount++;
      }

      logger.info(`Monthly reset complete. Updated ${updatedCount} users.`);
    } catch (error) {
      logger.error(`Error in monthly stats reset: ${error}`);
    }
  }
);

/**
 * Scheduled: Health Data Sync Check (runs once daily at 10 AM)
 * Alerts users if their Apple Watch/Health data hasn't synced in over 24 hours
 * Since health data syncs once per day on app launch, this checks if
 * the daily sync was missed.
 */
export const healthSyncCheck = onSchedule(
  {
    schedule: "0 10 * * *", // Every day at 10 AM
    timeZone: "America/Los_Angeles",
  },
  async () => {
    logger.info("Running daily health data sync check");

    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Get all users with health data
      const usersSnapshot = await db.collection("profiles").get();

      let alertsCreated = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;

        // Check user preferences - only alert if they want notifications
        const prefs = await getUserNotificationPreferences(userId);
        if (prefs?.notify_health_insights === false) {
          continue;
        }

        // Get the most recent health data entry for this user
        const healthDataSnapshot = await db
          .collection("health_data")
          .where("userId", "==", userId)
          .orderBy("syncedAt", "desc")
          .limit(1)
          .get();

        if (healthDataSnapshot.empty) {
          // No health data at all - might be new user, skip
          continue;
        }

        const lastSync = healthDataSnapshot.docs[0].data();
        const lastSyncTime = lastSync.syncedAt?.toDate?.() ||
          new Date(lastSync.syncedAt);

        // Check if last sync was more than 24 hours ago
        if (lastSyncTime < oneDayAgo) {
          // Check if we already sent a sync alert today
          const todayStart = new Date(getTodayDateString() + "T00:00:00");
          const recentAlert = await db
            .collection("engagement_alerts")
            .where("userId", "==", userId)
            .where("alertType", "==", "health_insight")
            .where("metadata.type", "==", "sync_reminder")
            .where("createdAt", ">=", Timestamp.fromDate(todayStart))
            .limit(1)
            .get();

          if (!recentAlert.empty) {
            continue; // Already alerted today
          }

          // Calculate days since last sync
          const daysSinceSync = Math.floor(
            (Date.now() - lastSyncTime.getTime()) / (24 * 60 * 60 * 1000)
          );

          // Create sync reminder alert
          await createEngagementAlert(
            userId,
            "health_insight",
            "Health Data Sync Reminder",
            `Your Apple Watch/Health data hasn't synced in ${daysSinceSync} day${daysSinceSync > 1 ? "s" : ""}. ` +
            "Open the app to sync your latest health metrics.",
            "medium",
            {type: "sync_reminder", daysSinceSync, lastSyncTime: lastSyncTime.toISOString()},
            24 // Expires in 24 hours
          );

          alertsCreated++;
        }
      }

      logger.info(`Daily health sync check complete. Created ${alertsCreated} alerts.`);
    } catch (error) {
      logger.error(`Error in health sync check: ${error}`);
    }
  }
);
