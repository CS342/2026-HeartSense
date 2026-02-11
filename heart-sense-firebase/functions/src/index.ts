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
  healthSyncCheck,
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
import {Timestamp} from "firebase-admin/firestore";

/**
 * Test endpoint to trigger daily reminder notification
 * Usage: curl "http://localhost:5001/PROJECT/us-central1/testDailyReminder?userId=USER_ID"
 */
export const testDailyReminder = onRequest(async (req, res) => {
  logger.info("Manually triggering daily reminder for testing");
  try {
    const db = admin.firestore();
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({success: false, error: "userId query param required"});
      return;
    }

    // Create a test daily reminder alert
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + 24 * 60 * 60 * 1000)
    );

    const alertRef = await db.collection("engagement_alerts").add({
      userId,
      alertType: "inactivity_warning",
      title: "Daily Health Check-in",
      message: "Take a moment to log how you're feeling today. Regular tracking helps you and your healthcare team spot patterns.",
      priority: "low",
      isRead: false,
      isDismissed: false,
      createdAt: now,
      expiresAt,
      metadata: {type: "daily_reminder", test: true},
    });

    res.json({
      success: true,
      message: "Daily reminder alert created",
      alertId: alertRef.id,
      userId,
    });
  } catch (error) {
    logger.error("Test daily reminder error:", error);
    res.status(500).json({success: false, error: String(error)});
  }
});

/**
 * Test endpoint to trigger inactivity alert notification
 * Usage: curl "http://localhost:5001/PROJECT/us-central1/testInactivityCheck?userId=USER_ID"
 */
export const testInactivityCheck = onRequest(async (req, res) => {
  logger.info("Manually triggering inactivity check for testing");
  try {
    const db = admin.firestore();
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({success: false, error: "userId query param required"});
      return;
    }

    // Create a test inactivity alert
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + 48 * 60 * 60 * 1000)
    );

    const alertRef = await db.collection("engagement_alerts").add({
      userId,
      alertType: "inactivity_warning",
      title: "We Miss You!",
      message: "It's been a few days since your last health log. Even a quick check-in helps track your health journey.",
      priority: "medium",
      isRead: false,
      isDismissed: false,
      createdAt: now,
      expiresAt,
      metadata: {daysInactive: 3, test: true},
    });

    res.json({
      success: true,
      message: "Inactivity alert created",
      alertId: alertRef.id,
      userId,
    });
  } catch (error) {
    logger.error("Test inactivity check error:", error);
    res.status(500).json({success: false, error: String(error)});
  }
});

/**
 * Test endpoint to trigger health sync alert notification
 * Usage: curl "http://localhost:5001/PROJECT/us-central1/testHealthSyncAlert?userId=USER_ID"
 */
export const testHealthSyncAlert = onRequest(async (req, res) => {
  logger.info("Manually triggering health sync alert for testing");
  try {
    const db = admin.firestore();
    const userId = req.query.userId as string;

    if (!userId) {
      res.status(400).json({success: false, error: "userId query param required"});
      return;
    }

    // Create a test health sync alert
    const now = Timestamp.now();
    const expiresAt = Timestamp.fromDate(
      new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours
    );

    const alertRef = await db.collection("engagement_alerts").add({
      userId,
      alertType: "health_insight",
      title: "Health Data Sync Reminder",
      message: "Your Apple Watch/Health data hasn't synced in over an hour. Open the app to sync your latest health metrics.",
      priority: "medium",
      isRead: false,
      isDismissed: false,
      createdAt: now,
      expiresAt,
      metadata: {type: "sync_reminder", hoursSinceSync: 1, test: true},
    });

    res.json({
      success: true,
      message: "Health sync alert created",
      alertId: alertRef.id,
      userId,
    });
  } catch (error) {
    logger.error("Test health sync alert error:", error);
    res.status(500).json({success: false, error: String(error)});
  }
});
