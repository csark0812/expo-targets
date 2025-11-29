import AppIntents

struct OpenAppIntent: AppIntent {
    static var title: LocalizedStringResource = "Open Demo App"
    static var description = IntentDescription("Opens the Demo App")

    static var openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        return .result()
    }
}

struct GetGreetingIntent: AppIntent {
    static var title: LocalizedStringResource = "Get Greeting"
    static var description = IntentDescription("Returns a personalized greeting")

    @Parameter(title: "Name")
    var name: String

    func perform() async throws -> some IntentResult & ReturnsValue<String> {
        let greeting = "Hello, \(name)! 👋"
        return .result(value: greeting)
    }
}

struct CounterIntent: AppIntent {
    static var title: LocalizedStringResource = "Increment Counter"
    static var description = IntentDescription("Increments a shared counter value")

    @Parameter(title: "Amount", default: 1)
    var amount: Int

    func perform() async throws -> some IntentResult & ReturnsValue<Int> {
        let defaults = UserDefaults.standard
        let currentValue = defaults.integer(forKey: "demoCounter")
        let newValue = currentValue + amount
        defaults.set(newValue, forKey: "demoCounter")
        return .result(value: newValue)
    }
}

