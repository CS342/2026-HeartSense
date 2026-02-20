/**
 * Push notification functions for HeartSense.
 * Sends push notifications via FCM or Expo Push API depending on token type.
 */

import * as admin from "firebase-admin";
import {onCall, CallableRequest} from "firebase-functions/v2/https";
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

function isExpoPushToken(token: string): boolean {
  return (
    token.startsWith("ExponentPushToken[") ||
    token.startsWith("ExpoPushToken[") ||
    /^ExponentPushToken\[.+\]$/.test(token) ||
    token.includes("ExponentPushToken")
  );
}

export interface SendExpoPushOptions {
  token: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

/**
 * Send a push notification via Expo Push API. Used by the callable and by
 * the engagement_alerts trigger so users get notifications when the app is closed.
 */
export async function sendExpoPush(
  options: SendExpoPushOptions
): Promise<{success: boolean; messageId?: string; error?: string}> {
  const {token, title, body, data} = options;
  const trimmedToken = token.trim();
  const payload: {
    to: string;
    title: string;
    body: string;
    sound: string;
    data?: Record<string, unknown>;
  } = {
    to: trimmedToken,
    title: title.trim() || "HeartSense",
    body: body.trim() || "You have a new notification.",
    sound: "default",
  };
  if (data && Object.keys(data).length > 0) {
    payload.data = data;
  }
  try {
    const res = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const resData = (await res.json()) as {
      data?: {status?: string; id?: string}[];
      errors?: {message: string}[];
    };
    if (!res.ok || (resData.errors && resData.errors.length > 0)) {
      const errMsg = resData.errors?.[0]?.message || `Expo API ${res.status}`;
      logger.warn("sendExpoPush failed", {status: res.status, resData});
      return {success: false, error: errMsg};
    }
    const ticket = resData.data?.[0];
    const messageId = ticket?.id ?? ticket?.status ?? "expo-sent";
    return {success: true, messageId};
  } catch (error: unknown) {
    const err = error instanceof Error ? error.message : String(error);
    logger.error("sendExpoPush error", {err});
    return {success: false, error: err};
  }
}

/**
 * Callable: send a push notification.
 * Accepts either an FCM token (from getDevicePushTokenAsync) or an Expo push token
 * (from getExpoPushTokenAsync). Expo tokens work from any Expo app; FCM tokens must
 * be from the same Firebase project.
 */
export const sendPushNotification = onCall(
  async (request: CallableRequest): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> => {
    const {token, title, body} = (request.data || {}) as {
      token?: string;
      title?: string;
      body?: string;
    };

    if (!token || typeof token !== "string") {
      logger.warn("sendPushNotification: missing or invalid token");
      return {success: false, error: "Missing or invalid token"};
    }

    const trimmedToken = token.trim();
    const notificationTitle =
      typeof title === "string" && title.trim() ? title.trim() : "HeartSense";
    const notificationBody =
      typeof body === "string" && body.trim() ?
        body.trim() :
        "You have a new notification.";

    logger.info("sendPushNotification: received", {
      tokenPrefix: trimmedToken.slice(0, 30),
      tokenLength: trimmedToken.length,
      isExpoToken: isExpoPushToken(trimmedToken),
    });

    try {
      if (isExpoPushToken(trimmedToken)) {
        const result = await sendExpoPush({
          token: trimmedToken,
          title: notificationTitle,
          body: notificationBody,
        });
        if (result.success) {
          logger.info("sendPushNotification: sent via Expo", {
            messageId: result.messageId,
          });
        }
        return result.success
          ? {success: true, messageId: result.messageId}
          : {success: false, error: result.error};
      }

      const messageId = await admin.messaging().send({
        token: trimmedToken,
        notification: {title: notificationTitle, body: notificationBody},
        android: {
          priority: "high",
          notification: {
            title: notificationTitle,
            body: notificationBody,
          },
        },
        apns: {
          payload: {aps: {sound: "default"}},
          fcmOptions: {},
        },
      });
      logger.info("sendPushNotification: sent via FCM", {messageId});
      return {success: true, messageId};
    } catch (error: unknown) {
      const err = error as {code?: string; message?: string};
      if (
        err?.message?.includes("invalid") &&
        err?.message?.includes("registration token")
      ) {
        logger.warn("FCM rejected token, trying Expo API as fallback", {
          tokenPrefix: trimmedToken.slice(0, 30),
        });
        try {
          const result = await sendExpoPush({
            token: trimmedToken,
            title: notificationTitle,
            body: notificationBody,
          });
          if (result.success) {
            logger.info("sendPushNotification: sent via Expo (fallback)", {
              messageId: result.messageId,
            });
            return {success: true, messageId: result.messageId};
          }
          return {
            success: false,
            error: `FCM failed: ${err?.message}. Expo fallback: ${result.error}`,
          };
        } catch (expoErr: unknown) {
          logger.error("Both FCM and Expo failed", {
            fcmError: err,
            expoError: expoErr,
          });
          return {
            success: false,
            error: `FCM: ${err?.message}. Expo fallback also failed: ${
              expoErr instanceof Error ? expoErr.message : String(expoErr)
            }`,
          };
        }
      }
      logger.error("sendPushNotification failed", err);
      return {
        success: false,
        error: err?.message || String(error),
      };
    }
  }
);

const db = admin.firestore();

/** Screen identifier for deep link when user taps the elevated HR notification. */
const ELEVATED_HR_SCREEN = "symptom-entry";

/**
 * Callable: send an "elevated heart rate" push to the current user.
 * Called by the app when HealthKit reports heart rate at or above the user's threshold.
 * The backend looks up the user's stored Expo push token and sends the push so the
 * user gets the notification even when the app is in the background.
 */
export const sendElevatedHeartRatePush = onCall(
  async (request: CallableRequest): Promise<{
    success: boolean;
    messageId?: string;
    error?: string;
  }> => {
    const uid = request.auth?.uid;
    if (!uid) {
      logger.warn("sendElevatedHeartRatePush: unauthenticated");
      return {success: false, error: "Must be signed in"};
    }

    const {bpm} = (request.data || {}) as {bpm?: number};
    const body =
      typeof bpm === "number" && !Number.isNaN(bpm)
        ? `Your heart rate is ${bpm} bpm. Would you like to log a symptom?`
        : "An elevated heart rate was detected. Would you like to log a symptom?";

    const prefsSnap = await db.collection("user_preferences").doc(uid).get();
    const token = prefsSnap.exists
      ? (prefsSnap.data()?.expo_push_token as string | undefined)
      : undefined;

    if (!token || typeof token !== "string" || !token.trim()) {
      logger.info("sendElevatedHeartRatePush: no expo_push_token for user", {uid});
      return {success: false, error: "No push token. Open the app to register for notifications."};
    }

    const result = await sendExpoPush({
      token: token.trim(),
      title: "Elevated Heart Rate Detected",
      body,
      data: {screen: ELEVATED_HR_SCREEN},
    });

    if (result.success) {
      logger.info("sendElevatedHeartRatePush: sent", {uid, messageId: result.messageId});
    }
    return result.success
      ? {success: true, messageId: result.messageId}
      : {success: false, error: result.error};
  }
);

/**
 * When an engagement alert is created, send a push notification to the user's
 * device so they see it even when the app is closed or in the background.
 */
export const onEngagementAlertCreated = onDocumentCreated(
  {
    document: "engagement_alerts/{alertId}",
  },
  async (event) => {
    if (!event?.data) {
      logger.warn("onEngagementAlertCreated: no event data");
      return;
    }
    const snap = event.data;
    const data = snap.data();
    const alertId = snap.id;
    const userId = data?.userId as string | undefined;
    const title = (data?.title as string) || "HeartSense";
    const message = (data?.message as string) || "You have a new notification.";

    if (!userId) {
      logger.warn("onEngagementAlertCreated: alert missing userId", {alertId});
      return;
    }

    const prefsSnap = await db.collection("user_preferences").doc(userId).get();
    const token = prefsSnap.exists
      ? (prefsSnap.data()?.expo_push_token as string | undefined)
      : undefined;

    if (!token || typeof token !== "string" || !token.trim()) {
      logger.info("onEngagementAlertCreated: no expo_push_token for user", {
        userId,
        alertId,
      });
      return;
    }

    const result = await sendExpoPush({
      token: token.trim(),
      title,
      body: message,
      data: {screen: "engagement", alertId, alertType: data?.alertType},
    });

    if (result.success) {
      logger.info("onEngagementAlertCreated: push sent", {
        alertId,
        userId,
        messageId: result.messageId,
      });
    } else {
      logger.warn("onEngagementAlertCreated: push failed", {
        alertId,
        userId,
        error: result.error,
      });
    }
  }
);
