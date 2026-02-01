/**
 * Engagement Types and Interfaces
 * For tracking user engagement, streaks, milestones, and alerts
 */

import {Timestamp} from "firebase-admin/firestore";

// User engagement stats document stored in Firestore
export interface UserEngagementStats {
  userId: string;
  currentStreak: number;          // Current consecutive days of logging
  longestStreak: number;          // All-time longest streak
  totalEntriesLogged: number;     // Total symptoms + activities + wellbeing
  totalDaysActive: number;        // Unique days with at least one entry
  lastActivityDate: string | null; // ISO date of last entry
  lastActivityTimestamp: Timestamp | null;
  weeklyEntryCount: number;       // Entries in the last 7 days
  monthlyEntryCount: number;      // Entries in the last 30 days
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Engagement alert types
export type AlertType =
  | "inactivity_warning"      // User hasn't logged in X days
  | "streak_at_risk"          // User might lose their streak
  | "streak_achieved"         // User achieved a streak milestone
  | "milestone_reached"       // General milestone (entries, days active)
  | "weekly_summary"          // Weekly engagement summary
  | "health_insight";         // Generated health insight

// Engagement alert document
export interface EngagementAlert {
  id?: string;
  userId: string;
  alertType: AlertType;
  title: string;
  message: string;
  priority: "low" | "medium" | "high";
  read: boolean;
  actionUrl?: string;          // Deep link to relevant app section
  metadata?: Record<string, unknown>;
  expiresAt?: Timestamp;
  createdAt: Timestamp;
}

// Milestone types for achievement tracking
export type MilestoneType =
  | "first_entry"             // First ever log
  | "streak_3_days"           // 3 day streak
  | "streak_7_days"           // 1 week streak
  | "streak_14_days"          // 2 week streak
  | "streak_30_days"          // 1 month streak
  | "streak_60_days"          // 2 month streak
  | "streak_90_days"          // 3 month streak
  | "entries_10"              // 10 total entries
  | "entries_50"              // 50 total entries
  | "entries_100"             // 100 total entries
  | "entries_500"             // 500 total entries
  | "days_active_7"           // 7 unique days active
  | "days_active_30"          // 30 unique days active
  | "days_active_100";        // 100 unique days active

// User milestone achievement record
export interface UserMilestone {
  id?: string;
  userId: string;
  milestoneType: MilestoneType;
  achievedAt: Timestamp;
  notified: boolean;
}

// Daily engagement log for tracking unique active days
export interface DailyEngagementLog {
  userId: string;
  date: string;                // YYYY-MM-DD format
  entryCount: number;
  symptomCount: number;
  activityCount: number;
  wellbeingRatingLogged: boolean;
  medicalConditionLogged: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Health insight generated from user data analysis
export interface HealthInsight {
  id?: string;
  userId: string;
  insightType: "symptom_pattern" | "activity_correlation" | "trend_analysis" | "recommendation";
  title: string;
  description: string;
  dataPoints?: Record<string, unknown>;
  confidence: "low" | "medium" | "high";
  generatedAt: Timestamp;
  expiresAt?: Timestamp;
  dismissed: boolean;
}

// Configuration for engagement features
export interface EngagementConfig {
  inactivityThresholdDays: number;       // Days before inactivity alert (default: 2)
  streakAtRiskHours: number;             // Hours remaining to log before streak lost (default: 6)
  dailyReminderHour: number;             // Hour of day for daily reminder (default: 9)
  weeklyInsightDay: number;              // Day of week for weekly insights (0=Sunday, default: 1)
  enabledAlertTypes: AlertType[];
}

// Streak milestone thresholds
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 90] as const;

// Entry count milestones
export const ENTRY_MILESTONES = [1, 10, 50, 100, 500] as const;

// Days active milestones
export const DAYS_ACTIVE_MILESTONES = [7, 30, 100] as const;

// Default engagement configuration
export const DEFAULT_ENGAGEMENT_CONFIG: EngagementConfig = {
  inactivityThresholdDays: 2,
  streakAtRiskHours: 6,
  dailyReminderHour: 9,
  weeklyInsightDay: 1,
  enabledAlertTypes: [
    "inactivity_warning",
    "streak_at_risk",
    "streak_achieved",
    "milestone_reached",
    "weekly_summary",
    "health_insight",
  ],
};
