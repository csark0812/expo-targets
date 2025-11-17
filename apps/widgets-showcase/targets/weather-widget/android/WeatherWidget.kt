package com.test.widgetshowcase.weather

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import kotlinx.serialization.json.Json
import kotlinx.serialization.decodeFromString

/**
 * Weather Widget using Glance API
 *
 * Displays weather information shared from the main app via SharedPreferences.
 * Mirrors the iOS WidgetKit WeatherWidget implementation.
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

    override fun onUpdate(
        context: Context,
        appWidgetManager: android.appwidget.AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        // Explicitly update each widget instance to render content
        appWidgetIds.forEach { appWidgetId ->
            val glanceId = androidx.glance.appwidget.GlanceAppWidgetManager(context)
                .getGlanceIdBy(appWidgetId)
            kotlinx.coroutines.runBlocking {
                glanceAppWidget.update(context, glanceId)
            }
        }
    }
}

