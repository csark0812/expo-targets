package expo.modules.targets

import android.content.BroadcastReceiver
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import kotlin.concurrent.thread

open class ExpoTargetsReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "Receiver"
        const val WIDGET_EVENT_ACTION = "expo.modules.targets.WIDGET_EVENT"

        fun refreshWidget(context: Context, widgetName: String) {
            ExpoTargetsLogger.init(context)
            ExpoTargetsLogger.d(TAG, "refreshWidget called: widgetName=$widgetName")

            val intent = Intent(WIDGET_EVENT_ACTION).apply {
                setPackage(context.packageName)
                putExtra("EVENT_TYPE", "REFRESH")
                putExtra("WIDGET_NAME", widgetName)
            }

            context.sendBroadcast(intent)
            ExpoTargetsLogger.d(TAG, "Broadcast sent for widget: $widgetName")
        }
    }

    override fun onReceive(context: Context, intent: Intent?) {
        ExpoTargetsLogger.init(context)
        ExpoTargetsLogger.d(TAG, "onReceive: action=${intent?.action}, extras=${intent?.extras?.keySet()?.toList()}")

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
        val eventType = intent.getStringExtra("EVENT_TYPE")
        ExpoTargetsLogger.d(TAG, "handleIntent: eventType=$eventType")

        when (eventType) {
            "REFRESH" -> {
                val widgetName = intent.getStringExtra("WIDGET_NAME")
                ExpoTargetsLogger.d(TAG, "Handling REFRESH event for widget: $widgetName")
                refreshWidgetViews(context, widgetName)
            }
            else -> {
                ExpoTargetsLogger.d(TAG, "Unknown event type: $eventType")
            }
        }
    }

    private fun refreshWidgetViews(context: Context, widgetName: String?) {
        ExpoTargetsLogger.d(TAG, "refreshWidgetViews: widgetName=$widgetName")

        if (widgetName == null) {
            ExpoTargetsLogger.w(TAG, "Widget name is null, cannot refresh")
            return
        }

        try {
            // Send directly to the widget's UpdateReceiver which bypasses
            // Android widget system and calls GlanceAppWidget.update() directly.
            // Pattern: {packageName}.widget.{widgetnamelower}.{WidgetName}UpdateReceiver
            val widgetNameLower = widgetName.lowercase()
            val updateReceiverClass = "${context.packageName}.widget.${widgetNameLower}.${widgetName}UpdateReceiver"
            val componentName = ComponentName(context.packageName, updateReceiverClass)

            val updateIntent = Intent().apply {
                component = componentName
                action = "expo.modules.targets.UPDATE_WIDGET"
            }

            ExpoTargetsLogger.d(TAG, "Sending direct update to: $updateReceiverClass")
            context.sendBroadcast(updateIntent)

            ExpoTargetsLogger.i(TAG, "Successfully triggered direct refresh for $widgetName")
        } catch (e: Exception) {
            ExpoTargetsLogger.e(TAG, "Failed to refresh widget $widgetName", e)
        }
    }
}

