package com.test.widgetinteractive.weather

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.decodeFromString

/**
 * Weather Widget using Glance API (modern approach for Android 13+)
 * 
 * This widget displays weather information shared from the main app via SharedPreferences.
 * It mirrors the iOS WidgetKit implementation structure.
 */
class WeatherWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // Load weather data from SharedPreferences
        val weatherData = loadWeatherData(context)
        
        provideContent {
            // Render the widget UI using Compose
            WeatherWidgetView(weatherData)
        }
    }
    
    /**
     * Load weather data from SharedPreferences
     * Mirrors iOS UserDefaults loading in Widget.swift
     */
    private fun loadWeatherData(context: Context): WeatherData? {
        // Use the same SharedPreferences name as the main app
        val prefs = context.getSharedPreferences("expo_targets", Context.MODE_PRIVATE)
        
        // Get the JSON string for the "weather" key
        val jsonString = prefs.getString("weather", null) ?: return null
        
        return try {
            // Deserialize JSON to WeatherData
            Json.decodeFromString<WeatherData>(jsonString)
        } catch (e: Exception) {
            // Log error and return null if parsing fails
            android.util.Log.e("WeatherWidget", "Failed to parse weather data", e)
            null
        }
    }
}

/**
 * Receiver for the Weather Widget
 * Required by Android to register the widget with the system
 */
class WeatherWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = WeatherWidget()
}
