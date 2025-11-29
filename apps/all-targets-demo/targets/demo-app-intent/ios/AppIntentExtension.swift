import AppIntents

@main
struct DemoAppIntentExtension: AppIntentsExtension {
}

struct DemoAppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: OpenAppIntent(),
            phrases: [
                "Open \(.applicationName)",
                "Launch \(.applicationName)"
            ],
            shortTitle: "Open App",
            systemImageName: "app"
        )

        AppShortcut(
            intent: GetGreetingIntent(),
            phrases: [
                "Say hello with \(.applicationName)",
                "Get a greeting from \(.applicationName)"
            ],
            shortTitle: "Get Greeting",
            systemImageName: "hand.wave"
        )

        AppShortcut(
            intent: CounterIntent(),
            phrases: [
                "Increment counter in \(.applicationName)",
                "Add to counter with \(.applicationName)"
            ],
            shortTitle: "Increment Counter",
            systemImageName: "plus.circle"
        )
    }
}

