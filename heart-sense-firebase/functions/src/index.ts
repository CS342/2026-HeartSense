/**
 * HeartSense Firebase Cloud Functions
 *
 * This file exports all Cloud Functions for the HeartSense app.
 * Functions are organized into modules for maintainability.
 */

import * as admin from "firebase-admin";
import {setGlobalOptions} from "firebase-functions";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Global options for all functions
// Limit max instances for cost control
setGlobalOptions({maxInstances: 10});

// ============================================
// Engagement Trigger Functions
// ============================================
// These functions automatically track engagement when users create entries
export {
  onSymptomCreated,
  onActivityCreated,
  onWellbeingRatingCreated,
  onMedicalConditionCreated,
  onUserProfileCreated,
} from "./engagement/triggers";

// ============================================
// Engagement Scheduled Functions
// ============================================
// These functions run on a schedule for reminders, alerts, and maintenance
export {
  dailyReminderCheck,
  inactivityAlertCheck,
  weeklySummaryGeneration,
  cleanupExpiredAlerts,
  monthlyStatsReset,
} from "./engagement/scheduled";

// ============================================
// Engagement API Functions (Callable)
// ============================================
// These functions can be called directly from the frontend
export {
  getEngagementStats,
  getEngagementAlerts,
  markAlertRead,
  markAllAlertsRead,
  getUserMilestones,
  getDailyEngagementHistory,
  recalculateEngagementStats,
  dismissAlert,
} from "./engagement/api";

// ============================================
// Health Insights Functions
// ============================================
// Functions for generating and managing health insights
export {
  generateHealthInsights,
  requestInsights,
  getHealthInsights,
  dismissInsight,
} from "./engagement/insights";

// ============================================
// TEST ENDPOINTS (Remove before production)
// ============================================
// HTTP endpoints to manually trigger scheduled functions for testing
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";

/**
 * Test endpoint to trigger daily reminder check
 * Usage: curl https://<region>-<project>.cloudfunctions.net/testDailyReminder
 */
export const testDailyReminder = onRequest(async (req, res) => {
  logger.info("Manually triggering daily reminder check for testing");
  try {
    // Manually invoke the scheduled function's logic
    const db = admin.firestore();
    const today = new Date().toISOString().split("T")[0];

    const prefsSnapshot = await db
      .collection("user_preferences")
      .where("notify_daily_reminder", "==", true)
      .get();

    res.json({
      success: true,
      message: "Daily reminder check triggered",
      usersWithRemindersEnabled: prefsSnapshot.size,
      today: today,
    });
  } catch (error) {
    logger.error("Test daily reminder error:", error);
    res.status(500).json({success: false, error: String(error)});
  }
});

/**
 * Test endpoint to trigger inactivity alert check
 * Usage: curl https://<region>-<project>.cloudfunctions.net/testInactivityCheck
 */
export const testInactivityCheck = onRequest(async (req, res) => {
  logger.info("Manually triggering inactivity check for testing");
  try {
    const db = admin.firestore();
    const thresholdDays = 3;
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

    const inactiveSnapshot = await db
      .collection("engagement_stats")
      .where("lastActivityDate", "<=", thresholdDate.toISOString().split("T")[0])
      .get();

    res.json({
      success: true,
      message: "Inactivity check triggered",
      inactiveUsersFound: inactiveSnapshot.size,
      thresholdDays: thresholdDays,
    });
  } catch (error) {
    logger.error("Test inactivity check error:", error);
    res.status(500).json({success: false, error: String(error)});
  }
});
