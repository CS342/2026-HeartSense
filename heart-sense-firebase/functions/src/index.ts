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
  streakAtRiskCheck,
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
  getEngagementLeaderboard,
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
