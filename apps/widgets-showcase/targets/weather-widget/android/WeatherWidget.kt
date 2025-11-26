package com.test.widgetshowcase.widget.weatherwidget

import android.content.Context
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.currentState
import androidx.glance.state.PreferencesGlanceStateDefinition
import expo.modules.targets.ExpoTargetsWidgetUpdateReceiver
import kotlinx.serialization.json.Json

private val WEATHER_KEY = stringPreferencesKey("weather")

class WeatherWidget : GlanceAppWidget() {
    override val stateDefinition = PreferencesGlanceStateDefinition

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            val prefs = currentState<androidx.datastore.preferences.core.Preferences>()
            val jsonString = prefs[WEATHER_KEY]

            val weatherData = jsonString?.let {
                try {
                    Json.decodeFromString<WeatherData>(it)
                } catch (e: Exception) {
                    null
                }
            }

            WeatherWidgetView(weatherData)
        }
    }
}

class WeatherWidgetUpdateReceiver : ExpoTargetsWidgetUpdateReceiver<WeatherWidget>(
    WeatherWidget::class,
    "group.com.test.widgetshowcase"
)

class WeatherWidgetWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = WeatherWidget()
}

