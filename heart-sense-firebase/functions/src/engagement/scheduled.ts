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
  getUsersWithStreaksAtRisk,
  createEngagementAlert,
  getUserNotificationPreferences,
  recalculateWeeklyCount,
  recalculateMonthlyCount,
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
        const lastActive = user.lastActivityDate
          ? new Date(user.lastActivityDate)
          : null;
        const daysInactive = lastActive
          ? Math.floor((Date.now() - lastActive.getTime()) / (24 * 60 * 60 * 1000))
          : 0;

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
 * Scheduled: Streak At Risk Alert (runs every day at 8 PM)
 * Alerts users who might lose their streak if they don't log today
 */
export const streakAtRiskCheck = onSchedule(
  {
    schedule: "0 20 * * *", // Every day at 8 PM
    timeZone: "America/Los_Angeles",
  },
  async () => {
    logger.info("Running streak at risk check");
    const today = getTodayDateString();

    try {
      const atRiskUsers = await getUsersWithStreaksAtRisk();

      let alertsCreated = 0;

      for (const user of atRiskUsers) {
        // Check user preferences
        const prefs = await getUserNotificationPreferences(user.userId);
        if (prefs?.notify_activity_milestones === false) {
          continue; // User doesn't want milestone notifications
        }

        // Check if already alerted today
        const todayStart = new Date(today + "T00:00:00");
        const existingAlert = await db
          .collection("engagement_alerts")
          .where("userId", "==", user.userId)
          .where("alertType", "==", "streak_at_risk")
          .where("createdAt", ">=", Timestamp.fromDate(todayStart))
          .limit(1)
          .get();

        if (!existingAlert.empty) {
          continue;
        }

        // Create streak at risk alert
        await createEngagementAlert(
          user.userId,
          "streak_at_risk",
          `Don't Lose Your ${user.currentStreak}-Day Streak!`,
          "You're so close to keeping your streak alive! " +
          "Log a quick entry before midnight to maintain your progress.",
          "high",
          {currentStreak: user.currentStreak},
          6 // Expires in 6 hours
        );

        alertsCreated++;
      }

      logger.info(`Streak at risk check complete. Created ${alertsCreated} alerts.`);
    } catch (error) {
      logger.error(`Error in streak at risk check: ${error}`);
    }
  }
);

/**
 * Scheduled: Weekly Summary (runs every Monday at 10 AM)
 * Generates and sends weekly engagement summaries
 */
export const weeklySummaryGeneration = onSchedule(
  {
    schedule: "0 10 * * 1", // Every Monday at 10 AM
    timeZone: "America/Los_Angeles",
  },
  async () => {
    logger.info("Running weekly summary generation");

    try {
      // Get all users with engagement stats
      const statsSnapshot = await db
        .collection("engagement_stats")
        .get();

      let summariesCreated = 0;

      for (const statsDoc of statsSnapshot.docs) {
        const stats = statsDoc.data() as UserEngagementStats;
        const userId = stats.userId;

        // Check user preferences
        const prefs = await getUserNotificationPreferences(userId);
        if (prefs?.notify_health_insights === false) {
          continue;
        }

        // Get weekly data
        const weeklyCount = await recalculateWeeklyCount(userId);
        const previousWeekCount = stats.weeklyEntryCount || 0;

        // Generate summary message
        let message = `Last week you logged ${weeklyCount} entries. `;

        if (weeklyCount > previousWeekCount) {
          message += "That's more than the week before - great progress!";
        } else if (weeklyCount === previousWeekCount && weeklyCount > 0) {
          message += "You maintained your pace from the previous week.";
        } else if (weeklyCount > 0) {
          message += "Keep it up and try to log a bit more this week!";
        } else {
          message = "You didn't log any entries last week. " +
            "Even brief check-ins help track your health!";
        }

        if (stats.currentStreak > 0) {
          message += ` Current streak: ${stats.currentStreak} days!`;
        }

        // Create weekly summary alert
        await createEngagementAlert(
          userId,
          "weekly_summary",
          "Your Weekly Health Summary",
          message,
          "low",
          {
            weeklyCount,
            previousWeekCount,
            currentStreak: stats.currentStreak,
          },
          168 // Expires in 1 week
        );

        // Update stats with recalculated counts
        await db.collection("engagement_stats").doc(userId).update({
          weeklyEntryCount: weeklyCount,
          monthlyEntryCount: await recalculateMonthlyCount(userId),
          updatedAt: Timestamp.now(),
        });

        summariesCreated++;
      }

      logger.info(`Weekly summary complete. Created ${summariesCreated} summaries.`);
    } catch (error) {
      logger.error(`Error in weekly summary generation: ${error}`);
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
            `Your longest streak was ${stats.longestStreak} days. ` +
            "Keep up the great work this month!",
            "low",
            {
              monthlyEntryCount: stats.monthlyEntryCount,
              totalDaysActive: stats.totalDaysActive,
              longestStreak: stats.longestStreak,
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
