package com.test.widgetshowcase.hello

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent

/**
 * Hello Widget using Glance API
 *
 * Displays a simple message shared from the main app via SharedPreferences.
 * Mirrors the iOS WidgetKit HelloWidget implementation.
 */
class HelloWidget : GlanceAppWidget() {
    override suspend fun provideGlance(context: Context, id: GlanceId) {
        // Load message from SharedPreferences
        val message = loadMessage(context)

        provideContent {
            // Render the widget UI using Compose
            HelloWidgetView(message)
        }
    }

    /**
     * Load message from SharedPreferences
     * Mirrors iOS UserDefaults loading
     */
    private fun loadMessage(context: Context): String {
        val prefs = context.getSharedPreferences("expo_targets", Context.MODE_PRIVATE)
        return prefs.getString("message", null) ?: "No message yet"
    }
}

/**
 * Receiver for the Hello Widget
 * Required by Android to register the widget with the system
 */
class HelloWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = HelloWidget()

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

