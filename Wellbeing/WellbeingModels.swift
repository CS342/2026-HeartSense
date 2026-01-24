// WellbeingModels.swift
// Team Heart
//
// Data models for daily well-being tracking

import Foundation

/// Daily well-being score entry
struct WellbeingScore: Identifiable, Codable {
    let id: UUID
    let score: Int  // 1-10 scale
    let date: Date  // Day this score applies to
    let notes: String?  // Optional notes
    let timestamp: Date  // When the entry was made

    init(
        id: UUID = UUID(),
        score: Int,
        date: Date = Date(),
        notes: String? = nil,
        timestamp: Date = Date()
    ) {
        self.id = id
        self.score = max(1, min(10, score))  // Clamp to 1-10
        self.date = Calendar.current.startOfDay(for: date)
        self.notes = notes
        self.timestamp = timestamp
    }

    /// Human-readable description of the score
    var scoreDescription: String {
        switch score {
        case 1...2: return "Very poor"
        case 3...4: return "Below average"
        case 5...6: return "Average"
        case 7...8: return "Good"
        case 9...10: return "Excellent"
        default: return "Unknown"
        }
    }

    /// Color representation for UI
    var scoreColorName: String {
        switch score {
        case 1...3: return "red"
        case 4...6: return "yellow"
        case 7...10: return "green"
        default: return "gray"
        }
    }

    /// Convert to Firestore-compatible dictionary
    var firestoreData: [String: Any] {
        var data: [String: Any] = [
            "score": score,
            "date": date,
            "timestamp": timestamp
        ]
        if let notes = notes, !notes.isEmpty {
            data["notes"] = notes
        }
        return data
    }

    /// Date string for Firestore document ID (YYYY-MM-DD)
    var dateDocumentId: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }
}

/// Well-being trend calculation
struct WellbeingTrend {
    let scores: [WellbeingScore]

    var average: Double {
        guard !scores.isEmpty else { return 0 }
        return Double(scores.reduce(0) { $0 + $1.score }) / Double(scores.count)
    }

    var trend: TrendDirection {
        guard scores.count >= 3 else { return .stable }

        let recent = scores.prefix(3).map(\.score)
        let older = scores.dropFirst(3).prefix(3).map(\.score)

        guard !older.isEmpty else { return .stable }

        let recentAvg = Double(recent.reduce(0, +)) / Double(recent.count)
        let olderAvg = Double(older.reduce(0, +)) / Double(older.count)

        let diff = recentAvg - olderAvg
        if diff > 1 { return .improving }
        if diff < -1 { return .declining }
        return .stable
    }

    enum TrendDirection {
        case improving
        case stable
        case declining

        var description: String {
            switch self {
            case .improving: return "Improving"
            case .stable: return "Stable"
            case .declining: return "Declining"
            }
        }

        var iconName: String {
            switch self {
            case .improving: return "arrow.up.circle.fill"
            case .stable: return "equal.circle.fill"
            case .declining: return "arrow.down.circle.fill"
            }
        }
    }
}
