# Team Heart: Reusable Code from PediatricAppleWatchStudy (PAWS)

This document maps reusable code from the [Stanford PAWS repository](https://github.com/StanfordBDHG/PediatricAppleWatchStudy) to your Team Heart project requirements.

---

## Quick Reference: Reusability Matrix

| Team Heart Feature | PAWS Source | Reusability | Modifications Needed |
|-------------------|-------------|-------------|---------------------|
| Authentication | `PAWS/Onboarding/AccountOnboarding.swift` | High | Minimal - update branding |
| Onboarding Flow | `PAWS/Onboarding/OnboardingFlow.swift` | High | Add symptom intro screens |
| HealthKit Permissions | `PAWS/Onboarding/HealthKitPermissions.swift` | High | Update data types |
| Notification System | `PAWS/Reminders/Scheduler+Reminders.swift` | High | Expand for multiple reminder types |
| Consent Management | `PAWS/Onboarding/Consent.swift` | High | Update consent document |
| Firebase Backend | `functions/index.js` | High | Add symptom/survey endpoints |
| Firestore Rules | `firestore.rules` | High | Extend for new collections |
| Data Standards | `PAWS/PAWSStandard.swift` | Medium | Adapt for symptom data |
| Invitation Codes | `PAWS/Onboarding/InvitationCodeView.swift` | High | Direct reuse |
| Home TabView | `PAWS/Home.swift` | Medium | Replace tabs with Team Heart features |

---

## 1. Authentication & Account Management

### Source Files
```
PAWS/Onboarding/AccountOnboarding.swift
PAWS/Onboarding/InvitationCodeView.swift
PAWS/Onboarding/InvitationCodeError.swift
PAWS/Account/AccountSheet.swift
PAWS/Account/AccountButton.swift
PAWS/Account/DateOfEnrollment.swift
```

### What You Can Reuse
- **Firebase Authentication setup** with email/password and Sign in with Apple
- **Invitation code validation** system (perfect for clinical study enrollment)
- **Account sheet UI** for profile viewing/editing
- **Enrollment date tracking**

### Adaptation for Team Heart
```swift
// From PAWSDelegate.swift - Account Configuration
// Reuse this pattern, modify stored fields for cardiac patients:

AccountConfiguration(
    service: FirebaseAccountService(providers: [.emailAndPassword, .signInWithApple]),
    storageProvider: FirestoreAccountStorage(
        storeIn: FirebaseConfiguration.userCollection
    ),
    configuration: [
        // MODIFY: Add cardiac-specific fields
        AccountKeyConfiguration(
            name: PersonNameKey.self,
            requirement: .required
        ),
        AccountKeyConfiguration(
            name: DateOfBirthKey.self,  // Keep for risk stratification
            requirement: .required
        ),
        // ADD: Cardiac condition type
        // ADD: Physician contact
        // ADD: Emergency contact
    ]
)
```

---

## 2. Onboarding Flow

### Source Files
```
PAWS/Onboarding/OnboardingFlow.swift
PAWS/Onboarding/Welcome.swift
PAWS/Onboarding/InterestingModules.swift
```

### What You Can Reuse
- **ManagedNavigationStack** pattern for multi-step onboarding
- **Welcome screen** structure
- **Feature flag handling** for Firebase/emulator modes
- **AppStorage** for tracking onboarding completion

### Team Heart Onboarding Steps (Adapted)
```swift
// Adapt OnboardingFlow.swift structure:

var body: some View {
    ManagedNavigationStack(path: $managedNavigationPath) {
        Welcome()                           // REUSE: Update branding

        // NEW: Team Heart specific
        SymptomEducation()                  // What symptoms to report
        ActivityEducation()                 // What activities to log
        WellbeingScoreIntro()              // Daily check-in explanation

        // REUSE: From PAWS
        InvitationCodeView()               // Study enrollment
        AccountOnboarding()                // Account creation
        Consent()                          // Study consent
        HealthKitPermissions()             // Wearable data access
        NotificationPermissions()          // Daily reminders

        // NEW: Team Heart specific
        ReminderPreferences()              // Customize reminder times
        OnboardingComplete()               // Success + first log prompt
    }
}
```

---

## 3. HealthKit & Wearable Data Integration

### Source Files
```
PAWS/Onboarding/HealthKitPermissions.swift
PAWS/PAWSDelegate.swift (HealthKit configuration)
PAWS/PAWSStandard.swift (data handling)
```

### PAWS HealthKit Configuration (to adapt)
```swift
// From PAWSDelegate.swift:
HealthKit {
    // PAWS collects ECG - you need different metrics
    CollectSamples(
        [
            HKElectrocardiogram.self,
            // ... ECG symptoms
        ],
        deliverySetting: .anchorQuery(.afterAuthorizationAndApplicationWillLaunch)
    )
}
```

### Team Heart HealthKit Configuration
```swift
// ADAPT for Team Heart requirements:
HealthKit {
    CollectSamples(
        [
            // Heart metrics (from your requirements)
            HKQuantityType(.heartRate),
            HKQuantityType(.heartRateVariabilitySDNN),
            HKQuantityType(.restingHeartRate),

            // Activity metrics
            HKQuantityType(.stepCount),
            HKQuantityType(.activeEnergyBurned),
            HKQuantityType(.distanceWalkingRunning),

            // Additional cardiac indicators
            HKQuantityType(.vo2Max),
            HKQuantityType(.physicalEffort),

            // Accelerometer data (if needed)
            // Note: Raw accelerometer requires different approach
        ],
        // Collect once per minute when available
        deliverySetting: .anchorQuery(.afterAuthorizationAndApplicationWillLaunch)
    )
}
```

### Permission Request View
```swift
// REUSE HealthKitPermissions.swift structure
// MODIFY: Icon and text for cardiac context

var body: some View {
    OnboardingView(
        title: "Heart Health Data",  // MODIFY
        subtitle: "Team Heart needs access to your health data to synchronize with your symptom reports.",  // MODIFY
        areas: [
            OnboardingInformationView.Content(
                icon: Image(systemName: "heart.fill"),  // MODIFY from paw
                title: "Heart Rate",
                description: "Continuous heart rate from your Apple Watch"
            ),
            OnboardingInformationView.Content(
                icon: Image(systemName: "figure.walk"),
                title: "Activity",
                description: "Steps and exercise data"
            )
        ]
    ) {
        // REUSE: Permission request logic
    }
}
```

---

## 4. Notification & Reminder System

### Source Files
```
PAWS/Reminders/Scheduler+Reminders.swift
PAWS/Onboarding/NotificationPermissions.swift
```

### PAWS Reminder Code (Current)
```swift
// Simple single daily reminder
extension Scheduler {
    func scheduleReminders(time: DateComponents) async throws {
        try createOrUpdateTask(
            id: "PAWS Reminder",
            title: "Friendly reminder to record your ECG!",
            instructions: "Thank you for participating in the PAWS study!",
            category: .custom("Reminder"),
            schedule: .init(
                startingAt: Calendar.current.startOfDay(for: .now),
                recurrence: .daily(calendar: .current, end: .afterOccurrences(7), hours: hours, minutes: minutes)
            )
        )
    }
}
```

### Team Heart Reminder System (Extended)
```swift
// EXTEND for Team Heart's multiple reminder types:

extension Scheduler {

    // Morning well-being check
    func scheduleMorningWellbeing(time: DateComponents) async throws {
        try createOrUpdateTask(
            id: "TeamHeart-Morning-Wellbeing",
            title: "Good morning! How are you feeling today?",
            instructions: "Take a moment to log your daily well-being score.",
            category: .custom("DailyWellbeing"),
            schedule: .init(
                startingAt: Calendar.current.startOfDay(for: .now),
                recurrence: .daily(calendar: .current, hours: [time.hour ?? 8], minutes: [time.minute ?? 0])
            )
        )
    }

    // Evening activity summary
    func scheduleEveningActivity(time: DateComponents) async throws {
        try createOrUpdateTask(
            id: "TeamHeart-Evening-Activity",
            title: "Log today's activities",
            instructions: "Record any exercise, exertion, or medication changes from today.",
            category: .custom("ActivityLog"),
            schedule: .init(
                startingAt: Calendar.current.startOfDay(for: .now),
                recurrence: .daily(calendar: .current, hours: [time.hour ?? 20], minutes: [time.minute ?? 0])
            )
        )
    }

    // Symptom reminder (if no symptoms logged in past X hours)
    func scheduleSymptomCheck(time: DateComponents) async throws {
        try createOrUpdateTask(
            id: "TeamHeart-Symptom-Check",
            title: "Any symptoms to report?",
            instructions: "Log any symptoms you've experienced, even if mild.",
            category: .custom("SymptomCheck"),
            schedule: .init(
                startingAt: Calendar.current.startOfDay(for: .now),
                recurrence: .daily(calendar: .current, hours: [time.hour ?? 14], minutes: [time.minute ?? 0])
            )
        )
    }

    // Streak maintenance reminder
    func scheduleStreakReminder() async throws {
        // Implement gamification reminder logic
    }
}
```

---

## 5. Consent Management

### Source Files
```
PAWS/Onboarding/Consent.swift
PAWS/Resources/ConsentDocument.md (create your own)
```

### Reusable Pattern
```swift
// REUSE Consent.swift entirely - only change:
// 1. The consent document content (ConsentDocument.md)
// 2. Storage location if needed

struct Consent: View {
    @Environment(ManagedNavigationStack.Path.self) private var managedNavigationStack
    @Environment(TeamHeartStandard.self) private var standard  // RENAME

    // ... rest is identical
}
```

### Create New Consent Document
```markdown
<!-- Resources/ConsentDocument.md -->
# Team Heart Study Consent

## Purpose of the Study
This study aims to improve prediction of cardiac events...

## What You Will Do
- Log symptoms when they occur
- Record daily well-being scores
- Allow collection of Apple Watch health data

## Data Collection
- Symptom reports (type, severity, timestamp)
- Activity logs
- Heart rate, step count from wearable
...
```

---

## 6. Firebase Backend

### Source Files
```
functions/index.js
firebase.json
firestore.rules
firebasestorage.rules
```

### Reusable Cloud Functions
```javascript
// REUSE: Invitation code validation from functions/index.js
exports.checkInvitationCode = onCall(async (request) => {
    // ... existing PAWS logic works perfectly for Team Heart
});

// ADD: New Team Heart functions

// Store symptom log
exports.logSymptom = onCall(async (request) => {
    const { symptomType, severity, description, isNormal, timestamp } = request.data;
    const userId = request.auth.uid;

    await db.collection('users').doc(userId)
        .collection('symptoms').add({
            symptomType,
            severity,  // 1-10 scale
            description,
            isNormal,  // boolean: normal vs out-of-norm
            timestamp: timestamp || admin.firestore.FieldValue.serverTimestamp(),
            syncedHealthData: false  // Flag for backend processing
        });

    return { success: true };
});

// Store daily well-being
exports.logWellbeing = onCall(async (request) => {
    const { score, notes, date } = request.data;
    const userId = request.auth.uid;

    await db.collection('users').doc(userId)
        .collection('wellbeing').doc(date).set({
            score,  // 1-10 scale
            notes,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });

    return { success: true };
});

// Store activity log
exports.logActivity = onCall(async (request) => {
    const { activityType, intensity, duration, medicationChanges, timestamp } = request.data;
    const userId = request.auth.uid;

    await db.collection('users').doc(userId)
        .collection('activities').add({
            activityType,
            intensity,
            duration,
            medicationChanges,
            timestamp: timestamp || admin.firestore.FieldValue.serverTimestamp()
        });

    return { success: true };
});

// Get user engagement stats (for streaks/gamification)
exports.getEngagementStats = onCall(async (request) => {
    const userId = request.auth.uid;
    // Calculate streaks, completion rates, etc.
    // Return stats for gamification UI
});
```

### Extended Firestore Rules
```javascript
// EXTEND firestore.rules for Team Heart collections:

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User's own data - reuse from PAWS
    match /users/{userId}/{documents=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Symptom logs
    match /users/{userId}/symptoms/{symptomId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Well-being scores
    match /users/{userId}/wellbeing/{date} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Activity logs
    match /users/{userId}/activities/{activityId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Invitation codes - reuse from PAWS
    match /invitationCodes/{codeId} {
      allow read: if request.auth != null;
    }

    // Clinical researcher read access (ADD for MedPlum integration)
    match /users/{userId}/{documents=**} {
      allow read: if request.auth != null &&
        get(/databases/$(database)/documents/researchers/$(request.auth.uid)).data.approved == true;
    }
  }
}
```

---

## 7. Data Storage Standards

### Source Files
```
PAWS/PAWSStandard.swift
```

### Adapt for Team Heart
```swift
// TeamHeartStandard.swift - adapted from PAWSStandard.swift

actor TeamHeartStandard: Standard, EnvironmentAccessible, HealthKitConstraint, AccountNotifyConstraint {

    // REUSE: HealthKit sample handling pattern
    func handleNewSamples(_ samples: some Collection<HKSample>) async {
        // Adapt for heart rate, steps, etc. instead of ECG
        for sample in samples {
            switch sample {
            case let heartRate as HKQuantitySample where heartRate.quantityType == HKQuantityType(.heartRate):
                await uploadHeartRateSample(heartRate)
            case let steps as HKQuantitySample where steps.quantityType == HKQuantityType(.stepCount):
                await uploadStepsSample(steps)
            // ... other types
            default:
                break
            }
        }
    }

    // NEW: Symptom storage
    func store(symptom: SymptomLog) async throws {
        guard let userId = try? await getUserId() else { return }

        try await Firestore.firestore()
            .collection("users").document(userId)
            .collection("symptoms")
            .addDocument(data: symptom.firestoreData)
    }

    // NEW: Well-being storage
    func store(wellbeing: WellbeingScore) async throws {
        guard let userId = try? await getUserId() else { return }

        let dateString = wellbeing.date.ISO8601Format(.iso8601Date(timeZone: .current))
        try await Firestore.firestore()
            .collection("users").document(userId)
            .collection("wellbeing").document(dateString)
            .setData(wellbeing.firestoreData)
    }

    // REUSE: Consent document storage
    func store(consentDocument: ConsentDocument) async throws {
        // Identical to PAWSStandard
    }

    // REUSE: Account deletion handling
    func respondToEvent(_ event: AccountNotifications.Event) async {
        // Identical to PAWSStandard
    }
}
```

---

## 8. New Components to Build

These components don't exist in PAWS and need to be created for Team Heart:

### Symptom Logging UI
```swift
// SymptomLogging/SymptomEntryView.swift (NEW)

struct SymptomEntryView: View {
    @State private var selectedSymptom: CardiacSymptom?
    @State private var severity: Int = 5
    @State private var isNormal: Bool = true
    @State private var description: String = ""

    var body: some View {
        Form {
            // Symptom type picker (validated options from Dr. Wang)
            Picker("Symptom Type", selection: $selectedSymptom) {
                ForEach(CardiacSymptom.allCases) { symptom in
                    Text(symptom.displayName).tag(symptom)
                }
            }

            // Severity slider
            Section("Severity") {
                Slider(value: .init(get: { Double(severity) },
                                   set: { severity = Int($0) }),
                       in: 1...10, step: 1)
                Text("Severity: \(severity)/10")
            }

            // Normal vs out-of-norm toggle
            Section {
                Toggle("This feels normal for me", isOn: $isNormal)
            }

            // Optional free-text (per your requirements)
            Section("Additional Details (Optional)") {
                TextField("Describe what you're experiencing...", text: $description, axis: .vertical)
                    .lineLimit(3...6)
            }
        }
    }
}
```

### Daily Well-being Score
```swift
// Wellbeing/DailyWellbeingView.swift (NEW)

struct DailyWellbeingView: View {
    @State private var score: Int = 5

    var body: some View {
        VStack {
            Text("How are you feeling overall today?")
                .font(.headline)

            // Visual score selector (1-10)
            HStack {
                ForEach(1...10, id: \.self) { value in
                    Button(action: { score = value }) {
                        Circle()
                            .fill(value <= score ? scoreColor(value) : Color.gray.opacity(0.3))
                            .frame(width: 30, height: 30)
                            .overlay(Text("\(value)").font(.caption))
                    }
                }
            }

            Text(scoreDescription(score))
                .foregroundColor(.secondary)
        }
    }
}
```

### Activity Logging
```swift
// Activities/ActivityLogView.swift (NEW)

struct ActivityLogView: View {
    @State private var activityType: ActivityType = .walking
    @State private var intensity: Intensity = .moderate
    @State private var duration: TimeInterval = 30 * 60  // 30 min default
    @State private var medicationChange: Bool = false
    @State private var medicationNotes: String = ""

    var body: some View {
        Form {
            Picker("Activity", selection: $activityType) {
                ForEach(ActivityType.allCases) { type in
                    Text(type.displayName).tag(type)
                }
            }

            Picker("Intensity", selection: $intensity) {
                ForEach(Intensity.allCases) { level in
                    Text(level.displayName).tag(level)
                }
            }

            // Duration picker

            Section("Medication Changes") {
                Toggle("Any medication changes today?", isOn: $medicationChange)
                if medicationChange {
                    TextField("Describe changes...", text: $medicationNotes)
                }
            }
        }
    }
}
```

### Gamification / Streaks
```swift
// Engagement/StreakView.swift (NEW)

struct StreakView: View {
    let currentStreak: Int
    let longestStreak: Int
    let completionRate: Double  // 0.0 - 1.0

    var body: some View {
        VStack {
            // Streak flame indicator
            HStack {
                Image(systemName: "flame.fill")
                    .foregroundColor(.orange)
                Text("\(currentStreak) day streak!")
                    .font(.headline)
            }

            // Weekly completion indicator
            WeeklyCompletionRing(completion: completionRate)

            // Achievements/badges
        }
    }
}
```

### History View
```swift
// History/HistoryView.swift (NEW)

struct HistoryView: View {
    @State private var symptoms: [SymptomLog] = []
    @State private var wellbeing: [WellbeingScore] = []
    @State private var selectedTab: HistoryTab = .symptoms

    var body: some View {
        VStack {
            Picker("View", selection: $selectedTab) {
                Text("Symptoms").tag(HistoryTab.symptoms)
                Text("Well-being").tag(HistoryTab.wellbeing)
                Text("Activities").tag(HistoryTab.activities)
            }
            .pickerStyle(.segmented)

            // List/chart view of historical data
            // Read-only as per requirements
        }
    }
}
```

---

## 9. Project Structure

```
TeamHeart/
├── TeamHeart.swift                    # ADAPT from PAWS.swift
├── TeamHeartDelegate.swift            # ADAPT from PAWSDelegate.swift
├── TeamHeartStandard.swift            # ADAPT from PAWSStandard.swift
├── Home.swift                         # ADAPT from Home.swift
│
├── Onboarding/                        # MOSTLY REUSE
│   ├── OnboardingFlow.swift           # ADAPT
│   ├── Welcome.swift                  # ADAPT (branding)
│   ├── AccountOnboarding.swift        # REUSE
│   ├── Consent.swift                  # REUSE
│   ├── HealthKitPermissions.swift     # ADAPT (data types)
│   ├── NotificationPermissions.swift  # ADAPT (multiple reminders)
│   ├── InvitationCodeView.swift       # REUSE
│   ├── InvitationCodeError.swift      # REUSE
│   ├── SymptomEducation.swift         # NEW
│   └── ReminderPreferences.swift      # NEW
│
├── Account/                           # MOSTLY REUSE
│   ├── AccountButton.swift            # REUSE
│   ├── AccountSheet.swift             # ADAPT
│   └── DateOfEnrollment.swift         # REUSE
│
├── Reminders/                         # ADAPT & EXTEND
│   └── Scheduler+Reminders.swift      # EXTEND for multiple types
│
├── SymptomLogging/                    # NEW
│   ├── SymptomEntryView.swift
│   ├── SymptomModels.swift
│   └── SymptomListView.swift
│
├── Wellbeing/                         # NEW
│   ├── DailyWellbeingView.swift
│   └── WellbeingModels.swift
│
├── Activities/                        # NEW
│   ├── ActivityLogView.swift
│   └── ActivityModels.swift
│
├── Engagement/                        # NEW (gamification)
│   ├── StreakView.swift
│   ├── AchievementsView.swift
│   └── EngagementModels.swift
│
├── History/                           # NEW
│   ├── HistoryView.swift
│   └── TrendCharts.swift
│
├── Education/                         # NEW
│   ├── FAQView.swift
│   └── AIChatView.swift               # AI assistance for questions
│
├── Contacts/                          # ADAPT from PAWS
│   └── Contacts.swift
│
├── Resources/
│   ├── ConsentDocument.md             # NEW content
│   ├── Localizable.strings            # ADAPT
│   └── Assets.xcassets                # NEW branding
│
└── Supporting Files/
    ├── FeatureFlags.swift             # REUSE
    └── Info.plist                     # ADAPT
```

---

## 10. Implementation Priority

Based on your V1 goals (data quality, accessibility, usability):

### Phase 1: Core Infrastructure
1. Clone PAWS project structure
2. Adapt authentication & onboarding
3. Set up Firebase backend
4. Implement HealthKit integration

### Phase 2: Core Features
1. Build symptom logging UI
2. Build daily well-being entry
3. Build activity logging
4. Implement reminder system (all types)

### Phase 3: Engagement & History
1. Build history views
2. Implement streaks/gamification
3. Add education/FAQ section

### Phase 4: Polish & Testing
1. UI/UX refinement
2. Testing & bug fixes
3. Validate with clinical team

---

## Key Dependencies (from PAWS)

Add these to your Package.swift:
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

---

## Questions for Dr. Wang (Before Implementation)

1. **Symptom List**: What specific cardiac symptoms should be in the validated dropdown?
2. **Severity Scale**: Is 1-10 appropriate, or should we use clinical scales (e.g., NYHA)?
3. **"Normal vs Out-of-Norm"**: How should this binary be presented to patients?
4. **Reminder Frequency**: What's the optimal balance before fatigue?
5. **MedPlum Integration**: What FHIR resources map to your symptom/activity data?
