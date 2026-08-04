import ExpoModulesCore
import Foundation

/// Thin bridge — App Shortcuts + intent live in the main app target
/// (`ETAppShortcuts.swift` via withHostAppShortcuts). Calling update from JS
/// is best-effort; static shortcuts register from the app binary on install.
public class AppIntentHostModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AppIntentHost")

    AsyncFunction("donateShortcuts") { () -> String in
      // Provider is compiled into the app target; poke registration if present.
      NotificationCenter.default.post(
        name: Notification.Name("ETAppIntentDonateShortcuts"),
        object: nil
      )
      return "donated"
    }
  }
}
