package com.test.widgetinteractive.weather

import androidx.compose.runtime.Composable
import androidx.glance.GlanceModifier
import androidx.glance.GlanceTheme
import androidx.glance.Image
import androidx.glance.ImageProvider
import androidx.glance.LocalSize
import androidx.glance.action.clickable
import androidx.glance.appwidget.action.actionStartActivity
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

/**
 * Main composable for Weather Widget
 * Provides different layouts based on widget size (small, medium, large)
 * 
 * Mirrors the iOS SwiftUI structure with separate views per size
 */
@Composable
fun WeatherWidgetView(data: WeatherData?) {
    val size = LocalSize.current
    
    // Background with rounded corners
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ColorProvider(R.color.background_color))
            .padding(16.dp)
            .cornerRadius(16.dp),
        contentAlignment = Alignment.Center
    ) {
        when {
            // No data - show placeholder
            data == null -> PlaceholderView()
            
            // Small widget (2x2) - compact view
            size.width.value < 200 -> SmallWidgetView(data)
            
            // Medium widget (4x2) - detailed view
            size.width.value < 300 -> MediumWidgetView(data)
            
            // Large widget (4x4) - full details
            else -> LargeWidgetView(data)
        }
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
                color = ColorProvider(R.color.text_primary)
            )
        )
        Spacer(modifier = GlanceModifier.height(4.dp))
        Text(
            text = "No data available",
            style = TextStyle(
                fontSize = 12.sp,
                color = ColorProvider(R.color.text_secondary)
            )
        )
    }
}

/**
 * Small widget view (2x2) - Compact temperature display
 * Mirrors SmallWidgetView.swift
 */
@Composable
fun SmallWidgetView(data: WeatherData) {
    Column(
        modifier = GlanceModifier.fillMaxSize(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Weather emoji
        Text(
            text = data.emoji,
            style = TextStyle(fontSize = 32.sp)
        )
        
        Spacer(modifier = GlanceModifier.height(4.dp))
        
        // Temperature
        Text(
            text = data.temperatureFormatted,
            style = TextStyle(
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
                color = ColorProvider(R.color.text_primary)
            )
        )
        
        // Location
        Text(
            text = data.location,
            style = TextStyle(
                fontSize = 11.sp,
                color = ColorProvider(R.color.text_secondary)
            )
        )
    }
}

/**
 * Medium widget view (4x2) - Temperature + condition + details
 * Mirrors MediumWidgetView.swift
 */
@Composable
fun MediumWidgetView(data: WeatherData) {
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
                style = TextStyle(fontSize = 40.sp)
            )
            Spacer(modifier = GlanceModifier.height(4.dp))
            Text(
                text = data.temperatureFormatted,
                style = TextStyle(
                    fontSize = 36.sp,
                    fontWeight = FontWeight.Bold,
                    color = ColorProvider(R.color.text_primary)
                )
            )
        }
        
        Spacer(modifier = GlanceModifier.width(16.dp))
        
        // Right side - Details
        Column(
            modifier = GlanceModifier.defaultWeight(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.Start
        ) {
            Text(
                text = data.location,
                style = TextStyle(
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    color = ColorProvider(R.color.text_primary)
                )
            )
            Spacer(modifier = GlanceModifier.height(2.dp))
            Text(
                text = data.condition,
                style = TextStyle(
                    fontSize = 14.sp,
                    color = ColorProvider(R.color.text_secondary)
                )
            )
            Spacer(modifier = GlanceModifier.height(8.dp))
            Text(
                text = "💧 ${data.humidityFormatted}",
                style = TextStyle(
                    fontSize = 12.sp,
                    color = ColorProvider(R.color.text_secondary)
                )
            )
            Text(
                text = "💨 ${data.windSpeedFormatted}",
                style = TextStyle(
                    fontSize = 12.sp,
                    color = ColorProvider(R.color.text_secondary)
                )
            )
        }
    }
}

/**
 * Large widget view (4x4) - Full weather details
 * Mirrors LargeWidgetView.swift
 */
@Composable
fun LargeWidgetView(data: WeatherData) {
    Column(
        modifier = GlanceModifier.fillMaxSize(),
        verticalAlignment = Alignment.Top,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Header - Location
        Text(
            text = data.location,
            style = TextStyle(
                fontSize = 20.sp,
                fontWeight = FontWeight.Bold,
                color = ColorProvider(R.color.text_primary)
            )
        )
        
        Spacer(modifier = GlanceModifier.height(4.dp))
        
        // Last updated
        Text(
            text = "Updated ${data.lastUpdated}",
            style = TextStyle(
                fontSize = 11.sp,
                color = ColorProvider(R.color.text_secondary)
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
                style = TextStyle(fontSize = 64.sp)
            )
            Spacer(modifier = GlanceModifier.width(16.dp))
            Text(
                text = data.temperatureFormatted,
                style = TextStyle(
                    fontSize = 56.sp,
                    fontWeight = FontWeight.Bold,
                    color = ColorProvider(R.color.text_primary)
                )
            )
        }
        
        Spacer(modifier = GlanceModifier.height(8.dp))
        
        // Condition
        Text(
            text = data.condition,
            style = TextStyle(
                fontSize = 18.sp,
                fontWeight = FontWeight.Medium,
                color = ColorProvider(R.color.text_secondary)
            )
        )
        
        Spacer(modifier = GlanceModifier.height(24.dp))
        
        // Details grid
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            horizontalAlignment = Alignment.SpaceAround
        ) {
            // Humidity
            Column(
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "💧",
                    style = TextStyle(fontSize = 24.sp)
                )
                Spacer(modifier = GlanceModifier.height(4.dp))
                Text(
                    text = data.humidityFormatted,
                    style = TextStyle(
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium,
                        color = ColorProvider(R.color.text_primary)
                    )
                )
                Text(
                    text = "Humidity",
                    style = TextStyle(
                        fontSize = 11.sp,
                        color = ColorProvider(R.color.text_secondary)
                    )
                )
            }
            
            // Wind Speed
            Column(
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "💨",
                    style = TextStyle(fontSize = 24.sp)
                )
                Spacer(modifier = GlanceModifier.height(4.dp))
                Text(
                    text = data.windSpeedFormatted,
                    style = TextStyle(
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Medium,
                        color = ColorProvider(R.color.text_primary)
                    )
                )
                Text(
                    text = "Wind",
                    style = TextStyle(
                        fontSize = 11.sp,
                        color = ColorProvider(R.color.text_secondary)
                    )
                )
            }
        }
    }
}
