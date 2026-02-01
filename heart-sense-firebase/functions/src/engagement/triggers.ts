/**
 * Firestore Trigger Functions for Engagement Tracking
 * These functions automatically update engagement stats when users create entries
 */

import {onDocumentCreated, FirestoreEvent, QueryDocumentSnapshot} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {
  updateEngagementStats,
  createEngagementAlert,
  recordMilestone,
  getMilestoneDisplayInfo,
  getUserNotificationPreferences,
} from "../utils/engagementUtils";
import {MilestoneType} from "../types/engagement";

/**
 * Trigger: When a new symptom is logged
 * Updates engagement stats and checks for milestones
 */
export const onSymptomCreated = onDocumentCreated(
  "symptoms/{symptomId}",
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined>) => {
    const symptomData = event.data?.data();
    if (!symptomData) {
      logger.warn("No symptom data found in trigger");
      return;
    }

    const userId = symptomData.userId || symptomData.user_id;
    if (!userId) {
      logger.warn("No userId found in symptom document");
      return;
    }

    logger.info(`Processing symptom entry for user ${userId}`);

    try {
      const {stats, newMilestones} = await updateEngagementStats(
        userId,
        "symptom"
      );

      logger.info(
        `Updated engagement stats for user ${userId}: ` +
        `streak=${stats.currentStreak}, total=${stats.totalEntriesLogged}`
      );

      // Process any new milestones
      await processMilestones(userId, newMilestones);
    } catch (error) {
      logger.error(`Error updating engagement stats for symptom: ${error}`);
    }
  }
);

/**
 * Trigger: When a new activity is logged
 * Updates engagement stats and checks for milestones
 */
export const onActivityCreated = onDocumentCreated(
  "activities/{activityId}",
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined>) => {
    const activityData = event.data?.data();
    if (!activityData) {
      logger.warn("No activity data found in trigger");
      return;
    }

    const userId = activityData.userId || activityData.user_id;
    if (!userId) {
      logger.warn("No userId found in activity document");
      return;
    }

    logger.info(`Processing activity entry for user ${userId}`);

    try {
      const {stats, newMilestones} = await updateEngagementStats(
        userId,
        "activity"
      );

      logger.info(
        `Updated engagement stats for user ${userId}: ` +
        `streak=${stats.currentStreak}, total=${stats.totalEntriesLogged}`
      );

      // Process any new milestones
      await processMilestones(userId, newMilestones);
    } catch (error) {
      logger.error(`Error updating engagement stats for activity: ${error}`);
    }
  }
);

/**
 * Trigger: When a new wellbeing rating is logged
 * Updates engagement stats and checks for milestones
 */
export const onWellbeingRatingCreated = onDocumentCreated(
  "well_being_ratings/{ratingId}",
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined>) => {
    const ratingData = event.data?.data();
    if (!ratingData) {
      logger.warn("No wellbeing rating data found in trigger");
      return;
    }

    const userId = ratingData.userId || ratingData.user_id;
    if (!userId) {
      logger.warn("No userId found in wellbeing rating document");
      return;
    }

    logger.info(`Processing wellbeing rating for user ${userId}`);

    try {
      const {stats, newMilestones} = await updateEngagementStats(
        userId,
        "wellbeing"
      );

      logger.info(
        `Updated engagement stats for user ${userId}: ` +
        `streak=${stats.currentStreak}, total=${stats.totalEntriesLogged}`
      );

      // Process any new milestones
      await processMilestones(userId, newMilestones);
    } catch (error) {
      logger.error(`Error updating engagement stats for wellbeing: ${error}`);
    }
  }
);

/**
 * Trigger: When a new medical condition is logged
 * Updates engagement stats and checks for milestones
 */
export const onMedicalConditionCreated = onDocumentCreated(
  "medical_conditions/{conditionId}",
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined>) => {
    const conditionData = event.data?.data();
    if (!conditionData) {
      logger.warn("No medical condition data found in trigger");
      return;
    }

    const userId = conditionData.userId || conditionData.user_id;
    if (!userId) {
      logger.warn("No userId found in medical condition document");
      return;
    }

    logger.info(`Processing medical condition entry for user ${userId}`);

    try {
      const {stats, newMilestones} = await updateEngagementStats(
        userId,
        "medical_condition"
      );

      logger.info(
        `Updated engagement stats for user ${userId}: ` +
        `streak=${stats.currentStreak}, total=${stats.totalEntriesLogged}`
      );

      // Process any new milestones
      await processMilestones(userId, newMilestones);
    } catch (error) {
      logger.error(`Error updating engagement stats for medical condition: ${error}`);
    }
  }
);

/**
 * Helper: Process milestone achievements
 * Records milestones and creates alerts for the user
 */
async function processMilestones(
  userId: string,
  milestones: MilestoneType[]
): Promise<void> {
  if (milestones.length === 0) {
    return;
  }

  // Check user preferences for milestone notifications
  const prefs = await getUserNotificationPreferences(userId);
  const shouldNotify = prefs?.notify_activity_milestones !== false;

  for (const milestoneType of milestones) {
    // Record the milestone
    await recordMilestone(userId, milestoneType);

    // Create an alert if user wants notifications
    if (shouldNotify) {
      const displayInfo = getMilestoneDisplayInfo(milestoneType);
      await createEngagementAlert(
        userId,
        "milestone_reached",
        `${displayInfo.emoji} ${displayInfo.title}`,
        displayInfo.message,
        "medium",
        {milestoneType},
        48 // Expires in 48 hours
      );
    }

    logger.info(`Milestone achieved for user ${userId}: ${milestoneType}`);
  }
}

/**
 * Trigger: When a user profile is created (new user signup)
 * Initialize engagement stats for the new user
 */
export const onUserProfileCreated = onDocumentCreated(
  "profiles/{userId}",
  async (event: FirestoreEvent<QueryDocumentSnapshot | undefined>) => {
    const profileData = event.data?.data();
    const userId = event.params.userId;

    if (!profileData || !userId) {
      logger.warn("No profile data or userId found in trigger");
      return;
    }

    logger.info(`Initializing engagement stats for new user ${userId}`);

    try {
      const db = admin.firestore();
      const now = Timestamp.now();

      // Create initial engagement stats
      await db.collection("engagement_stats").doc(userId).set({
        userId,
        currentStreak: 0,
        longestStreak: 0,
        totalEntriesLogged: 0,
        totalDaysActive: 0,
        lastActivityDate: null,
        lastActivityTimestamp: null,
        weeklyEntryCount: 0,
        monthlyEntryCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      // Create a welcome alert
      await createEngagementAlert(
        userId,
        "milestone_reached",
        "Welcome to HeartSense!",
        "Start tracking your health by logging your first symptom or activity. " +
        "Consistent logging helps you and your healthcare team understand your health better.",
        "low",
        {type: "welcome"},
        168 // Expires in 1 week
      );

      logger.info(`Engagement stats initialized for user ${userId}`);
    } catch (error) {
      logger.error(`Error initializing engagement stats: ${error}`);
    }
  }
);
