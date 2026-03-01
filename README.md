# HeartSense

A cardiac health tracking app for patients with heart conditions, built as part of Stanford CS342. HeartSense enables daily symptom logging, wellbeing self-assessment, activity tracking, and automatic Apple Watch vitals syncing — giving both patients and their care team meaningful insight into day-to-day heart health.

## Features

### Symptom Logging
- 12 symptom types: Dizziness, Fainting, Chest Pain, Racing Heart, Shortness of Breath, Palpitations, Fatigue, Swelling, Sense of Doom, Weakness, Loss of Vision, and Other
- 1–5 severity scale with clinically anchored descriptions (inspired by KCCQ PRO measures)
- Automatic vitals context — captures surrounding HealthKit data at time of symptom entry
- Previous entry comparison to track changes over time

### Well-being Ratings
- Energy level, stress level, and mood on a 1–5 scale
- Free-text notes
- Previous rating comparison with relative timestamps

### Activity Tracking
- Activity type, duration, and intensity (low/moderate/high)
- Timestamped records stored in Firestore

### Medical Condition Changes
- Log new diagnoses, medication changes, or other medical updates
- Timestamped history accessible from the History tab

### History
- Unified timeline of all entries (symptoms, wellbeing, activities, medical changes)
- Filter chips to view specific entry types
- Tap any entry for a detail view with full information

### Apple Watch / HealthKit Integration
- Syncs heart rate, HRV, resting heart rate, blood oxygen, respiratory rate, and step count
- Daily sync pulls the last 24 hours of data on app launch
- Sync status badge on the Home screen header

### Engagement Notifications
- Cloud Functions monitor patient activity
- Daily reminders and inactivity alerts to encourage consistent logging

### Onboarding & Profile
- Firebase Authentication (email/password)
- Guided onboarding flow with Apple Watch consent
- Profile screen with account details and sign-out

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54 (managed workflow) |
| UI | React Native 0.81.5, React 19.1 |
| Navigation | Expo Router v6 (file-based) |
| Backend | Firebase (Firestore, Auth, Cloud Functions) |
| HealthKit | @kingstinct/react-native-healthkit v13.1.1 |
| Icons | lucide-react-native |

## Project Structure

```
heart-sense-app/          # Expo / React Native app
  app/
    (tabs)/               # Tab screens (Home, History, Add, Profile)
    screens/              # Full-screen flows (symptom entry, wellbeing, etc.)
  lib/                    # Firebase config, auth, symptom/activity services
  services/healthkit/     # HealthKit client, sync service, type mappers
  contexts/               # AuthContext, OnboardingContext
  hooks/                  # useHealthKit, useFrameworkReady
  theme/                  # App color palette

heart-sense-firebase/     # Firebase Cloud Functions
  functions/src/
    engagement/           # Scheduled engagement checks & reminders
    notifications/        # Push notification delivery
```

## Getting Started

### Prerequisites

- **Node.js 20** (v25 is not supported by Expo CLI)
  ```bash
  fnm use 20
  ```
- **Xcode** with iOS simulator (iPhone 17 Pro recommended)
- **CocoaPods** (installed via Xcode or `gem install cocoapods`)

### Install & Run

```bash
# Clone the repo
git clone https://github.com/CS342/2026-HeartSense.git
cd 2026-HeartSense/heart-sense-app

# Install dependencies
npm install

# Generate native iOS project
npx expo prebuild --platform ios

# Install CocoaPods
cd ios && pod install && cd ..

# Open in Xcode and build (Cmd+B), then start Metro:
npx expo start
```

> If Metro shows "No script URL provided" in the simulator, kill any stale Metro processes and restart with `npx expo start` from a terminal that has the correct Node version active.

### Firebase

The app connects to a shared Firebase project. Environment config is in `lib/firebase.ts`. Cloud Functions live in `heart-sense-firebase/` and can be deployed with:

```bash
cd heart-sense-firebase/functions
npm install
npx firebase deploy --only functions
```

## Team

Stanford CS342 — 2026 HeartSense Team
