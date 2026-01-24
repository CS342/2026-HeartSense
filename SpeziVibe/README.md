# Team Heart - SpeziVibe (Cross-Platform)

This is the cross-platform implementation of Team Heart using Stanford's SpeziVibe toolkit (React Native + Expo).

## Why SpeziVibe?

SpeziVibe offers an alternative to native Swift development:

| Aspect | Native Swift (PAWS) | SpeziVibe (React Native) |
|--------|---------------------|--------------------------|
| Platforms | iOS only | iOS, Android, Web |
| Language | Swift | TypeScript |
| HealthKit | Full access | iOS only (requires native build) |
| Development speed | Moderate | Fast (hot reload) |
| AI assistance | Limited | Built-in (Cursor/Claude ready) |
| Backend | Firebase | Firebase, Medplum (FHIR), Local |

## Quick Start

### Prerequisites
- Node.js 20+
- For iOS: Xcode, Apple Developer account (for HealthKit)
- For Android: Android Studio

### Setup

```bash
# Navigate to SpeziVibe directory
cd /Users/arianalotfi/TeamHeart/SpeziVibe

# Create the app (interactive)
npx create-spezivibe-app teamheart-app

# When prompted, select:
# - Backend: Medplum (for FHIR/MedPlum integration) or Firebase
# - Features: Chat, Scheduler, Questionnaire, Onboarding, HealthKit

# Navigate to created app
cd teamheart-app

# Start development
npx expo start
```

### For HealthKit (iOS only)

HealthKit requires a custom dev client:

```bash
# Build native iOS app (requires Xcode)
npx expo run:ios
```

## Recommended Feature Selection

For Team Heart V1, select these features during setup:

1. **Onboarding** - Welcome flow, consent, account creation
2. **Scheduler** - Daily reminders for symptoms/well-being/activities
3. **Questionnaire** - FHIR-compliant symptom surveys
4. **HealthKit** - Heart rate, steps, activity from Apple Watch
5. **Chat** - AI-powered FAQ and symptom guidance

## Backend Choice

### Option 1: Medplum (Recommended for Clinical)
- FHIR R4 compliant (healthcare standard)
- Direct integration with MedPlum (from your requirements)
- Cloud or self-hosted options

### Option 2: Firebase
- Easy setup
- Good for rapid prototyping
- Same backend as PAWS

### Option 3: Local
- No server required
- Good for testing
- Data stays on device

## Project Structure (After Setup)

```
teamheart-app/
├── app/                      # Expo Router pages
│   ├── (onboarding)/         # Auth & welcome flows
│   │   ├── welcome.tsx
│   │   ├── consent.tsx
│   │   └── login.tsx
│   ├── (tabs)/               # Main app tabs
│   │   ├── home.tsx          # Dashboard
│   │   ├── symptoms.tsx      # Symptom logging
│   │   ├── wellbeing.tsx     # Daily check-in
│   │   ├── activities.tsx    # Activity log
│   │   ├── history.tsx       # Past logs
│   │   └── chat.tsx          # AI FAQ
│   └── _layout.tsx
├── components/               # Reusable UI components
├── features/                 # Feature modules
│   ├── scheduler/
│   ├── questionnaire/
│   ├── healthkit/
│   └── chat/
├── services/                 # Backend services
│   ├── AccountService.ts
│   └── BackendService.ts
└── package.json
```

## Custom Configuration

After scaffolding, customize for Team Heart:

### 1. Configure Reminders (Scheduler)

```typescript
// features/scheduler/tasks.ts
export const teamHeartTasks = [
  {
    id: 'morning-wellbeing',
    title: 'Good morning! How are you feeling?',
    schedule: { hour: 8, minute: 0, recurrence: 'daily' }
  },
  {
    id: 'symptom-check',
    title: 'Any symptoms to report?',
    schedule: { hour: 14, minute: 0, recurrence: 'daily' }
  },
  {
    id: 'evening-activity',
    title: 'Log today\'s activities',
    schedule: { hour: 20, minute: 0, recurrence: 'daily' }
  }
];
```

### 2. Configure HealthKit Types

```typescript
// features/healthkit/config.ts
export const healthKitConfig = {
  read: [
    'HKQuantityTypeIdentifierHeartRate',
    'HKQuantityTypeIdentifierStepCount',
    'HKQuantityTypeIdentifierActiveEnergyBurned',
    'HKQuantityTypeIdentifierRestingHeartRate',
    'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
  ]
};
```

### 3. Create Symptom Questionnaire (FHIR)

```typescript
// features/questionnaire/symptom-survey.ts
export const symptomQuestionnaire = {
  resourceType: 'Questionnaire',
  id: 'symptom-log',
  title: 'Symptom Log',
  item: [
    {
      linkId: 'symptom-type',
      text: 'What symptom are you experiencing?',
      type: 'choice',
      answerOption: [
        { valueCoding: { code: 'palpitations', display: 'Palpitations' }},
        { valueCoding: { code: 'chest-pain', display: 'Chest pain' }},
        { valueCoding: { code: 'shortness-of-breath', display: 'Shortness of breath' }},
        { valueCoding: { code: 'dizziness', display: 'Dizziness' }},
        { valueCoding: { code: 'fatigue', display: 'Fatigue' }},
      ]
    },
    {
      linkId: 'severity',
      text: 'How severe is this symptom?',
      type: 'integer',
      extension: [{ url: 'minValue', valueInteger: 1 }, { url: 'maxValue', valueInteger: 10 }]
    },
    {
      linkId: 'is-normal',
      text: 'Does this feel normal for you?',
      type: 'boolean'
    }
  ]
};
```

## Development Commands

```bash
# Start development server
npx expo start

# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android

# Run on web
npx expo start --web

# Build for production
eas build --platform ios
eas build --platform android
```

## AI-Assisted Development

SpeziVibe is optimized for AI coding tools. The repo includes:
- `.cursorrules` - Cursor AI configuration
- `CLAUDE.md` - Claude Code instructions

Use prompts like:
- "Add a symptom logging screen with severity slider"
- "Create a streak counter component"
- "Implement daily well-being scoring UI"

## Next Steps

1. Run `npx create-spezivibe-app teamheart-app`
2. Select Medplum backend + all features
3. Customize screens for Team Heart
4. Add symptom/wellbeing/activity logging
5. Configure HealthKit for cardiac metrics
6. Set up AI chat for FAQ
