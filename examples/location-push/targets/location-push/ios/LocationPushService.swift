import CoreLocation
import Foundation

/// Location push service extension — records payload receipt in App Group.
@objc(LocationPushService)
class LocationPushService: NSObject, CLLocationPushServiceExtension {
  private let appGroup = "group.com.expotargets.example.location-push"

  func didReceiveLocationPushPayload(
    _ payload: Data,
    completion: @escaping () -> Void
  ) {
    if let defaults = UserDefaults(suiteName: appGroup) {
      defaults.set(payload.count, forKey: "lastPushPayloadBytes")
      defaults.set(Date().timeIntervalSince1970, forKey: "lastPushAt")
    }
    completion()
  }
}
