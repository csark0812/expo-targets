import ExpoModulesCore
import ActivityKit
import SwiftUI

@available(iOS 16.1, *)
public class ExpoTargetsLiveActivityModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoTargetsLiveActivity")

    // Start a new Live Activity
    Function("startActivity") { (activityId: String, attributes: [String: Any], contentState: [String: Any], suite: String?) -> String? in
      guard let suite = suite else {
        print("[ExpoTargetsLiveActivity] App group suite is required")
        return nil
      }
      
      // Store activity data in UserDefaults for widget to access
      let defaults = UserDefaults(suiteName: suite)
      defaults?.set(attributes, forKey: "\(activityId)_attributes")
      defaults?.set(contentState, forKey: "\(activityId)_contentState")
      defaults?.synchronize()
      
      // Generate a unique token for tracking
      let token = UUID().uuidString
      defaults?.set(token, forKey: "\(activityId)_token")
      defaults?.synchronize()
      
      return token
    }

    // Update an existing Live Activity
    Function("updateActivity") { (activityId: String, contentState: [String: Any], suite: String?) -> Bool in
      guard let suite = suite else {
        print("[ExpoTargetsLiveActivity] App group suite is required")
        return false
      }
      
      // Update content state in UserDefaults
      let defaults = UserDefaults(suiteName: suite)
      defaults?.set(contentState, forKey: "\(activityId)_contentState")
      defaults?.set(Date().timeIntervalSince1970, forKey: "\(activityId)_lastUpdate")
      defaults?.synchronize()
      
      return true
    }

    // End a Live Activity
    Function("endActivity") { (activityId: String, dismissalPolicy: String?, suite: String?) -> Bool in
      guard let suite = suite else {
        print("[ExpoTargetsLiveActivity] App group suite is required")
        return false
      }
      
      // Mark activity as ended in UserDefaults
      let defaults = UserDefaults(suiteName: suite)
      defaults?.set(true, forKey: "\(activityId)_ended")
      defaults?.set(dismissalPolicy ?? "default", forKey: "\(activityId)_dismissalPolicy")
      defaults?.synchronize()
      
      return true
    }

    // Get all active Live Activities for a target
    Function("getActiveActivities") { (activityId: String?, suite: String?) -> [[String: Any]] in
      guard let suite = suite else {
        print("[ExpoTargetsLiveActivity] App group suite is required")
        return []
      }
      
      let defaults = UserDefaults(suiteName: suite)
      guard let dict = defaults?.dictionaryRepresentation() else {
        return []
      }
      
      var activities: [[String: Any]] = []
      
      // Filter keys that end with "_token" and are not ended
      for key in dict.keys {
        if key.hasSuffix("_token") {
          let id = String(key.dropLast(6)) // Remove "_token"
          
          // Check if activity is not ended
          let isEnded = defaults?.bool(forKey: "\(id)_ended") ?? false
          if !isEnded {
            if let token = defaults?.string(forKey: key),
               let attributes = defaults?.dictionary(forKey: "\(id)_attributes"),
               let contentState = defaults?.dictionary(forKey: "\(id)_contentState") {
              
              activities.append([
                "id": id,
                "token": token,
                "attributes": attributes,
                "contentState": contentState
              ])
            }
          }
        }
      }
      
      return activities
    }

    // Check if Live Activities are supported
    Function("areActivitiesEnabled") { () -> Bool in
      if #available(iOS 16.1, *) {
        return ActivityAuthorizationInfo().areActivitiesEnabled
      }
      return false
    }

    // Get activity state
    Function("getActivityState") { (activityId: String, suite: String?) -> [String: Any]? in
      guard let suite = suite else {
        print("[ExpoTargetsLiveActivity] App group suite is required")
        return nil
      }
      
      let defaults = UserDefaults(suiteName: suite)
      
      let isEnded = defaults?.bool(forKey: "\(activityId)_ended") ?? false
      let token = defaults?.string(forKey: "\(activityId)_token")
      let attributes = defaults?.dictionary(forKey: "\(activityId)_attributes")
      let contentState = defaults?.dictionary(forKey: "\(activityId)_contentState")
      let lastUpdate = defaults?.double(forKey: "\(activityId)_lastUpdate") ?? 0
      
      guard token != nil else {
        return nil
      }
      
      return [
        "id": activityId,
        "token": token as Any,
        "isEnded": isEnded,
        "attributes": attributes as Any,
        "contentState": contentState as Any,
        "lastUpdate": lastUpdate
      ]
    }

    // Clear activity data
    Function("clearActivity") { (activityId: String, suite: String?) -> Bool in
      guard let suite = suite else {
        print("[ExpoTargetsLiveActivity] App group suite is required")
        return false
      }
      
      let defaults = UserDefaults(suiteName: suite)
      defaults?.removeObject(forKey: "\(activityId)_token")
      defaults?.removeObject(forKey: "\(activityId)_attributes")
      defaults?.removeObject(forKey: "\(activityId)_contentState")
      defaults?.removeObject(forKey: "\(activityId)_ended")
      defaults?.removeObject(forKey: "\(activityId)_dismissalPolicy")
      defaults?.removeObject(forKey: "\(activityId)_lastUpdate")
      defaults?.synchronize()
      
      return true
    }
  }
}
