import AppIntents
import Foundation

/// Sim-greenable App Intent for the appintents-extension example.
struct SayHelloIntent: AppIntent {
  static var title: LocalizedStringResource = "Say Hello"
  static var description = IntentDescription(
    "Returns a greeting from the expo-targets app-intent example."
  )

  func perform() async throws -> some IntentResult & ReturnsValue<String> {
    .result(value: "Hello from ET AppIntent")
  }
}

struct ETAppIntentShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: SayHelloIntent(),
      phrases: [
        "Say hello in \(.applicationName)",
        "Hello in \(.applicationName)",
        "Greet me in \(.applicationName)",
      ],
      shortTitle: "Say Hello",
      systemImageName: "hand.wave"
    )
  }
}

/// ExtensionKit principal retained for scaffold compatibility.
@objc(AppIntentExtension)
class AppIntentExtension: NSObject {}
