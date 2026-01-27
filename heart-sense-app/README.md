# Medical Symptom Tracking App

A comprehensive mobile health tracking application designed for clinical research, specifically for sudden cardiac arrest and atrial fibrillation studies at Stanford.

## Overview

This app enables patients to easily record symptoms, activities, well-being ratings, and medical condition changes in real-time. The data collected supports clinical research and improves patient care pathways.

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
