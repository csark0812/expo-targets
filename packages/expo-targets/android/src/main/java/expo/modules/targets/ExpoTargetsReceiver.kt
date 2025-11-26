package expo.modules.targets

import android.appwidget.AppWidgetManager
import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import kotlin.concurrent.thread

open class ExpoTargetsReceiver : BroadcastReceiver() {
    companion object {
        const val WIDGET_EVENT_ACTION = "expo.modules.targets.WIDGET_EVENT"

        fun refreshWidget(context: Context, widgetName: String) {
            val intent = Intent(WIDGET_EVENT_ACTION).apply {
                setPackage(context.packageName)
                putExtra("EVENT_TYPE", "REFRESH")
                putExtra("WIDGET_NAME", widgetName)
            }
            context.sendBroadcast(intent)
        }
    }

    override fun onReceive(context: Context, intent: Intent?) {
        val pendingIntent = goAsync()
        thread {
            try {
                intent?.run { handleIntent(context, intent) }
            } finally {
                pendingIntent.finish()
            }
        }
    }

    private fun handleIntent(context: Context, intent: Intent) {
        when (intent.getStringExtra("EVENT_TYPE")) {
            "REFRESH" -> {
                val widgetName = intent.getStringExtra("WIDGET_NAME")
                refreshWidgetViews(context, widgetName)
            }
        }
    }

    private fun refreshWidgetViews(context: Context, widgetName: String?) {
        if (widgetName == null) {
            android.util.Log.w("ExpoTargetsReceiver", "Widget name is null, cannot refresh")
            return
        }

        try {
            val appWidgetManager = AppWidgetManager.getInstance(context)
            // Build component name matching the manifest registration pattern:
            // {packageName}.widget.{widgetnamelower}.{WidgetName}WidgetReceiver
            val widgetNameLower = widgetName.lowercase()
            val componentName = ComponentName(
                context.packageName,
                "${context.packageName}.widget.${widgetNameLower}.${widgetName}WidgetReceiver"
            )

            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)

            if (appWidgetIds.isEmpty()) {
                android.util.Log.d("ExpoTargetsReceiver", "No widget instances found for $widgetName")
                return
            }

            // Notify all widget instances to update
            appWidgetManager.notifyAppWidgetViewDataChanged(appWidgetIds, android.R.id.list)

            // Also trigger update to force widget provider's onUpdate
            // Send a single broadcast for all widget IDs
            val updateIntent = Intent(AppWidgetManager.ACTION_APPWIDGET_UPDATE).apply {
                component = componentName
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
            }
            context.sendBroadcast(updateIntent)

            android.util.Log.d("ExpoTargetsReceiver", "Refreshed ${appWidgetIds.size} widget instance(s) for $widgetName")
        } catch (e: ClassNotFoundException) {
            android.util.Log.w("ExpoTargetsReceiver", "Widget provider not found for $widgetName: ${e.message}")
        } catch (e: Exception) {
            android.util.Log.e("ExpoTargetsReceiver", "Failed to refresh widget $widgetName", e)
        }
    }
}

