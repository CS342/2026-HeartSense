# Team Heart

Cardiac patient symptom tracking and engagement app for high-risk cardiac patients.

## Two Implementation Options

| Option | Technology | Platforms | Best For |
|--------|-----------|-----------|----------|
| **Native Swift** | Swift + Spezi Framework | iOS only | Full HealthKit access, native performance |
| **SpeziVibe** | React Native + Expo | iOS, Android, Web | Cross-platform, faster development |

### Option 1: Native Swift (Recommended for V1)
Based on Stanford's PAWS project. Full HealthKit integration, native iOS experience.
See: [REUSABLE_CODE_ANALYSIS.md](REUSABLE_CODE_ANALYSIS.md)

### Option 2: SpeziVibe (Cross-Platform)
React Native/Expo toolkit with FHIR support, AI chat, and MedPlum integration.
See: [SpeziVibe/README.md](SpeziVibe/README.md)

---

## Native Swift Implementation

## Project Structure

```
TeamHeart/
├── TeamHeart.swift              # Main app entry point
├── TeamHeartDelegate.swift      # Spezi configuration
├── TeamHeartStandard.swift      # Data handling standards
├── Home.swift                   # Main TabView
│
├── Onboarding/                  # User onboarding flow
├── Account/                     # Account management
├── Reminders/                   # Notification scheduling
├── SymptomLogging/              # Symptom entry & tracking
├── Wellbeing/                   # Daily well-being scores
├── Activities/                  # Activity & medication logging
├── Engagement/                  # Streaks & gamification
├── History/                     # Historical data views
├── Education/                   # FAQ & AI chat
├── Contacts/                    # Study contacts
├── Resources/                   # Assets, consent docs
└── Supporting Files/            # Config & feature flags
```

## Reused from PAWS

This project reuses significant code from [Stanford's Pediatric Apple Watch Study](https://github.com/StanfordBDHG/PediatricAppleWatchStudy):

- Authentication & account management
- Onboarding flow structure
- HealthKit integration patterns
- Notification/reminder system
- Firebase backend architecture
- Consent management

See [REUSABLE_CODE_ANALYSIS.md](REUSABLE_CODE_ANALYSIS.md) for detailed mapping.

## Setup

1. Clone the PAWS repository for reference
2. Install Spezi dependencies via Swift Package Manager
3. Configure Firebase project
4. Update `GoogleService-Info.plist`
5. Modify consent document in `Resources/`

## V1 Features

- [ ] Fast symptom & activity logging
- [ ] Daily well-being scores
- [ ] Smart reminders (morning, evening, symptom check)
- [ ] HealthKit data sync (HR, steps, activity)
- [ ] Streaks & completion indicators
- [ ] History view (read-only)
- [ ] FAQ & education

## V1 Goals

- **80%** of users logging daily
- **50%** of users logging at least twice per day
- High-fidelity, time-stamped data suitable for research

## Key Dependencies

```swift
dependencies: [
    .package(url: "https://github.com/StanfordSpezi/Spezi.git", from: "1.0.0"),
    .package(url: "https://github.com/StanfordSpezi/SpeziAccount.git", from: "1.0.0"),
    .package(url: "https://github.com/StanfordSpezi/SpeziFirebase.git", from: "1.0.0"),
    .package(url: "https://github.com/StanfordSpezi/SpeziHealthKit.git", from: "1.0.0"),
    .package(url: "https://github.com/StanfordSpezi/SpeziScheduler.git", from: "1.0.0"),
    .package(url: "https://github.com/StanfordSpezi/SpeziOnboarding.git", from: "1.0.0"),
]
```
