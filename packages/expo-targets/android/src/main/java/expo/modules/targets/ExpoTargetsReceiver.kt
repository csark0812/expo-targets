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
            // Sanitize widget name same way as plugin does (replace non-alphanumeric with underscore)
            val widgetNameSanitized = widgetName.lowercase().replace(Regex("[^a-z0-9_]"), "_")
            // Convert to PascalCase for class name
            val widgetNamePascal = widgetName.split(Regex("[-_]"))
                .joinToString("") { it.replaceFirstChar { c -> c.uppercaseChar() } }

            ExpoTargetsLogger.d(TAG, "Widget name transformations: original=$widgetName, sanitized=$widgetNameSanitized, pascal=$widgetNamePascal")

            // Try Glance UpdateReceiver first (pattern: {packageName}.widget.{widgetnamelower}.{WidgetName}UpdateReceiver)
            val updateReceiverClass = "${context.packageName}.widget.${widgetNameSanitized}.${widgetNamePascal}UpdateReceiver"
            val updateComponentName = ComponentName(context.packageName, updateReceiverClass)

            // Check if Glance UpdateReceiver exists
            val packageManager = context.packageManager
            val updateReceiverInfo = try {
                packageManager.getReceiverInfo(updateComponentName, 0)
                true
            } catch (e: Exception) {
                ExpoTargetsLogger.d(TAG, "Glance UpdateReceiver not found: $updateReceiverClass (${e.message})")
                false
            }

            if (updateReceiverInfo) {
                // Glance widget - send direct update
                val updateIntent = Intent().apply {
                    component = updateComponentName
                    action = "expo.modules.targets.UPDATE_WIDGET"
                }
                ExpoTargetsLogger.d(TAG, "Sending direct update to Glance widget: $updateReceiverClass")
                context.sendBroadcast(updateIntent)
            } else {
                // Try RemoteViews Provider (pattern: {packageName}.widget.{widgetnamelower}.{WidgetName}Provider)
                val providerClass = "${context.packageName}.widget.${widgetNameSanitized}.${widgetNamePascal}Provider"
                val providerComponentName = ComponentName(context.packageName, providerClass)

                ExpoTargetsLogger.d(TAG, "Looking for RemoteViews Provider: $providerClass")

                val providerInfo = try {
                    packageManager.getReceiverInfo(providerComponentName, 0)
                    true
                } catch (e: Exception) {
                    ExpoTargetsLogger.d(TAG, "RemoteViews Provider not found: $providerClass (${e.message})")
                    false
                }

                if (providerInfo) {
                    ExpoTargetsLogger.d(TAG, "Found RemoteViews Provider: $providerClass")

                    // RemoteViews widget - send direct intent to provider to trigger onReceive -> onUpdate
                    val refreshIntent = Intent(WIDGET_EVENT_ACTION).apply {
                        component = providerComponentName
                        putExtra("EVENT_TYPE", "REFRESH")
                        putExtra("WIDGET_NAME", widgetName)
                    }
                    ExpoTargetsLogger.d(TAG, "Sending direct refresh intent to RemoteViews provider: $providerClass")
                    context.sendBroadcast(refreshIntent)
                } else {
                    ExpoTargetsLogger.w(TAG, "Neither Glance UpdateReceiver nor RemoteViews Provider found for widget: $widgetName")
                    ExpoTargetsLogger.w(TAG, "Tried: Glance=$updateReceiverClass, RemoteViews=$providerClass")
                }
            }

            ExpoTargetsLogger.i(TAG, "Successfully triggered refresh for $widgetName")
        } catch (e: Exception) {
            ExpoTargetsLogger.e(TAG, "Failed to refresh widget $widgetName", e)
        }
    }
}

