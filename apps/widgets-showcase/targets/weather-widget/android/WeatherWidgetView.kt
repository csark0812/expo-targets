package com.test.widgetshowcase.weather

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.LocalSize
import androidx.glance.appwidget.cornerRadius
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.test.widgetshowcase.R

/**
 * Main composable for Weather Widget
 * Provides different layouts based on widget size (small, medium, large)
 * Mirrors the iOS SwiftUI WeatherWidgetView structure
 */
@Composable
fun WeatherWidgetView(data: WeatherData?) {
    val size = LocalSize.current

    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(getBackgroundColor(data))
            .padding(16.dp)
            .cornerRadius(16.dp),
        contentAlignment = Alignment.Center
    ) {
        when {
            // No data - show placeholder
            data == null -> PlaceholderView()

            // Small widget (2x2) - compact view
            size.width.value < 200 -> SmallWeatherView(data)

            // Medium widget (4x2) - detailed view
            size.width.value < 300 -> MediumWeatherView(data)

            // Large widget (4x4) - full details
            else -> LargeWeatherView(data)
        }
    }
}

/**
 * Get background color based on weather condition
 * Mirrors the backgroundColors computed property in iOS views
 */
@Composable
private fun getBackgroundColor(data: WeatherData?): ColorProvider {
    return when (data?.condition?.lowercase()) {
        "sunny", "clear" -> ColorProvider(R.color.weatherwidget_sunny_color)
        "cloudy", "overcast" -> ColorProvider(R.color.weatherwidget_cloudy_color)
        "rainy", "rain" -> ColorProvider(R.color.weatherwidget_rainy_color)
        else -> ColorProvider(R.color.weatherwidget_background_color)
    }
}

/**
 * Placeholder view when no data is available
 */
@Composable
fun PlaceholderView() {
    Column(
        modifier = GlanceModifier.fillMaxSize(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        Text(
            text = "☁️",
            style = TextStyle(fontSize = 48.sp)
        )
        Spacer(modifier = GlanceModifier.height(8.dp))
        Text(
            text = "Weather",
            style = TextStyle(
                fontSize = 16.sp,
                fontWeight = FontWeight.Medium,
                color = ColorProvider(R.color.weatherwidget_text_primary)
            )
        )
        Spacer(modifier = GlanceModifier.height(4.dp))
        Text(
            text = "No data available",
            style = TextStyle(
                fontSize = 12.sp,
                color = ColorProvider(R.color.weatherwidget_text_secondary)
            )
        )
    }
}

/**
 * Small widget view (2x2) - Compact weather display
 * Mirrors SmallWidgetView.swift
 */
@Composable
fun SmallWeatherView(data: WeatherData) {
    Column(
        modifier = GlanceModifier.fillMaxSize(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Weather emoji
        Text(
            text = data.emoji,
            style = TextStyle(fontSize = 40.sp)
        )

        Spacer(modifier = GlanceModifier.height(8.dp))

        // Temperature
        Text(
            text = data.temperatureFormatted,
            style = TextStyle(
                fontSize = 42.sp,
                fontWeight = FontWeight.Bold,
                color = ColorProvider(android.R.color.white)
            )
        )

        Spacer(modifier = GlanceModifier.height(4.dp))

        // Condition
        Text(
            text = data.condition,
            style = TextStyle(
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                color = ColorProvider(android.R.color.white)
            )
        )

        Spacer(modifier = GlanceModifier.height(8.dp))

        // Location
        Text(
            text = data.location,
            style = TextStyle(
                fontSize = 11.sp,
                color = ColorProvider(android.R.color.white)
            )
        )
    }
}

/**
 * Medium widget view (4x2) - Temperature + condition + details
 * Mirrors MediumWidgetView.swift
 */
@Composable
fun MediumWeatherView(data: WeatherData) {
    Row(
        modifier = GlanceModifier.fillMaxSize(),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Left side - Temperature and emoji
        Column(
            modifier = GlanceModifier.defaultWeight(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = data.emoji,
                style = TextStyle(fontSize = 50.sp)
            )
            Spacer(modifier = GlanceModifier.height(8.dp))
            Text(
                text = data.temperatureFormatted,
                style = TextStyle(
                    fontSize = 48.sp,
                    fontWeight = FontWeight.Bold,
                    color = ColorProvider(android.R.color.white)
                )
            )
            Spacer(modifier = GlanceModifier.height(4.dp))
            Text(
                text = data.condition,
                style = TextStyle(
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                    color = ColorProvider(android.R.color.white)
                )
            )
        }

        Spacer(modifier = GlanceModifier.width(20.dp))

        // Right side - Details
        Column(
            modifier = GlanceModifier.defaultWeight(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.Start
        ) {
            // Location
            Column(verticalAlignment = Alignment.Top) {
                Text(
                    text = "LOCATION",
                    style = TextStyle(
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        color = ColorProvider(android.R.color.white)
                    )
                )
                Spacer(modifier = GlanceModifier.height(4.dp))
                Text(
                    text = data.location,
                    style = TextStyle(
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium,
                        color = ColorProvider(android.R.color.white)
                    )
                )
            }

            Spacer(modifier = GlanceModifier.height(12.dp))

            // Humidity
            Column(verticalAlignment = Alignment.Top) {
                Text(
                    text = "HUMIDITY",
                    style = TextStyle(
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        color = ColorProvider(android.R.color.white)
                    )
                )
                Spacer(modifier = GlanceModifier.height(4.dp))
                Text(
                    text = data.humidityFormatted,
                    style = TextStyle(
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium,
                        color = ColorProvider(android.R.color.white)
                    )
                )
            }

            Spacer(modifier = GlanceModifier.height(12.dp))

            // Wind
            Column(verticalAlignment = Alignment.Top) {
                Text(
                    text = "WIND",
                    style = TextStyle(
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Medium,
                        color = ColorProvider(android.R.color.white)
                    )
                )
                Spacer(modifier = GlanceModifier.height(4.dp))
                Text(
                    text = data.windSpeedFormatted,
                    style = TextStyle(
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium,
                        color = ColorProvider(android.R.color.white)
                    )
                )
            }
        }
    }
}

/**
 * Large widget view (4x4) - Full weather details
 * Mirrors LargeWidgetView.swift
 */
@Composable
fun LargeWeatherView(data: WeatherData) {
    Column(
        modifier = GlanceModifier.fillMaxSize(),
        verticalAlignment = Alignment.Top,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Header - Location
        Text(
            text = data.location,
            style = TextStyle(
                fontSize = 22.sp,
                fontWeight = FontWeight.Bold,
                color = ColorProvider(android.R.color.white)
            )
        )

        Spacer(modifier = GlanceModifier.height(4.dp))

        // Last updated
        Text(
            text = "Updated: ${data.lastUpdated}",
            style = TextStyle(
                fontSize = 12.sp,
                color = ColorProvider(android.R.color.white)
            )
        )

        Spacer(modifier = GlanceModifier.height(16.dp))

        // Main content - Temperature and emoji
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = data.emoji,
                style = TextStyle(fontSize = 60.sp)
            )
            Spacer(modifier = GlanceModifier.width(20.dp))
            Column(
                horizontalAlignment = Alignment.Start
            ) {
                Text(
                    text = "${data.temperatureFormatted}F",
                    style = TextStyle(
                        fontSize = 48.sp,
                        fontWeight = FontWeight.Bold,
                        color = ColorProvider(android.R.color.white)
                    )
                )
                Text(
                    text = data.condition,
                    style = TextStyle(
                        fontSize = 18.sp,
                        fontWeight = FontWeight.Medium,
                        color = ColorProvider(android.R.color.white)
                    )
                )
            }
        }

        Spacer(modifier = GlanceModifier.height(24.dp))

        // Details grid
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Humidity
            DetailCard(
                icon = "💧",
                label = "Humidity",
                value = data.humidityFormatted
            )

            Spacer(modifier = GlanceModifier.width(16.dp))

            // Wind Speed
            DetailCard(
                icon = "💨",
                label = "Wind",
                value = data.windSpeedFormatted
            )
        }
    }
}

/**
 * Detail card composable for large widget
 * Mirrors DetailCard struct in LargeWidgetView.swift
 */
@Composable
fun DetailCard(icon: String, label: String, value: String) {
    Row(
        modifier = GlanceModifier
            .background(ColorProvider(android.R.color.white))
            .padding(12.dp)
            .cornerRadius(12.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = icon,
            style = TextStyle(fontSize = 24.sp)
        )

        Spacer(modifier = GlanceModifier.width(8.dp))

        Column(
            horizontalAlignment = Alignment.Start
        ) {
            Text(
                text = label,
                style = TextStyle(
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Medium,
                    color = ColorProvider(R.color.weatherwidget_text_secondary)
                )
            )
            Spacer(modifier = GlanceModifier.height(2.dp))
            Text(
                text = value,
                style = TextStyle(
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    color = ColorProvider(R.color.weatherwidget_text_primary)
                )
            )
        }
    }
}

