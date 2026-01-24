// Scheduler+TeamHeartReminders.swift
// Team Heart
//
// Extended reminder system adapted from PAWS
// Supports multiple reminder types for sustained engagement

import Foundation
import SpeziScheduler

extension Scheduler {

    // MARK: - Morning Well-being Reminder

    /// Schedule daily morning well-being check reminder
    /// - Parameter time: Time components (hour, minute) for the reminder
    func scheduleMorningWellbeingReminder(time: DateComponents) async throws {
        let hours = (time.hour.map { [$0] }) ?? [8]  // Default 8 AM
        let minutes = (time.minute.map { [$0] }) ?? [0]

        try createOrUpdateTask(
            id: "TeamHeart-Morning-Wellbeing",
            title: "Good morning! How are you feeling?",
            instructions: "Take a moment to log your daily well-being score. This helps us track your health patterns.",
            category: .custom("DailyWellbeing"),
            schedule: .init(
                startingAt: Calendar.current.startOfDay(for: .now),
                recurrence: .daily(
                    calendar: .current,
                    hours: hours,
                    minutes: minutes
                )
            )
        )
    }

    // MARK: - Evening Activity Reminder

    /// Schedule daily evening activity summary reminder
    /// - Parameter time: Time components (hour, minute) for the reminder
    func scheduleEveningActivityReminder(time: DateComponents) async throws {
        let hours = (time.hour.map { [$0] }) ?? [20]  // Default 8 PM
        let minutes = (time.minute.map { [$0] }) ?? [0]

        try createOrUpdateTask(
            id: "TeamHeart-Evening-Activity",
            title: "Log today's activities",
            instructions: "Record any exercise, physical exertion, or medication changes from today.",
            category: .custom("ActivityLog"),
            schedule: .init(
                startingAt: Calendar.current.startOfDay(for: .now),
                recurrence: .daily(
                    calendar: .current,
                    hours: hours,
                    minutes: minutes
                )
            )
        )
    }

    // MARK: - Midday Symptom Check

    /// Schedule midday symptom check reminder
    /// - Parameter time: Time components (hour, minute) for the reminder
    func scheduleSymptomCheckReminder(time: DateComponents) async throws {
        let hours = (time.hour.map { [$0] }) ?? [14]  // Default 2 PM
        let minutes = (time.minute.map { [$0] }) ?? [0]

        try createOrUpdateTask(
            id: "TeamHeart-Symptom-Check",
            title: "Any symptoms to report?",
            instructions: "Log any symptoms you've experienced, even if they seem mild. Every data point helps!",
            category: .custom("SymptomCheck"),
            schedule: .init(
                startingAt: Calendar.current.startOfDay(for: .now),
                recurrence: .daily(
                    calendar: .current,
                    hours: hours,
                    minutes: minutes
                )
            )
        )
    }

    // MARK: - Streak Maintenance Reminder

    /// Schedule streak maintenance reminder (triggered if no log by certain time)
    /// - Parameter time: Time components for "last chance" reminder
    func scheduleStreakReminder(time: DateComponents) async throws {
        let hours = (time.hour.map { [$0] }) ?? [21]  // Default 9 PM
        let minutes = (time.minute.map { [$0] }) ?? [0]

        try createOrUpdateTask(
            id: "TeamHeart-Streak-Reminder",
            title: "Keep your streak alive!",
            instructions: "You haven't logged today yet. A quick check-in keeps your streak going!",
            category: .custom("StreakReminder"),
            schedule: .init(
                startingAt: Calendar.current.startOfDay(for: .now),
                recurrence: .daily(
                    calendar: .current,
                    hours: hours,
                    minutes: minutes
                )
            )
        )
    }

    // MARK: - Setup All Reminders

    /// Configure all Team Heart reminders with user preferences
    /// - Parameters:
    ///   - morningTime: Time for morning well-being reminder
    ///   - middayTime: Time for midday symptom check
    ///   - eveningTime: Time for evening activity reminder
    ///   - streakTime: Time for streak maintenance reminder
    func scheduleAllTeamHeartReminders(
        morningTime: DateComponents,
        middayTime: DateComponents,
        eveningTime: DateComponents,
        streakTime: DateComponents
    ) async throws {
        try await scheduleMorningWellbeingReminder(time: morningTime)
        try await scheduleSymptomCheckReminder(time: middayTime)
        try await scheduleEveningActivityReminder(time: eveningTime)
        try await scheduleStreakReminder(time: streakTime)
    }

    /// Configure default reminder schedule
    func scheduleDefaultReminders() async throws {
        try await scheduleAllTeamHeartReminders(
            morningTime: DateComponents(hour: 8, minute: 0),
            middayTime: DateComponents(hour: 14, minute: 0),
            eveningTime: DateComponents(hour: 20, minute: 0),
            streakTime: DateComponents(hour: 21, minute: 0)
        )
    }

    // MARK: - Cancel Reminders

    /// Cancel a specific reminder type
    func cancelReminder(id: String) {
        // Implementation depends on SpeziScheduler API
        // deleteTask(id: id)
    }

    /// Cancel all Team Heart reminders
    func cancelAllTeamHeartReminders() {
        cancelReminder(id: "TeamHeart-Morning-Wellbeing")
        cancelReminder(id: "TeamHeart-Symptom-Check")
        cancelReminder(id: "TeamHeart-Evening-Activity")
        cancelReminder(id: "TeamHeart-Streak-Reminder")
    }
}

// MARK: - Reminder Preferences

/// User preferences for reminder timing and frequency
struct ReminderPreferences: Codable {
    var morningReminderEnabled: Bool = true
    var morningReminderTime: DateComponents = DateComponents(hour: 8, minute: 0)

    var middayReminderEnabled: Bool = true
    var middayReminderTime: DateComponents = DateComponents(hour: 14, minute: 0)

    var eveningReminderEnabled: Bool = true
    var eveningReminderTime: DateComponents = DateComponents(hour: 20, minute: 0)

    var streakReminderEnabled: Bool = true
    var streakReminderTime: DateComponents = DateComponents(hour: 21, minute: 0)

    /// Number of reminders enabled
    var enabledCount: Int {
        [morningReminderEnabled, middayReminderEnabled, eveningReminderEnabled, streakReminderEnabled]
            .filter { $0 }
            .count
    }

    /// Check if reminder frequency might cause fatigue
    var mightCauseFatigue: Bool {
        enabledCount >= 4
    }
}
