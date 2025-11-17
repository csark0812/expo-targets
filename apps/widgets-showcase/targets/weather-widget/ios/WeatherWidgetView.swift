import SwiftUI
import WidgetKit

struct WeatherWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: WeatherEntry

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(weather: entry.weather)
        case .systemMedium:
            MediumWidgetView(weather: entry.weather)
        case .systemLarge:
            LargeWidgetView(weather: entry.weather)
        default:
            SmallWidgetView(weather: entry.weather)
        }
    }
}

