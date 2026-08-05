import Foundation

/// User-owned App Intent perform hook — safe to edit; prebuild will not overwrite.
enum ETHostGreetIntentPerform {
  private static let appGroupId = "group.com.expotargets.example.app-intent"

  static func perform() async throws {
    let defaults = UserDefaults(suiteName: appGroupId)
    defaults?.set("ET AppIntent", forKey: "ai:marker")
    defaults?.set("Hello from ET AppIntent", forKey: "ai:result")
    defaults?.set(Date().timeIntervalSince1970, forKey: "ai:lastAt")
    defaults?.synchronize()
  }
}
