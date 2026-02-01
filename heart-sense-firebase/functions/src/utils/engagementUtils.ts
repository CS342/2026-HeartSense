/**
 * Engagement Utility Functions
 * Helper functions for engagement tracking and milestone detection
 */

import * as admin from "firebase-admin";
import {Timestamp, Transaction} from "firebase-admin/firestore";
import {
  UserEngagementStats,
  EngagementAlert,
  UserMilestone,
  DailyEngagementLog,
  AlertType,
  MilestoneType,
  ENTRY_MILESTONES,
  DAYS_ACTIVE_MILESTONES,
} from "../types/engagement";

const db = admin.firestore();

/**
 * Get the current date in YYYY-MM-DD format
 */
export function getTodayDateString(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Get date string for X days ago
 */
export function getDateStringDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

/**
 * Get or create user engagement stats document
 */
export async function getOrCreateEngagementStats(
  userId: string
): Promise<UserEngagementStats> {
  const statsRef = db.collection("engagement_stats").doc(userId);
  const statsDoc = await statsRef.get();

  if (statsDoc.exists) {
    return statsDoc.data() as UserEngagementStats;
  }

  // Create new engagement stats for user
  const newStats: UserEngagementStats = {
    userId,
    totalEntriesLogged: 0,
    totalDaysActive: 0,
    lastActivityDate: null,
    lastActivityTimestamp: null,
    weeklyEntryCount: 0,
    monthlyEntryCount: 0,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await statsRef.set(newStats);
  return newStats;
}

/**
 * Update user engagement stats after a new entry
 */
export async function updateEngagementStats(
  userId: string,
  entryType: "symptom" | "activity" | "wellbeing" | "medical_condition"
): Promise<{stats: UserEngagementStats; newMilestones: MilestoneType[]}> {
  const statsRef = db.collection("engagement_stats").doc(userId);
  const today = getTodayDateString();
  const now = Timestamp.now();
  const newMilestones: MilestoneType[] = [];

  return await db.runTransaction(async (transaction: Transaction) => {
    const statsDoc = await transaction.get(statsRef);
    const stats = statsDoc.exists
      ? (statsDoc.data() as UserEngagementStats)
      : {
          userId,
          totalEntriesLogged: 0,
          totalDaysActive: 0,
          lastActivityDate: null,
          lastActivityTimestamp: null,
          weeklyEntryCount: 0,
          monthlyEntryCount: 0,
          createdAt: now,
          updatedAt: now,
        };

    // Update entry counts
    const previousTotal = stats.totalEntriesLogged;
    stats.totalEntriesLogged += 1;
    stats.weeklyEntryCount += 1;
    stats.monthlyEntryCount += 1;

    // Check for entry milestones
    for (const milestone of ENTRY_MILESTONES) {
      if (previousTotal < milestone && stats.totalEntriesLogged >= milestone) {
        const milestoneType = milestone === 1
          ? "first_entry"
          : (`entries_${milestone}` as MilestoneType);
        newMilestones.push(milestoneType);
      }
    }

    // Track unique active days
    const lastActivityDate = stats.lastActivityDate;

    if (lastActivityDate !== today) {
      stats.totalDaysActive += 1;

      // Check days active milestones
      for (const milestone of DAYS_ACTIVE_MILESTONES) {
        if (stats.totalDaysActive === milestone) {
          newMilestones.push(`days_active_${milestone}` as MilestoneType);
        }
      }
    }

    stats.lastActivityDate = today;
    stats.lastActivityTimestamp = now;
    stats.updatedAt = now;

    // Update or create daily engagement log
    const dailyLogRef = db
      .collection("daily_engagement_logs")
      .doc(`${userId}_${today}`);
    const dailyLogDoc = await transaction.get(dailyLogRef);

    if (dailyLogDoc.exists) {
      const dailyLog = dailyLogDoc.data() as DailyEngagementLog;
      const updates: Partial<DailyEngagementLog> = {
        entryCount: dailyLog.entryCount + 1,
        updatedAt: now,
      };

      if (entryType === "symptom") {
        updates.symptomCount = dailyLog.symptomCount + 1;
      } else if (entryType === "activity") {
        updates.activityCount = dailyLog.activityCount + 1;
      } else if (entryType === "wellbeing") {
        updates.wellbeingRatingLogged = true;
      } else if (entryType === "medical_condition") {
        updates.medicalConditionLogged = true;
      }

      transaction.update(dailyLogRef, updates);
    } else {
      const newDailyLog: DailyEngagementLog = {
        userId,
        date: today,
        entryCount: 1,
        symptomCount: entryType === "symptom" ? 1 : 0,
        activityCount: entryType === "activity" ? 1 : 0,
        wellbeingRatingLogged: entryType === "wellbeing",
        medicalConditionLogged: entryType === "medical_condition",
        createdAt: now,
        updatedAt: now,
      };
      transaction.set(dailyLogRef, newDailyLog);
    }

    transaction.set(statsRef, stats, {merge: true});

    return {stats, newMilestones};
  });
}

/**
 * Create an engagement alert for a user
 */
export async function createEngagementAlert(
  userId: string,
  alertType: AlertType,
  title: string,
  message: string,
  priority: "low" | "medium" | "high" = "medium",
  metadata?: Record<string, unknown>,
  expiresInHours?: number
): Promise<string> {
  const now = Timestamp.now();

  const alert: EngagementAlert = {
    userId,
    alertType,
    title,
    message,
    priority,
    read: false,
    metadata,
    createdAt: now,
  };

  if (expiresInHours) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + expiresInHours);
    alert.expiresAt = Timestamp.fromDate(expiresAt);
  }

  const alertRef = await db.collection("engagement_alerts").add(alert);
  return alertRef.id;
}

/**
 * Record a milestone achievement for a user
 */
export async function recordMilestone(
  userId: string,
  milestoneType: MilestoneType
): Promise<void> {
  // Check if milestone already achieved
  const existingMilestone = await db
    .collection("user_milestones")
    .where("userId", "==", userId)
    .where("milestoneType", "==", milestoneType)
    .get();

  if (!existingMilestone.empty) {
    return; // Already achieved
  }

  const milestone: UserMilestone = {
    userId,
    milestoneType,
    achievedAt: Timestamp.now(),
    notified: false,
  };

  await db.collection("user_milestones").add(milestone);
}

/**
 * Get user's notification preferences
 */
export async function getUserNotificationPreferences(
  userId: string
): Promise<{
  notify_daily_reminder: boolean;
  notify_messages: boolean;
  notify_health_insights: boolean;
  notify_activity_milestones: boolean;
} | null> {
  const prefsDoc = await db.collection("user_preferences").doc(userId).get();

  if (!prefsDoc.exists) {
    return null;
  }

  return prefsDoc.data() as {
    notify_daily_reminder: boolean;
    notify_messages: boolean;
    notify_health_insights: boolean;
    notify_activity_milestones: boolean;
  };
}

/**
 * Get milestone display info
 */
export function getMilestoneDisplayInfo(milestoneType: MilestoneType): {
  title: string;
  message: string;
} {
  const milestoneInfo: Record<MilestoneType, {title: string; message: string}> = {
    "first_entry": {
      title: "First Entry!",
      message: "You've logged your first entry. Great start on your health journey!",
    },
    "entries_10": {
      title: "10 Entries!",
      message: "You've logged 10 entries. You're getting into the groove!",
    },
    "entries_50": {
      title: "50 Entries!",
      message: "50 entries logged! That's a wealth of health data.",
    },
    "entries_100": {
      title: "100 Entries!",
      message: "100 entries! You're a dedicated health tracker.",
    },
    "entries_500": {
      title: "500 Entries!",
      message: "500 entries! You've built an incredible health record.",
    },
    "days_active_7": {
      title: "7 Days Active!",
      message: "You've been active on 7 different days. Great engagement!",
    },
    "days_active_30": {
      title: "30 Days Active!",
      message: "30 unique days of activity! You're a regular user.",
    },
    "days_active_100": {
      title: "100 Days Active!",
      message: "100 days of using HeartSense! Thank you for your dedication.",
    },
  };

  return milestoneInfo[milestoneType];
}

/**
 * Calculate weekly entry counts for recalculation
 */
export async function recalculateWeeklyCount(userId: string): Promise<number> {
  const weekAgo = getDateStringDaysAgo(7);

  const entriesSnapshot = await db
    .collection("daily_engagement_logs")
    .where("userId", "==", userId)
    .where("date", ">=", weekAgo)
    .get();

  let totalCount = 0;
  entriesSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
    const log = doc.data() as DailyEngagementLog;
    totalCount += log.entryCount;
  });

  return totalCount;
}

/**
 * Calculate monthly entry counts for recalculation
 */
export async function recalculateMonthlyCount(userId: string): Promise<number> {
  const monthAgo = getDateStringDaysAgo(30);

  const entriesSnapshot = await db
    .collection("daily_engagement_logs")
    .where("userId", "==", userId)
    .where("date", ">=", monthAgo)
    .get();

  let totalCount = 0;
  entriesSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
    const log = doc.data() as DailyEngagementLog;
    totalCount += log.entryCount;
  });

  return totalCount;
}

/**
 * Get users who haven't logged entries in X days
 */
export async function getInactiveUsers(
  inactivityThresholdDays: number
): Promise<UserEngagementStats[]> {
  const thresholdDate = getDateStringDaysAgo(inactivityThresholdDays);

  const inactiveUsersSnapshot = await db
    .collection("engagement_stats")
    .where("lastActivityDate", "<=", thresholdDate)
    .get();

  const inactiveUsers: UserEngagementStats[] = [];
  inactiveUsersSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
    inactiveUsers.push(doc.data() as UserEngagementStats);
  });

  return inactiveUsers;
}
