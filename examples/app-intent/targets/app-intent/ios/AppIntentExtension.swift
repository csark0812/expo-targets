import AppIntents

/// ExtensionKit App Intents entry — matches docs/configuration.md shape.
@main
struct ETAppIntentsExtension: AppIntentsExtension {}

struct ETAppIntentShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: ETGreetIntent(),
      phrases: [
        "Say hello in \(.applicationName)",
        "Greet me in \(.applicationName)",
        "Hello in \(.applicationName)",
      ],
      shortTitle: "ET Greet",
      systemImageName: "hand.wave"
    )
  }
}

/// Stable AX title for Shortcuts Gallery / search.
struct ETGreetIntent: AppIntent {
  static var title: LocalizedStringResource = "ET Greet"
  static var description = IntentDescription(
    "Returns a greeting from the expo-targets app-intent example."
  )
  static var openAppWhenRun: Bool = true

  func perform() async throws -> some IntentResult & ReturnsValue<String> {
    .result(value: "Hello from ET AppIntent")
  }
}
