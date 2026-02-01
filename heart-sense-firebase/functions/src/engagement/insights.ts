/**
 * Health Insights Generator
 * Analyzes user health data and generates personalized insights
 */

import {onSchedule} from "firebase-functions/v2/scheduler";
import {onCall, CallableRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import {Timestamp} from "firebase-admin/firestore";
import {
  createEngagementAlert,
  getUserNotificationPreferences,
  getDateStringDaysAgo,
} from "../utils/engagementUtils";
import {HealthInsight} from "../types/engagement";

const db = admin.firestore();

interface SymptomEntry {
  symptomType: string;
  severity: number;
  occurredAt: string;
  createdAt: string;
}

interface ActivityEntry {
  activityType: string;
  durationMinutes: number;
  intensity: string;
  occurredAt: string;
}

/**
 * Scheduled: Generate Health Insights (runs every Wednesday at 11 AM)
 * Analyzes user data and generates personalized insights
 */
export const generateHealthInsights = onSchedule(
  {
    schedule: "0 11 * * 3", // Every Wednesday at 11 AM
    timeZone: "America/Los_Angeles",
  },
  async () => {
    logger.info("Running health insights generation");

    try {
      // Get all users with engagement stats
      const statsSnapshot = await db.collection("engagement_stats").get();

      let insightsGenerated = 0;

      for (const statsDoc of statsSnapshot.docs) {
        const userId = statsDoc.id;

        // Check user preferences
        const prefs = await getUserNotificationPreferences(userId);
        if (prefs?.notify_health_insights === false) {
          continue;
        }

        // Generate insights for this user
        const insights = await generateInsightsForUser(userId);

        for (const insight of insights) {
          // Save insight to database
          await db.collection("health_insights").add(insight);

          // Create alert for the user
          await createEngagementAlert(
            userId,
            "health_insight",
            insight.title,
            insight.description,
            "low",
            {insightType: insight.insightType, confidence: insight.confidence},
            168 // Expires in 1 week
          );

          insightsGenerated++;
        }
      }

      logger.info(`Health insights complete. Generated ${insightsGenerated} insights.`);
    } catch (error) {
      logger.error(`Error generating health insights: ${error}`);
    }
  }
);

/**
 * Generate personalized insights for a specific user
 */
async function generateInsightsForUser(userId: string): Promise<HealthInsight[]> {
  const insights: HealthInsight[] = [];
  const now = Timestamp.now();
  const twoWeeksAgo = getDateStringDaysAgo(14);

  try {
    // Get recent symptoms
    const symptomsSnapshot = await db
      .collection("symptoms")
      .where("userId", "==", userId)
      .where("occurredAt", ">=", twoWeeksAgo)
      .get();

    const symptoms: SymptomEntry[] = [];
    symptomsSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      symptoms.push(doc.data() as SymptomEntry);
    });

    // Get recent activities
    const activitiesSnapshot = await db
      .collection("activities")
      .where("userId", "==", userId)
      .where("occurredAt", ">=", twoWeeksAgo)
      .get();

    const activities: ActivityEntry[] = [];
    activitiesSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
      activities.push(doc.data() as ActivityEntry);
    });

    // Generate symptom pattern insights
    const symptomInsight = analyzeSymptomPatterns(symptoms, userId, now);
    if (symptomInsight) {
      insights.push(symptomInsight);
    }

    // Generate activity insights
    const activityInsight = analyzeActivityPatterns(activities, userId, now);
    if (activityInsight) {
      insights.push(activityInsight);
    }

    // Generate correlation insights
    const correlationInsight = analyzeSymptomActivityCorrelation(
      symptoms,
      activities,
      userId,
      now
    );
    if (correlationInsight) {
      insights.push(correlationInsight);
    }
  } catch (error) {
    logger.error(`Error generating insights for user ${userId}: ${error}`);
  }

  return insights;
}

/**
 * Analyze symptom patterns and generate insights
 */
function analyzeSymptomPatterns(
  symptoms: SymptomEntry[],
  userId: string,
  now: Timestamp
): HealthInsight | null {
  if (symptoms.length < 3) {
    return null; // Need at least 3 entries for pattern analysis
  }

  // Count symptom types
  const symptomCounts: Record<string, number> = {};
  const symptomSeverities: Record<string, number[]> = {};

  for (const symptom of symptoms) {
    const type = symptom.symptomType;
    symptomCounts[type] = (symptomCounts[type] || 0) + 1;
    if (!symptomSeverities[type]) {
      symptomSeverities[type] = [];
    }
    symptomSeverities[type].push(symptom.severity);
  }

  // Find most common symptom
  let mostCommonSymptom = "";
  let maxCount = 0;

  for (const [type, count] of Object.entries(symptomCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonSymptom = type;
    }
  }

  if (maxCount >= 3) {
    // Calculate average severity
    const severities = symptomSeverities[mostCommonSymptom];
    const avgSeverity = severities.reduce((a, b) => a + b, 0) / severities.length;

    // Check for severity trend
    let trend = "stable";
    if (severities.length >= 3) {
      const recentAvg = severities.slice(-3).reduce((a, b) => a + b, 0) / 3;
      const olderAvg = severities.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, severities.length - 3);

      if (recentAvg > olderAvg + 1) {
        trend = "increasing";
      } else if (recentAvg < olderAvg - 1) {
        trend = "decreasing";
      }
    }

    let description = `You've logged "${mostCommonSymptom}" ${maxCount} times in the past 2 weeks `;
    description += `with an average severity of ${avgSeverity.toFixed(1)}/10. `;

    if (trend === "increasing") {
      description += "The severity appears to be trending upward. Consider discussing this with your healthcare provider.";
    } else if (trend === "decreasing") {
      description += "Good news - the severity seems to be improving!";
    } else {
      description += "The severity has been relatively stable.";
    }

    return {
      userId,
      insightType: "symptom_pattern",
      title: `Pattern Detected: ${mostCommonSymptom}`,
      description,
      dataPoints: {
        symptomType: mostCommonSymptom,
        count: maxCount,
        averageSeverity: avgSeverity,
        trend,
      },
      confidence: maxCount >= 5 ? "high" : "medium",
      generatedAt: now,
      dismissed: false,
    };
  }

  return null;
}

/**
 * Analyze activity patterns and generate insights
 */
function analyzeActivityPatterns(
  activities: ActivityEntry[],
  userId: string,
  now: Timestamp
): HealthInsight | null {
  if (activities.length < 3) {
    return null;
  }

  // Calculate total activity minutes by type
  const activityMinutes: Record<string, number> = {};
  const activityCounts: Record<string, number> = {};

  for (const activity of activities) {
    const type = activity.activityType;
    activityMinutes[type] = (activityMinutes[type] || 0) + activity.durationMinutes;
    activityCounts[type] = (activityCounts[type] || 0) + 1;
  }

  // Calculate total weekly activity
  const totalMinutes = Object.values(activityMinutes).reduce((a, b) => a + b, 0);
  const weeklyAverage = (totalMinutes / 2); // 2 weeks of data

  // Find most common activity
  let mostCommonActivity = "";
  let maxCount = 0;

  for (const [type, count] of Object.entries(activityCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonActivity = type;
    }
  }

  // Generate insight based on activity level
  let title = "";
  let description = "";

  if (weeklyAverage >= 150) {
    title = "Great Activity Level!";
    description = `You're averaging ${Math.round(weeklyAverage)} minutes of activity per week. `;
    description += `That's meeting the recommended 150 minutes of weekly exercise! `;
    description += `Your most frequent activity is "${mostCommonActivity}". Keep it up!`;
  } else if (weeklyAverage >= 75) {
    title = "Good Progress on Activity";
    description = `You're averaging ${Math.round(weeklyAverage)} minutes of activity per week. `;
    description += `You're halfway to the recommended 150 minutes! `;
    description += `Try adding one more session of "${mostCommonActivity}" to boost your total.`;
  } else if (activities.length > 0) {
    title = "Activity Opportunity";
    description = `You've logged ${Math.round(weeklyAverage)} minutes of weekly activity. `;
    description += `Small increases can make a big difference. `;
    description += `Even 10-15 minute sessions of "${mostCommonActivity}" add up over time!`;
  } else {
    return null;
  }

  return {
    userId,
    insightType: "trend_analysis",
    title,
    description,
    dataPoints: {
      weeklyAverage: Math.round(weeklyAverage),
      totalMinutes,
      mostCommonActivity,
      activityCount: activities.length,
    },
    confidence: activities.length >= 5 ? "high" : "medium",
    generatedAt: now,
    dismissed: false,
  };
}

/**
 * Analyze correlation between symptoms and activities
 */
function analyzeSymptomActivityCorrelation(
  symptoms: SymptomEntry[],
  activities: ActivityEntry[],
  userId: string,
  now: Timestamp
): HealthInsight | null {
  if (symptoms.length < 5 || activities.length < 5) {
    return null; // Need enough data for correlation
  }

  // Group symptoms by day
  const symptomsByDay: Record<string, SymptomEntry[]> = {};
  for (const symptom of symptoms) {
    const day = symptom.occurredAt.split("T")[0];
    if (!symptomsByDay[day]) {
      symptomsByDay[day] = [];
    }
    symptomsByDay[day].push(symptom);
  }

  // Group activities by day
  const activitiesByDay: Record<string, ActivityEntry[]> = {};
  for (const activity of activities) {
    const day = activity.occurredAt.split("T")[0];
    if (!activitiesByDay[day]) {
      activitiesByDay[day] = [];
    }
    activitiesByDay[day].push(activity);
  }

  // Calculate average severity on active vs inactive days
  let activeDaySeveritySum = 0;
  let activeDaySymptomCount = 0;
  let inactiveDaySeveritySum = 0;
  let inactiveDaySymptomCount = 0;

  for (const [day, daySymptoms] of Object.entries(symptomsByDay)) {
    const hadActivity = activitiesByDay[day] && activitiesByDay[day].length > 0;

    for (const symptom of daySymptoms) {
      if (hadActivity) {
        activeDaySeveritySum += symptom.severity;
        activeDaySymptomCount++;
      } else {
        inactiveDaySeveritySum += symptom.severity;
        inactiveDaySymptomCount++;
      }
    }
  }

  if (activeDaySymptomCount < 3 || inactiveDaySymptomCount < 3) {
    return null; // Not enough data for comparison
  }

  const activeDayAvg = activeDaySeveritySum / activeDaySymptomCount;
  const inactiveDayAvg = inactiveDaySeveritySum / inactiveDaySymptomCount;
  const difference = inactiveDayAvg - activeDayAvg;

  // Only report if there's a meaningful difference
  if (Math.abs(difference) < 0.5) {
    return null;
  }

  let title = "";
  let description = "";

  if (difference > 0.5) {
    title = "Activity May Help Your Symptoms";
    description = `On days when you're active, your average symptom severity is `;
    description += `${activeDayAvg.toFixed(1)}/10, compared to ${inactiveDayAvg.toFixed(1)}/10 on inactive days. `;
    description += `This suggests physical activity might help manage your symptoms.`;
  } else {
    title = "Rest Days Matter";
    description = `On rest days, your average symptom severity is `;
    description += `${inactiveDayAvg.toFixed(1)}/10, compared to ${activeDayAvg.toFixed(1)}/10 on active days. `;
    description += `Consider balancing activity with adequate rest.`;
  }

  return {
    userId,
    insightType: "activity_correlation",
    title,
    description,
    dataPoints: {
      activeDayAvgSeverity: activeDayAvg,
      inactiveDayAvgSeverity: inactiveDayAvg,
      activeDaySamples: activeDaySymptomCount,
      inactiveDaySamples: inactiveDaySymptomCount,
    },
    confidence: activeDaySymptomCount >= 5 && inactiveDaySymptomCount >= 5 ? "high" : "medium",
    generatedAt: now,
    dismissed: false,
  };
}

/**
 * Callable: Manually request insight generation for a user
 */
export const requestInsights = onCall(
  async (request: CallableRequest): Promise<{
    success: boolean;
    data?: {insightsGenerated: number};
    error?: string;
  }> => {
    const auth = request.auth;
    if (!auth) {
      return {success: false, error: "Authentication required"};
    }

    const userId = auth.uid;

    try {
      const insights = await generateInsightsForUser(userId);

      for (const insight of insights) {
        await db.collection("health_insights").add(insight);
      }

      return {success: true, data: {insightsGenerated: insights.length}};
    } catch (error) {
      logger.error(`Error requesting insights: ${error}`);
      return {success: false, error: "Failed to generate insights"};
    }
  }
);

/**
 * Get user's health insights
 */
export const getHealthInsights = onCall(
  async (request: CallableRequest): Promise<{
    success: boolean;
    data?: HealthInsight[];
    error?: string;
  }> => {
    const auth = request.auth;
    if (!auth) {
      return {success: false, error: "Authentication required"};
    }

    const userId = auth.uid;
    const limit = (request.data as {limit?: number})?.limit || 10;

    try {
      const insightsSnapshot = await db
        .collection("health_insights")
        .where("userId", "==", userId)
        .where("dismissed", "==", false)
        .orderBy("generatedAt", "desc")
        .limit(limit)
        .get();

      const insights: HealthInsight[] = [];
      insightsSnapshot.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
        insights.push({id: doc.id, ...doc.data()} as HealthInsight);
      });

      return {success: true, data: insights};
    } catch (error) {
      logger.error(`Error getting health insights: ${error}`);
      return {success: false, error: "Failed to get insights"};
    }
  }
);

/**
 * Dismiss a health insight
 */
export const dismissInsight = onCall(
  async (request: CallableRequest): Promise<{success: boolean; error?: string}> => {
    const auth = request.auth;
    if (!auth) {
      return {success: false, error: "Authentication required"};
    }

    const insightId = (request.data as {insightId?: string})?.insightId;
    if (!insightId) {
      return {success: false, error: "Insight ID is required"};
    }

    try {
      const insightRef = db.collection("health_insights").doc(insightId);
      const insightDoc = await insightRef.get();

      if (!insightDoc.exists) {
        return {success: false, error: "Insight not found"};
      }

      const insightData = insightDoc.data() as HealthInsight;
      if (insightData.userId !== auth.uid) {
        return {success: false, error: "Unauthorized"};
      }

      await insightRef.update({dismissed: true});
      return {success: true};
    } catch (error) {
      logger.error(`Error dismissing insight: ${error}`);
      return {success: false, error: "Failed to dismiss insight"};
    }
  }
);
