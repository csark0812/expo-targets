import WidgetKit
import SwiftUI
import KeychainAccess
import SDWebImageSwiftUI

struct DemoEntry: TimelineEntry {
    let date: Date
    let message: String
    let isLoggedIn: Bool
    let username: String?
    let avatarURL: URL?
    let weatherIcon: String?
    let temperature: Int?
}

struct Provider: TimelineProvider {
    let appGroup = "group.com.test.alltargetsdemo"
    let keychain = Keychain(service: "com.test.alltargetsdemo", accessGroup: "group.com.test.alltargetsdemo")

    func placeholder(in context: Context) -> DemoEntry {
        DemoEntry(
            date: Date(),
            message: "Demo Widget",
            isLoggedIn: false,
            username: nil,
            avatarURL: nil,
            weatherIcon: "cloud.sun.fill",
            temperature: 72
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (DemoEntry) -> ()) {
        let (isLoggedIn, username) = loadAuthStatus()
        let (avatarURL, weatherIcon, temperature) = loadExtraData()
        let entry = DemoEntry(
            date: Date(),
            message: loadMessage(),
            isLoggedIn: isLoggedIn,
            username: username,
            avatarURL: avatarURL,
            weatherIcon: weatherIcon,
            temperature: temperature
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<DemoEntry>) -> ()) {
        let (isLoggedIn, username) = loadAuthStatus()
        let (avatarURL, weatherIcon, temperature) = loadExtraData()
        let entry = DemoEntry(
            date: Date(),
            message: loadMessage(),
            isLoggedIn: isLoggedIn,
            username: username,
            avatarURL: avatarURL,
            weatherIcon: weatherIcon,
            temperature: temperature
        )
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadMessage() -> String {
        let defaults = UserDefaults(suiteName: appGroup)
        // expo-targets storage stores values directly by key, not in nested dictionary
        if let message = defaults?.string(forKey: "message") {
            return message
        }
        return "All Targets Demo"
    }

    private func loadAuthStatus() -> (isLoggedIn: Bool, username: String?) {
        // Try keychain first (secure storage shared via access group)
        if let token = try? keychain.get("authToken"), !token.isEmpty {
            let username = try? keychain.get("username")
            return (true, username)
        }

        // Fallback to UserDefaults - expo-targets stores booleans as integers (1/0)
        let defaults = UserDefaults(suiteName: appGroup)
        let isLoggedIn = (defaults?.integer(forKey: "isLoggedIn") ?? 0) != 0
        let username = defaults?.string(forKey: "username")

        if isLoggedIn {
            return (true, username)
        }
        return (false, nil)
    }

    private func loadExtraData() -> (avatarURL: URL?, weatherIcon: String?, temperature: Int?) {
        let defaults = UserDefaults(suiteName: appGroup)

        var avatarURL: URL? = nil
        if let urlString = defaults?.string(forKey: "avatarURL") {
            avatarURL = URL(string: urlString)
        }

        let weatherIcon = defaults?.string(forKey: "weatherIcon")
        let temperature = defaults?.integer(forKey: "temperature")

        return (avatarURL, weatherIcon, temperature != 0 ? temperature : nil)
    }
}

@main
struct DemoWidget: Widget {
    let kind: String = "DemoWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            DemoWidgetView(entry: entry)
        }
        .configurationDisplayName("Demo Widget")
        .description("Demonstrates widget configuration")
        .supportedFamilies([.systemSmall])
    }
}

struct DemoWidgetView: View {
    var entry: Provider.Entry

    var body: some View {
        ZStack {
            Color("BackgroundColor")

            VStack(spacing: 4) {
                // Avatar using SDWebImageSwiftUI for async loading
                HStack(spacing: 8) {
                    if let avatarURL = entry.avatarURL {
                        // SDWebImageSwiftUI 3.0 Result Builder syntax
                        WebImage(url: avatarURL) { image in
                            image
                                .resizable()
                                .scaledToFill()
                        } placeholder: {
                            Image(systemName: "person.circle.fill")
                                .font(.system(size: 24))
                                .foregroundColor(Color("AccentColor"))
                        }
                        .frame(width: 32, height: 32)
                        .clipShape(Circle())
                    } else {
                        Image(systemName: entry.isLoggedIn ? "person.crop.circle.fill.badge.checkmark" : "person.crop.circle.badge.questionmark")
                            .font(.system(size: 24))
                            .foregroundColor(Color("AccentColor"))
                            .symbolRenderingMode(.hierarchical)
                    }

                    // Weather info (demo of more complex data)
                    if let icon = entry.weatherIcon, let temp = entry.temperature {
                        HStack(spacing: 2) {
                            Image(systemName: icon)
                                .font(.system(size: 14))
                                .foregroundColor(.orange)
                            Text("\(temp)°")
                                .font(.caption2)
                                .fontWeight(.medium)
                        }
                    }
                }

                if entry.isLoggedIn, let username = entry.username {
                    Text("Hi, \(username)!")
                        .font(.caption2)
                        .fontWeight(.medium)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }

                Text(entry.message)
                    .font(.footnote)
                    .fontWeight(.semibold)
                    .multilineTextAlignment(.center)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)

                Text(entry.isLoggedIn ? "✓ Signed In" : "Not Signed In")
                    .font(.caption2)
                    .foregroundColor(entry.isLoggedIn ? .green : .secondary)
            }
            .padding(10)
        }
    }
}

