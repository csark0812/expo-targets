import SwiftUI
import WidgetKit

struct SmallWidgetView: View {
    let weather: WeatherData?

    var body: some View {
        ZStack {
            // Background gradient based on condition
            LinearGradient(
                colors: backgroundColors,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(spacing: 8) {
                // Weather icon
                Text(weatherIcon)
                    .font(.system(size: 40))

                // Temperature
                Text("\(Int(weather?.temperature ?? 72))°")
                    .font(.system(size: 42, weight: .bold))
                    .foregroundColor(.white)

                // Condition
                Text(weather?.condition ?? "Sunny")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.white.opacity(0.9))

                Spacer()

                // Location
                Text(weather?.location ?? "Unknown")
                    .font(.system(size: 11, weight: .regular))
                    .foregroundColor(.white.opacity(0.8))
            }
            .padding(16)
        }
    }

    private var weatherIcon: String {
        switch weather?.condition {
        case "Sunny", "Clear": return "☀️"
        case "Cloudy": return "☁️"
        case "Partly Cloudy": return "⛅"
        case "Rainy": return "🌧️"
        default: return "🌤️"
        }
    }

    private var backgroundColors: [Color] {
        switch weather?.condition {
        case "Sunny", "Clear":
            return [Color("SunnyColor"), Color("SunnyColor").opacity(0.7)]
        case "Cloudy":
            return [Color("CloudyColor"), Color("CloudyColor").opacity(0.7)]
        case "Rainy":
            return [Color("RainyColor"), Color("RainyColor").opacity(0.7)]
        default:
            return [Color("AccentColor"), Color("AccentColor").opacity(0.7)]
        }
    }
}

