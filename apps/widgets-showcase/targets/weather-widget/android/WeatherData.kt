package com.test.widgetshowcase.weather

import kotlinx.serialization.Serializable

/**
 * Weather data model matching the TypeScript interface
 *
 * This matches the WeatherData interface in index.ts:
 * ```typescript
 * interface WeatherData {
 *   temperature: number;
 *   condition: string;
 *   location: string;
 *   humidity: number;
 *   windSpeed: number;
 *   lastUpdated: string;
 * }
 * ```
 */
@Serializable
data class WeatherData(
    val temperature: Double,
    val condition: String,
    val location: String,
    val humidity: Double,
    val windSpeed: Double,
    val lastUpdated: String
) {
    /**
     * Get temperature as formatted string
     */
    val temperatureFormatted: String
        get() = "${temperature.toInt()}°"

    /**
     * Get humidity as formatted string
     */
    val humidityFormatted: String
        get() = "${humidity.toInt()}%"

    /**
     * Get wind speed as formatted string
     */
    val windSpeedFormatted: String
        get() = "${windSpeed.toInt()} mph"

    /**
     * Get weather emoji based on condition
     */
    val emoji: String
        get() = when (condition.lowercase()) {
            "sunny", "clear" -> "☀️"
            "cloudy", "overcast" -> "☁️"
            "partly cloudy" -> "⛅"
            "rainy", "rain" -> "🌧️"
            "snowy", "snow" -> "❄️"
            "stormy", "thunderstorm" -> "⛈️"
            "foggy", "fog" -> "🌫️"
            "windy" -> "💨"
            else -> "🌤️"
        }
}

