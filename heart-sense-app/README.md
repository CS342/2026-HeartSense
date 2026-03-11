6# Medical Symptom Tracking App

A comprehensive mobile health tracking application designed for clinical research, specifically for sudden cardiac arrest and atrial fibrillation studies at Stanford.

## Overview

This app enables patients to easily record symptoms, activities, well-being ratings, and medical condition changes in real-time. The data collected supports clinical research and improves patient care pathways.

## Expo Preview

Scan the QR code below with your device camera (iOS) or the Expo Go app to preview the latest build:

[![Expo QR Code](https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https%3A%2F%2Fexpo.dev%2Fpreview%2Fupdate%3Fmessage%3DAdd%2BFirebase%2Bconsole%2Blink%2Bto%2BREADME%2Bfor%2Bteaching%2Bteam%2Baccess%250A%250ACo-Authored-By%253A%2BClaude%2BOpus%2B4.6%2B%253Cnoreply%2540anthropic.com%253E%26updateRuntimeVersion%3D1.0.0%26createdAt%3D2026-03-11T06%253A05%253A48.077Z%26slug%3Dexp%26projectId%3D4171cdf0-600d-4f1f-8fbd-209ec90d4982%26group%3D763655ff-10c8-466a-b4d4-091c90039ece)](https://expo.dev/preview/update?message=Add+Firebase+console+link+to+README+for+teaching+team+access%0A%0ACo-Authored-By%3A+Claude+Opus+4.6+%3Cnoreply%40anthropic.com%3E&updateRuntimeVersion=1.0.0&createdAt=2026-03-11T06%3A05%3A48.077Z&slug=exp&projectId=4171cdf0-600d-4f1f-8fbd-209ec90d4982&group=763655ff-10c8-466a-b4d4-091c90039ece)

[Open in Expo](https://expo.dev/preview/update?message=Add+Firebase+console+link+to+README+for+teaching+team+access%0A%0ACo-Authored-By%3A+Claude+Opus+4.6+%3Cnoreply%40anthropic.com%3E&updateRuntimeVersion=1.0.0&createdAt=2026-03-11T06%3A05%3A48.077Z&slug=exp&projectId=4171cdf0-600d-4f1f-8fbd-209ec90d4982&group=763655ff-10c8-466a-b4d4-091c90039ece)

## Features

### Core Functionality

1. **Symptom Tracking**
   - Log symptoms with type, severity (1-10), and detailed descriptions
   - Common symptoms: Chest pain, shortness of breath, palpitations, dizziness, fatigue
   - Timestamp recording for accurate temporal analysis

2. **Daily Well-being Ratings**
   - Rate overall well-being on a 1-10 scale
   - Add optional notes about how you're feeling
   - One rating per day with visual emoji feedback

3. **Activity Logging**
   - Track various activities: exercise, walking, running, cycling, swimming, work, rest, sleep
   - Record duration and intensity level (low, moderate, high)
   - Add detailed descriptions of activities

4. **Medical Condition Changes**
   - Report medication changes (new, changed, stopped)
   - Document new diagnoses, procedures, hospitalizations
   - Track doctor visits and emergency room visits

5. **Health Data Collection**
   - Automated collection from wearable devices (when available)
   - Heart rate monitoring
   - Step count tracking
   - Accelerometer data
   - Data collected at one-minute intervals

6. **History Timeline**
   - View all entries in chronological order
   - Color-coded by entry type for easy identification
   - Quick access to past symptoms, activities, and ratings

7. **MyHealth Messages Integration**
   - View messages from healthcare providers
   - Read/unread status tracking
   - Secure messaging through MyHealth system
   - Message history and notifications

8. **AI-Powered Help & FAQs**
   - Interactive AI chat for symptom questions
   - Comprehensive FAQ section
   - Emergency guidance and when to seek care
   - 24/7 access to health information

9. **Smart Symptom Tracking**
   - Previous severity display when logging recurring symptoms
   - Comparison with past entries
   - Historical context for better reporting

10. **Engagement Alerts**
    - Dashboard notifications when inactive for 2+ days
    - Encouragement to maintain consistent tracking
    - Research participation reminders

## Technical Architecture

### Frontend
- **Framework**: React Native with Expo Router
- **Navigation**: Tab-based navigation with stack navigation for detail screens
- **State Management**: React Context API for authentication
- **UI Components**: Custom components with consistent design system
- **Icons**: Lucide React Native

### Backend
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with email/password
- **Security**: Row Level Security (RLS) policies on all tables
- **Real-time**: Ready for real-time updates via Supabase subscriptions

### Database Schema

**Tables:**
- `profiles` - User profile information
- `symptoms` - Patient-reported symptoms with severity ratings
- `well_being_ratings` - Daily overall well-being assessments
- `activities` - Activity logs with duration and intensity
- `medical_conditions` - Medical condition changes and updates
- `health_data` - Automated health metrics from wearable devices
- `myhealth_messages` - Messages from healthcare providers via MyHealth

All tables include:
- User ownership via `user_id`
- Timestamp tracking (`occurred_at`, `created_at`)
- Proper indexing for query performance
- RLS policies ensuring data privacy

## App Structure

```
app/
├── (tabs)/                  # Main tab navigation
│   ├── index.tsx           # Home/Dashboard with engagement alerts
│   ├── add.tsx             # Quick entry screen
│   ├── messages.tsx        # MyHealth messages integration
│   ├── help.tsx            # AI chat and FAQ screen
│   ├── history.tsx         # Timeline of all entries
│   └── profile.tsx         # User profile and settings
├── auth/                    # Authentication screens
│   ├── login.tsx
│   └── signup.tsx
├── screens/                 # Detail entry screens
│   ├── symptom-entry.tsx   # With previous severity display
│   ├── wellbeing-rating.tsx
│   ├── activity-entry.tsx
│   └── medical-condition.tsx
├── _layout.tsx             # Root layout with auth provider
└── index.tsx               # Entry point with auth routing

contexts/
└── AuthContext.tsx         # Authentication state management

lib/
└── supabase.ts            # Supabase client configuration

components/
└── HealthDataTracker.tsx  # Health data collection component

types/
└── database.ts            # TypeScript type definitions
```

## Key Design Decisions

1. **User-First Design**
   - Clean, intuitive interface optimized for quick data entry
   - Color-coded categories for easy visual identification
   - Minimal friction from symptom occurrence to logging

2. **Data Privacy**
   - All data encrypted in transit and at rest
   - RLS policies ensure users only access their own data
   - Secure authentication with Supabase

3. **Clinical Research Ready**
   - Precise timestamp recording for temporal analysis
   - Structured data format for easy export and analysis
   - Support for both manual and automated data collection

4. **Extensible Architecture**
   - Easy to add new symptom types or activity categories
   - Modular component structure
   - Type-safe with TypeScript

## Use Cases

### Sudden Cardiac Arrest Study
- Track symptoms preceding cardiac events
- Correlate with wearable device data
- Build predictive models for early intervention

### Atrial Fibrillation Care Pathway
- Monitor patient symptoms and treatment effectiveness
- Track medication adherence and changes
- Improve patient satisfaction and outcomes

## Future Enhancements

Potential additions for future versions:
- Push notifications for daily reminders
- Data export for research purposes
- Integration with additional wearable devices
- Graphical data visualization and trends
- Multi-language support
- Offline mode with sync capabilities

## Security & Privacy

- HIPAA-compliant infrastructure (Supabase)
- End-to-end encryption
- Row Level Security on all database tables
- Secure authentication with password hashing
- No data sharing without explicit consent

## Getting Started

The app is ready to use. Users can:
1. Sign up with email and password
2. Complete their profile
3. Start logging symptoms, activities, and well-being ratings
4. View their history and track patterns over time

All data is immediately available for clinical research analysis through the Supabase dashboard.

## Apple Health / HealthKit Integration (Apple Watch sync)

This project can integrate with Apple HealthKit (Apple Watch) using the `react-native-healthkit` native module. Because this is a native iOS capability, the app must be built with the iOS native project present (Expo prebuild or a bare React Native project). Below are the steps and notes to enable HealthKit support.

1) Install the dependency

```bash
cd heart-sense-app
yarn add react-native-healthkit
# or npm install react-native-healthkit --save
```

2) For Expo managed apps: create the native projects via prebuild, or use EAS Build with a custom dev client.

```bash
# generate native iOS/android projects
npx expo prebuild --platform ios

# then install CocoaPods
cd ios && pod install
```

3) Open the generated Xcode workspace (`ios/YourApp.xcworkspace`) and enable the HealthKit capability for your app target (Signing & Capabilities -> + Capability -> HealthKit). This will add the required entitlements.

4) Make sure `NSHealthShareUsageDescription` and `NSHealthUpdateUsageDescription` are present (already added to `app.json` for Expo builds). If using a bare project, add these keys to `ios/<AppName>/Info.plist` with user-facing strings.

5) Entitlements: ensure the `healthkit` entitlement is set in the app's entitlements file (Xcode handles this when you enable the capability). If building with EAS, configure the entitlement in your provisioning profile and ensure EAS builds use a profile that includes HealthKit.

6) Run the app on an iOS device or simulator (simulator supports HealthKit for simple testing with synthetic data). If using the simulator, ensure you are running the latest iOS simulator via Xcode and add sample Health data via the simulator's Debug -> Health Data menu.

7) Usage in code

Import the lightweight wrapper at `lib/healthkit.ts` and request permissions before reading/writing:

```ts
import HealthKit from '../lib/healthkit'

await HealthKit.requestAuthorization({
   read: ['step_count', 'heart_rate'],
   write: ['step_count']
})

const steps = await HealthKit.getStepCount(new Date(Date.now()-86400000), new Date())
```

Notes and caveats:
- You must rebuild the native iOS app after installing the library (`expo prebuild` + `pod install` or a fresh Xcode build).
- Locally you will need Xcode and CocoaPods installed to run on the iOS simulator or device.
- For App Store distribution, ensure your Apple Developer provisioning profile and entitlements include HealthKit.
- For EAS builds, configure `eas.json` to use a credentials profile with HealthKit enabled.

If you'd like, I can:
- Run the dependency install and `expo prebuild` here (requires network and local toolchain) or
- Prepare an EAS build profile and entitlements changes for automated building.
