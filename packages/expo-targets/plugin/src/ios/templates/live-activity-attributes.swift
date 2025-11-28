// Live Activity Attributes
// This file defines the structure of data for your Live Activity

import ActivityKit
import Foundation

struct {{ACTIVITY_NAME}}Attributes: ActivityAttributes {
    // Static attributes that don't change during the activity's lifetime
    // Example: order ID, user name, game title, etc.
    public struct ContentState: Codable, Hashable {
        // Dynamic content that updates during the activity
        // Example: delivery status, game score, timer value, etc.
        var status: String
        var message: String
    }
    
    // Static attributes
    var name: String
}
