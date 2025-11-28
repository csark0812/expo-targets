import ActivityKit
import Foundation

struct DeliveryTrackerAttributes: ActivityAttributes {
    // Static attributes
    var orderId: String
    var restaurantName: String
    
    // Dynamic state
    public struct ContentState: Codable, Hashable {
        var status: String
        var eta: String
        var driverName: String?
        var driverPhoto: String?
    }
}
