# Instructor project – notification functions

Deploy these functions to the **instructor's** Firebase project (the one with billing enabled) so the app can send FCM push notifications.

## Important: always deploy from this folder

Firebase uses the **current directory** to choose which project and `firebase.json` to use. If you run `firebase deploy` from `heart-sense-firebase/` or the repo root, it will use **your** project. So always run deploy **from inside `instructor-notifications/`**.

## One-time setup

1. **Install function dependencies**
   ```bash
   cd instructor-notifications/functions
   npm install
   cd ..
   ```

2. **Login** (if needed)
   ```bash
   firebase login
   ```

## Deploy to the instructor's project

From the **`instructor-notifications`** folder only:

```bash
cd instructor-notifications
npm run deploy
```

This runs `firebase deploy --only functions --project cs342-2026-wong-3qriyd12e`, so it **always** deploys to the instructor's project even if you're in the wrong directory.

If you need to use a different instructor project ID, edit the `deploy` script in **`instructor-notifications/package.json`** and change the `--project` value (and keep `.firebaserc` in sync).

**Check which project will be used:**
```bash
cd instructor-notifications
npm run project
```
You should see: `Now using project cs342-2026-wong-3qriyd12e`.

After deploy, the callable **`sendPushNotification`** will be available in the instructor's project. The app calls it via `callNotificationFunction("sendPushNotification", { token, title, body })`.

## Function

- **`sendPushNotification`** (callable)
  - **Input:** `{ token: string, title?: string, body?: string }`
  - **Output:** `{ success: boolean, messageId?: string, error?: string }`
  - Sends one FCM message to the given device token.
