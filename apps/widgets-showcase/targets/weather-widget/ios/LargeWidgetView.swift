import SwiftUI
import WidgetKit

struct LargeWidgetView: View {
    let weather: WeatherData?

    var body: some View {
        ZStack {
            LinearGradient(
                colors: backgroundColors,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            VStack(spacing: 16) {
                // Header
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(weather?.location ?? "Unknown")
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.white)
                        Text("Updated: \(weather?.lastUpdated ?? "Now")")
                            .font(.system(size: 12))
                            .foregroundColor(.white.opacity(0.7))
                    }
                    Spacer()
                }

                // Current weather
                HStack(spacing: 20) {
                    Text(weatherIcon)
                        .font(.system(size: 60))

                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(Int(weather?.temperature ?? 72))°F")
                            .font(.system(size: 48, weight: .bold))
                            .foregroundColor(.white)
                        Text(weather?.condition ?? "Sunny")
                            .font(.system(size: 18, weight: .medium))
                            .foregroundColor(.white.opacity(0.9))
                    }

                    Spacer()
                }

                // Details grid
                HStack(spacing: 16) {
                    DetailCard(
                        icon: "💧",
                        label: "Humidity",
                        value: "\(Int(weather?.humidity ?? 65))%"
                    )

                    DetailCard(
                        icon: "💨",
                        label: "Wind",
                        value: "\(Int(weather?.windSpeed ?? 8)) mph"
                    )
                }

                Divider()
                    .background(Color.white.opacity(0.3))

                // 5-day forecast timeline
                VStack(alignment: .leading, spacing: 8) {
                    Text("5-DAY FORECAST")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(.white.opacity(0.7))

                    HStack(spacing: 12) {
                        ForEach(0..<5) { index in
                            ForecastDay(
                                day: dayName(offset: index),
                                icon: randomWeatherIcon(),
                                temp: randomTemp()
                            )
                        }
                    }
                }
            }
            .padding(20)
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

    private func dayName(offset: Int) -> String {
        let date = Calendar.current.date(byAdding: .day, value: offset, to: Date())!
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE"
        return formatter.string(from: date)
    }

    private func randomWeatherIcon() -> String {
        let icons = ["☀️", "⛅", "☁️", "🌧️"]
        return icons.randomElement() ?? "☀️"
    }

    private func randomTemp() -> Int {
        return Int.random(in: 65...85)
    }
}

struct DetailCard: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack(spacing: 8) {
            Text(icon)
                .font(.system(size: 24))
            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundColor(.white.opacity(0.7))
                Text(value)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(12)
        .background(Color.white.opacity(0.15))
        .cornerRadius(12)
    }
}

struct ForecastDay: View {
    let day: String
    let icon: String
    let temp: Int

    var body: some View {
        VStack(spacing: 6) {
            Text(day)
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(.white.opacity(0.8))
            Text(icon)
                .font(.system(size: 24))
            Text("\(temp)°")
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(.white)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color.white.opacity(0.1))
        .cornerRadius(10)
    }
}

