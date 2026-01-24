// EngagementModels.swift
// Team Heart
//
// Data models for gamification and engagement tracking
// Goal: 80% daily logging, 50% twice-daily logging

import Foundation

/// User engagement statistics
struct EngagementStats: Codable {
    let currentStreak: Int
    let longestStreak: Int
    let totalDaysLogged: Int
    let enrollmentDate: Date

    // Daily completion tracking
    let symptomLogsToday: Int
    let wellbeingLoggedToday: Bool
    let activityLoggedToday: Bool

    // Weekly stats
    let daysLoggedThisWeek: Int
    let daysWithMultipleLogsThisWeek: Int

    /// Daily completion rate (target: 80%)
    var dailyCompletionRate: Double {
        let daysSinceEnrollment = Calendar.current.dateComponents(
            [.day],
            from: enrollmentDate,
            to: Date()
        ).day ?? 1
        guard daysSinceEnrollment > 0 else { return 0 }
        return Double(totalDaysLogged) / Double(daysSinceEnrollment)
    }

    /// Multi-log rate (target: 50%)
    var multiLogRate: Double {
        guard totalDaysLogged > 0 else { return 0 }
        // This would need historical tracking
        return Double(daysWithMultipleLogsThisWeek) / 7.0
    }

    /// Whether today's logging is complete
    var todayComplete: Bool {
        wellbeingLoggedToday && activityLoggedToday
    }

    /// Whether user has logged multiple times today
    var multipleLogsToday: Bool {
        symptomLogsToday >= 2 || (symptomLogsToday >= 1 && (wellbeingLoggedToday || activityLoggedToday))
    }
}

/// Achievement badges for gamification
enum Achievement: String, CaseIterable, Identifiable, Codable {
    // Streak achievements
    case firstLog = "first_log"
    case streak3 = "streak_3"
    case streak7 = "streak_7"
    case streak14 = "streak_14"
    case streak30 = "streak_30"
    case streak60 = "streak_60"
    case streak90 = "streak_90"

    // Consistency achievements
    case perfectWeek = "perfect_week"
    case perfectMonth = "perfect_month"
    case multiLogger = "multi_logger"  // 50% multi-log rate

    // Engagement achievements
    case earlyBird = "early_bird"  // Morning logging
    case nightOwl = "night_owl"  // Evening logging
    case symptomTracker = "symptom_tracker"  // 10+ symptom logs

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .firstLog: return "First Steps"
        case .streak3: return "Getting Started"
        case .streak7: return "Week Warrior"
        case .streak14: return "Fortnight Fighter"
        case .streak30: return "Monthly Master"
        case .streak60: return "Two Month Champion"
        case .streak90: return "Quarter Conqueror"
        case .perfectWeek: return "Perfect Week"
        case .perfectMonth: return "Perfect Month"
        case .multiLogger: return "Detailed Reporter"
        case .earlyBird: return "Early Bird"
        case .nightOwl: return "Night Owl"
        case .symptomTracker: return "Symptom Tracker"
        }
    }

    var description: String {
        switch self {
        case .firstLog: return "Made your first log"
        case .streak3: return "3 days in a row"
        case .streak7: return "7 days in a row"
        case .streak14: return "14 days in a row"
        case .streak30: return "30 days in a row"
        case .streak60: return "60 days in a row"
        case .streak90: return "90 days in a row"
        case .perfectWeek: return "Logged every day for a week"
        case .perfectMonth: return "Logged every day for a month"
        case .multiLogger: return "Logged multiple times on 50% of days"
        case .earlyBird: return "Logged before 9 AM"
        case .nightOwl: return "Logged after 8 PM"
        case .symptomTracker: return "Logged 10+ symptoms"
        }
    }

    var iconName: String {
        switch self {
        case .firstLog: return "star.fill"
        case .streak3, .streak7: return "flame.fill"
        case .streak14, .streak30: return "flame.circle.fill"
        case .streak60, .streak90: return "crown.fill"
        case .perfectWeek: return "checkmark.seal.fill"
        case .perfectMonth: return "medal.fill"
        case .multiLogger: return "chart.bar.fill"
        case .earlyBird: return "sunrise.fill"
        case .nightOwl: return "moon.stars.fill"
        case .symptomTracker: return "heart.text.square.fill"
        }
    }

    /// Check if achievement is earned based on stats
    func isEarned(stats: EngagementStats) -> Bool {
        switch self {
        case .firstLog: return stats.totalDaysLogged >= 1
        case .streak3: return stats.longestStreak >= 3
        case .streak7: return stats.longestStreak >= 7
        case .streak14: return stats.longestStreak >= 14
        case .streak30: return stats.longestStreak >= 30
        case .streak60: return stats.longestStreak >= 60
        case .streak90: return stats.longestStreak >= 90
        case .perfectWeek: return stats.daysLoggedThisWeek >= 7
        case .perfectMonth: return stats.dailyCompletionRate >= 1.0 && stats.totalDaysLogged >= 30
        case .multiLogger: return stats.multiLogRate >= 0.5
        default: return false  // Time-based achievements need separate tracking
        }
    }
}

/// Weekly completion visual model
struct WeeklyCompletion {
    let days: [DayCompletion]

    struct DayCompletion: Identifiable {
        let id = UUID()
        let date: Date
        let hasSymptomLog: Bool
        let hasWellbeingLog: Bool
        let hasActivityLog: Bool

        var completionLevel: CompletionLevel {
            let count = [hasSymptomLog, hasWellbeingLog, hasActivityLog].filter { $0 }.count
            switch count {
            case 0: return .none
            case 1: return .partial
            case 2: return .good
            case 3: return .complete
            default: return .none
            }
        }
    }

    enum CompletionLevel {
        case none
        case partial
        case good
        case complete

        var colorName: String {
            switch self {
            case .none: return "gray"
            case .partial: return "yellow"
            case .good: return "blue"
            case .complete: return "green"
            }
        }
    }
}
