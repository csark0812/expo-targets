package com.test.widgetshowcase.widget.counterwidget

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
     *
     * IMPORTANT: The SharedPreferences name must match the appGroup
     * used by the main app's storage module (ExpoTargetsStorageModule).
     */
    private fun loadCounterData(context: Context): CounterData {
        // Use the appGroup from expo-target.config.json as the SharedPreferences name
        val prefs = context.getSharedPreferences("group.com.test.widgetshowcase", Context.MODE_PRIVATE)

        // The main app stores count as an Int directly
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
class CounterWidgetWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = CounterWidget()

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

