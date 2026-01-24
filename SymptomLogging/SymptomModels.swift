// SymptomModels.swift
// Team Heart
//
// Data models for cardiac symptom logging
// Validate symptom list with Dr. Wang before finalizing

import Foundation

/// Cardiac symptoms to track - populate with clinically validated options
enum CardiacSymptom: String, CaseIterable, Identifiable, Codable {
    // Common cardiac symptoms - TO BE VALIDATED BY DR. WANG
    case palpitations = "palpitations"
    case chestPain = "chest_pain"
    case shortnessOfBreath = "shortness_of_breath"
    case dizziness = "dizziness"
    case fatigue = "fatigue"
    case syncope = "syncope"  // fainting
    case edema = "edema"  // swelling
    case other = "other"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .palpitations: return "Palpitations (racing/fluttering heart)"
        case .chestPain: return "Chest pain or discomfort"
        case .shortnessOfBreath: return "Shortness of breath"
        case .dizziness: return "Dizziness or lightheadedness"
        case .fatigue: return "Unusual fatigue"
        case .syncope: return "Fainting or near-fainting"
        case .edema: return "Swelling (legs, ankles, feet)"
        case .other: return "Other"
        }
    }

    var clinicalDescription: String {
        switch self {
        case .palpitations:
            return "Awareness of heartbeat - racing, pounding, fluttering, or skipped beats"
        case .chestPain:
            return "Any discomfort in the chest area including pressure, squeezing, or burning"
        case .shortnessOfBreath:
            return "Difficulty breathing or feeling like you can't get enough air"
        case .dizziness:
            return "Feeling lightheaded, unsteady, or like the room is spinning"
        case .fatigue:
            return "Unusual tiredness not explained by activity or sleep"
        case .syncope:
            return "Loss of consciousness or feeling like you might pass out"
        case .edema:
            return "Swelling, especially in lower extremities"
        case .other:
            return "Any other symptom you want to report"
        }
    }
}

/// Severity level for symptom reporting
enum SymptomSeverity: Int, CaseIterable, Identifiable, Codable {
    case minimal = 1
    case mild = 3
    case moderate = 5
    case severe = 7
    case extreme = 10

    var id: Int { rawValue }

    var displayName: String {
        switch self {
        case .minimal: return "Barely noticeable"
        case .mild: return "Mild - noticeable but not limiting"
        case .moderate: return "Moderate - somewhat limiting"
        case .severe: return "Severe - significantly limiting"
        case .extreme: return "Extreme - debilitating"
        }
    }
}

/// A logged symptom entry
struct SymptomLog: Identifiable, Codable {
    let id: UUID
    let symptomType: CardiacSymptom
    let severity: Int  // 1-10 scale
    let isNormal: Bool  // "normal for me" vs "out of the norm"
    let description: String?  // Optional free-text
    let timestamp: Date
    let syncedWithHealthData: Bool

    init(
        id: UUID = UUID(),
        symptomType: CardiacSymptom,
        severity: Int,
        isNormal: Bool,
        description: String? = nil,
        timestamp: Date = Date(),
        syncedWithHealthData: Bool = false
    ) {
        self.id = id
        self.symptomType = symptomType
        self.severity = max(1, min(10, severity))  // Clamp to 1-10
        self.isNormal = isNormal
        self.description = description
        self.timestamp = timestamp
        self.syncedWithHealthData = syncedWithHealthData
    }

    /// Convert to Firestore-compatible dictionary
    var firestoreData: [String: Any] {
        var data: [String: Any] = [
            "symptomType": symptomType.rawValue,
            "severity": severity,
            "isNormal": isNormal,
            "timestamp": timestamp,
            "syncedWithHealthData": syncedWithHealthData
        ]
        if let description = description, !description.isEmpty {
            data["description"] = description
        }
        return data
    }
}
