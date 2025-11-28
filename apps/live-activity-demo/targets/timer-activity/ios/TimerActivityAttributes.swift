import ActivityKit
import Foundation

struct TimerActivityAttributes: ActivityAttributes {
    var timerName: String
    var totalSeconds: Int
    
    public struct ContentState: Codable, Hashable {
        var remainingSeconds: Int
        var progress: Int
        var isRunning: Bool
    }
}
