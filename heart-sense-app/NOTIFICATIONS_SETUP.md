# Using the instructor's Firebase project for notifications

Your app uses **two Firebase projects**:

1. **Your project** (e.g. `heartsense-772bd`) – Auth, Firestore, and your own Cloud Functions (engagement, etc.).
2. **Instructor's project** – Used only for notification-related Cloud Functions (billing enabled for FCM).

---

## Part 1: Config (you already did this)

You added the instructor's config in **`lib/firebaseNotifications.ts`** (`notificationsFirebaseConfig`). The app uses that to call functions on the instructor's project.

---

## Part 2: Deploy functions

### A. Your project (HeartSense backend)

Your existing engagement/data functions deploy to **your** project:

```bash
cd heart-sense-firebase
npm install   # if you haven’t
firebase deploy --only functions
```

Use this whenever you change code in `heart-sense-firebase/functions`.

### B. Instructor's project (notification sending)

To send **push notifications**, a small function must be deployed to the **instructor's** project.

1. **Set the instructor's project ID**
   - Open **`instructor-notifications/.firebaserc`** (in the repo root, next to `heart-sense-app` and `heart-sense-firebase`).
   - Replace `REPLACE_WITH_INSTRUCTOR_PROJECT_ID` with the instructor's Firebase **project ID** (same as `projectId` in `lib/firebaseNotifications.ts`).

2. **Install and deploy**
   ```bash
   cd instructor-notifications/functions
   npm install
   npm run build
   cd ..
   firebase deploy --only functions
   ```
   If `firebase` isn’t linked yet:
   ```bash
   firebase login
   firebase use default   # uses the project in .firebaserc
   firebase deploy --only functions
   ```

3. **Enable Anonymous auth (required for callable)**
   - In Firebase Console → **instructor's project** → **Authentication** → **Sign-in method**.
   - Enable **Anonymous** and save. The app signs in anonymously to this project so the callable request is authenticated.

4. **Confirm**
   - In [Firebase Console](https://console.firebase.google.com) → **instructor's project** → Build → **Functions**.
   - You should see **`sendPushNotification`**.

---

## Part 3: Get an FCM token (for testing)

To send a push to a device, the instructor's function needs that device’s **FCM token**.

### Option 1: From the app (recommended)

1. Run the app on a **real device** (push does not work on simulators): `npm install` then `npx expo start`, and open on a physical phone (Expo Go or dev build).
2. Open **Profile** → scroll to **Test push (instructor's project)**.
3. Tap **Get my push token**. Allow notifications if prompted.
4. The token fills the field. Tap **Send test push** to send a test to this device.

On **Android** this is an FCM token and works with `sendPushNotification`. On **iOS** it may be APNs (instructor's project may need APNs configured in Firebase if send fails).

### Option 2: From Firebase Console

1. Open the **instructor's** project in Firebase Console.
2. Go to **Engage** → **Messaging** (or **Cloud Messaging**).
3. Click **Create your first campaign** or **New campaign** → **Firebase Notification messages**.
4. Enter title/body and go to the end; use **Send test message**.
5. Add your device (or an FCM token if you have one from the app or from another tool).

You can also get the token in code (e.g. with `expo-notifications` or Firebase Messaging in the app) and log it, then paste it into the Profile test field.

---

## Part 4: Send and test a notification

1. **Get a token** (see Part 3) and, if needed, paste it into **Profile** → **Test push notification** → token field.
2. Tap **Send test push**.
3. The app calls the instructor's **`sendPushNotification`** with that token and a test title/body. You should get a push on the device that owns the token.

If it fails, check:

- Instructor's project is on **Blaze** and **Cloud Messaging** is enabled.
- **`sendPushNotification`** is deployed (Part 2B).
- **`lib/firebaseNotifications.ts`** uses the **same** project ID as the one you deploy to.
- The token is from the **instructor's** project (same app/config as in `firebaseNotifications.ts`).

---

## Part 5: Call notification functions from code

For any callable on the **instructor's** project (e.g. send push, subscribe to topics):

```ts
import { callNotificationFunction } from "@/lib/firebaseNotifications";

await callNotificationFunction("sendPushNotification", {
  token: fcmToken,
  title: "Reminder",
  body: "Time to log your well-being.",
});
```

Your **auth and Firestore** stay on your project; only notification-related callables use the instructor's project.
