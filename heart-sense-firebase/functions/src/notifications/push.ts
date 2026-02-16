/**
 * Push notification functions for HeartSense.
 * Sends push notifications via FCM or Expo Push API depending on token type.
 */

import * as admin from "firebase-admin";
import {onCall, CallableRequest} from "firebase-functions/v2/https";
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
        const res = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: trimmedToken,
            title: notificationTitle,
            body: notificationBody,
            sound: "default",
          }),
        });
        const data = (await res.json()) as {
          data?: {status?: string; id?: string}[];
          errors?: {message: string}[];
        };
        if (!res.ok || (data.errors && data.errors.length > 0)) {
          const errMsg =
            data.errors?.[0]?.message || `Expo API ${res.status}`;
          logger.error("sendPushNotification Expo failed", {
            status: res.status,
            data,
          });
          return {success: false, error: errMsg};
        }
        const ticket = data.data?.[0];
        const messageId = ticket?.id ?? ticket?.status ?? "expo-sent";
        logger.info("sendPushNotification: sent via Expo", {messageId});
        return {success: true, messageId};
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
          const res = await fetch(EXPO_PUSH_URL, {
            method: "POST",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: trimmedToken,
              title: notificationTitle,
              body: notificationBody,
              sound: "default",
            }),
          });
          const data = (await res.json()) as {
            data?: {status?: string; id?: string}[];
            errors?: {message: string}[];
          };
          if (!res.ok || (data.errors && data.errors.length > 0)) {
            const errMsg =
              data.errors?.[0]?.message || `Expo API ${res.status}`;
            logger.error("sendPushNotification Expo fallback failed", {
              status: res.status,
              data,
            });
            return {
              success: false,
              error: `FCM failed: ${err?.message}. Expo fallback: ${errMsg}`,
            };
          }
          const ticket = data.data?.[0];
          const messageId = ticket?.id ?? ticket?.status ?? "expo-sent";
          logger.info("sendPushNotification: sent via Expo (fallback)", {
            messageId,
          });
          return {success: true, messageId};
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
