# HeartSense

HeartSense is a mobile health application designed for patients with cardiovascular conditions. It enables users to log symptoms, track daily wellbeing, monitor physical activity, and sync health data from Apple Watch via HealthKit — all with the goal of supporting better communication between patients and their care teams.

**GitHub Repository:** [github.com/CS342/2026-HeartSense](https://github.com/CS342/2026-HeartSense)

---

## Try the App via Expo Go (QR Code)

> **Note:** The Expo Go version does **not** include HealthKit integration, as HealthKit requires native iOS capabilities that are unavailable in the Expo Go runtime. To experience the full app with HealthKit/Apple Watch data syncing, you must build and run the app from source in Xcode (see [Running with HealthKit](#running-with-healthkit-xcode--ios-simulator) below).

<!-- TODO: Replace placeholder with actual QR code image -->
![Expo Go QR Code](https://via.placeholder.com/250x250?text=QR+Code+Coming+Soon)

Scan the QR code above with the **Expo Go** app ([iOS](https://apps.apple.com/app/expo-go/id982107779)) to open HeartSense on your device.

---

## Feature Overview

- **User Authentication** — Sign up, log in, and manage your account via Firebase Auth
- **Onboarding Flow** — Guided onboarding for new users including Apple Watch consent
- **Home Dashboard** — At-a-glance view of recent health data and sync status
- **Symptom Logging** — Record cardiovascular symptoms with timestamps
- **Wellbeing Rating** — Daily self-reported wellbeing check-ins
- **Activity Entry** — Log physical activity and exercise
- **Medical Conditions** — Track and manage existing medical conditions
- **Health History** — View historical symptom, wellbeing, and activity data
- **Profile Management** — View and edit user profile and preferences
- **HealthKit Integration (native build only)** — Automatic syncing of heart rate, step count, and other Apple Watch / Health data to Firebase
- **Help Screen** — In-app help and support resources

---

## Tech Stack & Dependencies

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54 (managed workflow) |
| Runtime | React Native 0.81.5, React 19.1 |
| Routing | Expo Router v6 (file-based) |
| Backend | Firebase (Firestore, Auth, Cloud Functions) |
| HealthKit | `@kingstinct/react-native-healthkit` v13.1.1 |
| UI | Lucide icons, Expo Linear Gradient, Reanimated |
| Notifications | `expo-notifications` |

See [`heart-sense-app/package.json`](heart-sense-app/package.json) for the full dependency list.

---

## Project Structure

```
2026-HeartSense/
├── heart-sense-app/          # Expo / React Native mobile app
│   ├── app/
│   │   ├── (tabs)/           # Tab-based screens (Home, Add, History, Messages, Profile)
│   │   ├── auth/             # Login & signup screens
│   │   ├── onboarding/       # Onboarding flow
│   │   └── screens/          # Standalone screens (symptom entry, wellbeing, etc.)
│   ├── components/           # Shared components (HealthDataTracker, etc.)
│   ├── contexts/             # React contexts (Auth, Onboarding)
│   ├── hooks/                # Custom hooks (useHealthKit, etc.)
│   └── types/                # TypeScript type definitions
├── heart-sense-firebase/     # Firebase backend
│   ├── functions/            # Cloud Functions
│   ├── firestore.rules       # Firestore security rules
│   └── firestore.indexes.json
└── README.md
```

---

## Setup Instructions

### Prerequisites

- **Node.js** (v18 or later recommended)
- **npm**
- **Expo CLI** — installed globally (`npm install -g expo-cli`) or use `npx expo`
- **Xcode** (required for iOS simulator / HealthKit builds)
- **Firebase CLI** — `npm install -g firebase-tools` (for backend deployment)

### 1. Clone the Repository

```bash
git clone https://github.com/CS342/2026-HeartSense.git
cd 2026-HeartSense
```

### 2. Install App Dependencies

```bash
cd heart-sense-app
npm install
```

### 3. Install Firebase Functions Dependencies

```bash
cd ../heart-sense-firebase/functions
npm install
cd ../..
```

---

## Backend Configuration (Firebase)

The app connects to a shared Firebase project. Access the Firebase console here:

**Firebase Console:** [cs342-2026-wong](https://console.firebase.google.com/u/1/project/cs342-2026-wong-3qriyd12e/overview)

The Firebase configuration is already included in the codebase. If you need to set up your own Firebase instance:

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** (Email/Password provider)
3. Create a **Firestore** database
4. Update the Firebase config in the app's source code with your project credentials
5. Deploy Firestore rules and Cloud Functions:

```bash
cd heart-sense-firebase
firebase deploy --only firestore:rules,functions
```

---

## Running the App

### Option 1: Expo Go (Quick Preview — No HealthKit)

```bash
cd heart-sense-app
npx expo start
```

Scan the QR code in the terminal with the Expo Go app on your iOS device. This mode does **not** support HealthKit.

### Option 2: Running with HealthKit (Xcode + iOS Simulator)

To use the full app with HealthKit / Apple Watch data integration, you must build a native iOS binary:

```bash
cd heart-sense-app
npm install
npx expo prebuild --platform ios
```

Then open the generated Xcode project:

```bash
open ios/*.xcworkspace
```

In Xcode:
1. Select an iOS Simulator target (e.g., iPhone 17 Pro)
2. Press **Cmd + R** to build and run
3. The HealthKit permission prompt will appear on first launch — grant access to enable health data syncing

> **Why Xcode?** HealthKit is a native Apple framework that requires iOS entitlements and native module linking. The Expo Go runtime cannot load these native modules, so a full native build via Xcode is required for HealthKit functionality.

---

## License

This project was developed as part of the CS342 course at Stanford University.
