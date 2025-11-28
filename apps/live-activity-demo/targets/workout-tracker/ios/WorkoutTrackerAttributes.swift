import ActivityKit
import Foundation

struct WorkoutTrackerAttributes: ActivityAttributes {
    var workoutType: String
    var targetDistance: String
    
    public struct ContentState: Codable, Hashable {
        var currentDistance: String
        var currentPace: String
        var elapsedTime: String
        var calories: Int
    }
}
