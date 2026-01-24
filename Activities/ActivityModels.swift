// ActivityModels.swift
// Team Heart
//
// Data models for activity and medication tracking

import Foundation

/// Types of activities to log
enum ActivityType: String, CaseIterable, Identifiable, Codable {
    case walking = "walking"
    case running = "running"
    case cycling = "cycling"
    case swimming = "swimming"
    case strengthTraining = "strength_training"
    case yoga = "yoga"
    case housework = "housework"
    case gardening = "gardening"
    case stairs = "stairs"
    case sexualActivity = "sexual_activity"
    case other = "other"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .walking: return "Walking"
        case .running: return "Running/Jogging"
        case .cycling: return "Cycling"
        case .swimming: return "Swimming"
        case .strengthTraining: return "Strength Training"
        case .yoga: return "Yoga/Stretching"
        case .housework: return "Housework"
        case .gardening: return "Gardening"
        case .stairs: return "Climbing Stairs"
        case .sexualActivity: return "Sexual Activity"
        case .other: return "Other"
        }
    }

    var iconName: String {
        switch self {
        case .walking: return "figure.walk"
        case .running: return "figure.run"
        case .cycling: return "bicycle"
        case .swimming: return "figure.pool.swim"
        case .strengthTraining: return "dumbbell.fill"
        case .yoga: return "figure.yoga"
        case .housework: return "house.fill"
        case .gardening: return "leaf.fill"
        case .stairs: return "stairs"
        case .sexualActivity: return "heart.fill"
        case .other: return "ellipsis.circle.fill"
        }
    }
}

/// Intensity levels for activities
enum ActivityIntensity: String, CaseIterable, Identifiable, Codable {
    case light = "light"
    case moderate = "moderate"
    case vigorous = "vigorous"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .light: return "Light"
        case .moderate: return "Moderate"
        case .vigorous: return "Vigorous"
        }
    }

    var description: String {
        switch self {
        case .light:
            return "Can easily hold a conversation"
        case .moderate:
            return "Breathing harder, can talk but not sing"
        case .vigorous:
            return "Breathing hard, difficult to talk"
        }
    }
}

/// A logged activity entry
struct ActivityLog: Identifiable, Codable {
    let id: UUID
    let activityType: ActivityType
    let intensity: ActivityIntensity
    let durationMinutes: Int
    let notes: String?
    let timestamp: Date

    init(
        id: UUID = UUID(),
        activityType: ActivityType,
        intensity: ActivityIntensity,
        durationMinutes: Int,
        notes: String? = nil,
        timestamp: Date = Date()
    ) {
        self.id = id
        self.activityType = activityType
        self.intensity = intensity
        self.durationMinutes = max(1, durationMinutes)
        self.notes = notes
        self.timestamp = timestamp
    }

    /// Convert to Firestore-compatible dictionary
    var firestoreData: [String: Any] {
        var data: [String: Any] = [
            "activityType": activityType.rawValue,
            "intensity": intensity.rawValue,
            "durationMinutes": durationMinutes,
            "timestamp": timestamp
        ]
        if let notes = notes, !notes.isEmpty {
            data["notes"] = notes
        }
        return data
    }
}

/// Medication change entry
struct MedicationChange: Identifiable, Codable {
    let id: UUID
    let changeType: ChangeType
    let medicationName: String?
    let description: String
    let timestamp: Date

    enum ChangeType: String, CaseIterable, Identifiable, Codable {
        case started = "started"
        case stopped = "stopped"
        case doseChanged = "dose_changed"
        case missedDose = "missed_dose"
        case other = "other"

        var id: String { rawValue }

        var displayName: String {
            switch self {
            case .started: return "Started new medication"
            case .stopped: return "Stopped medication"
            case .doseChanged: return "Dose changed"
            case .missedDose: return "Missed dose"
            case .other: return "Other change"
            }
        }
    }

    init(
        id: UUID = UUID(),
        changeType: ChangeType,
        medicationName: String? = nil,
        description: String,
        timestamp: Date = Date()
    ) {
        self.id = id
        self.changeType = changeType
        self.medicationName = medicationName
        self.description = description
        self.timestamp = timestamp
    }

    /// Convert to Firestore-compatible dictionary
    var firestoreData: [String: Any] {
        var data: [String: Any] = [
            "changeType": changeType.rawValue,
            "description": description,
            "timestamp": timestamp
        ]
        if let medicationName = medicationName, !medicationName.isEmpty {
            data["medicationName"] = medicationName
        }
        return data
    }
}
