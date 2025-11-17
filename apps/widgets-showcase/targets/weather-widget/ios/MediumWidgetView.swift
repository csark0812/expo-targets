import SwiftUI
import WidgetKit

struct MediumWidgetView: View {
    let weather: WeatherData?

    var body: some View {
        ZStack {
            LinearGradient(
                colors: backgroundColors,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            HStack(spacing: 20) {
                // Left side: Temperature and icon
                VStack(alignment: .center, spacing: 8) {
                    Text(weatherIcon)
                        .font(.system(size: 50))

                    Text("\(Int(weather?.temperature ?? 72))°")
                        .font(.system(size: 48, weight: .bold))
                        .foregroundColor(.white)

                    Text(weather?.condition ?? "Sunny")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundColor(.white.opacity(0.9))
                }
                .frame(maxWidth: .infinity)

                Divider()
                    .background(Color.white.opacity(0.3))

                // Right side: Details
                VStack(alignment: .leading, spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("LOCATION")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.white.opacity(0.7))
                        Text(weather?.location ?? "Unknown")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("HUMIDITY")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.white.opacity(0.7))
                        Text("\(Int(weather?.humidity ?? 65))%")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text("WIND")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundColor(.white.opacity(0.7))
                        Text("\(Int(weather?.windSpeed ?? 8)) mph")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundColor(.white)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
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

