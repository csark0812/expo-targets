import WidgetKit
import SwiftUI

struct WeatherEntry: TimelineEntry {
    let date: Date
    let weather: WeatherData?
}

struct WeatherData: Codable {
    let temperature: Double
    let condition: String
    let location: String
    let humidity: Double
    let windSpeed: Double
    let lastUpdated: String
}

struct Provider: TimelineProvider {
    let appGroup = "group.com.test.widgetshowcase"

    func placeholder(in context: Context) -> WeatherEntry {
        WeatherEntry(
            date: Date(),
            weather: WeatherData(
                temperature: 72,
                condition: "Sunny",
                location: "San Francisco",
                humidity: 65,
                windSpeed: 8,
                lastUpdated: "Now"
            )
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (WeatherEntry) -> ()) {
        let entry = WeatherEntry(date: Date(), weather: loadWeatherData())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<WeatherEntry>) -> ()) {
        let currentDate = Date()
        let weather = loadWeatherData()

        // Generate timeline entries for the next 24 hours (hourly updates)
        var entries: [WeatherEntry] = []
        for hourOffset in 0..<24 {
            let entryDate = Calendar.current.date(byAdding: .hour, value: hourOffset, to: currentDate)!
            let entry = WeatherEntry(date: entryDate, weather: weather)
            entries.append(entry)
        }

        // Refresh after 24 hours
        let nextUpdate = Calendar.current.date(byAdding: .hour, value: 24, to: currentDate)!
        let timeline = Timeline(entries: entries, policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadWeatherData() -> WeatherData? {
        guard let defaults = UserDefaults(suiteName: appGroup),
              let jsonString = defaults.string(forKey: "weather"),
              let jsonData = jsonString.data(using: .utf8) else {
            return nil
        }

        return try? JSONDecoder().decode(WeatherData.self, from: jsonData)
    }
}

@main
struct WeatherWidget: Widget {
    let kind: String = "WeatherWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            WeatherWidgetView(entry: entry)
        }
        .configurationDisplayName("Weather")
        .description("Real-time weather updates")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

