package com.test.widgetshowcase.counter

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent

/**
 * Counter Widget using Glance API
 *
 * Displays a counter with optional label from SharedPreferences.
 * Mirrors the iOS WidgetKit CounterWidget implementation.
 */
class CounterWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // Load counter data from SharedPreferences
        val counterData = loadCounterData(context)

        provideContent {
            // Render the widget UI using Compose
            CounterWidgetView(counterData)
        }
    }

    /**
     * Load counter data from SharedPreferences
     * Mirrors iOS UserDefaults loading
     */
    private fun loadCounterData(context: Context): CounterData {
        val prefs = context.getSharedPreferences("expo_targets", Context.MODE_PRIVATE)
        val count = prefs.getInt("count", 0)
        val label = prefs.getString("label", null)

        return CounterData(count, label)
    }
}

/**
 * Counter data model matching the TypeScript interface
 */
data class CounterData(
    val count: Int,
    val label: String?
)

/**
 * Receiver for the Counter Widget
 * Required by Android to register the widget with the system
 */
class CounterWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = CounterWidget()
}

