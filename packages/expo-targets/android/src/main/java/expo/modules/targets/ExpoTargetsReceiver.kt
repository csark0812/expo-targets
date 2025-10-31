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
        // Trigger AppWidgetManager update for all instances of this widget
        // Implementation depends on generated widget providers
        if (widgetName != null) {
            try {
                val appWidgetManager = AppWidgetManager.getInstance(context)
                val componentName = ComponentName(
                    context.packageName,
                    "${context.packageName}.widget.${widgetName}"
                )
                val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
                if (appWidgetIds.isNotEmpty()) {
                    appWidgetManager.notifyAppWidgetViewDataChanged(
                        appWidgetIds,
                        android.R.id.list
                    )
                }
            } catch (e: Exception) {
                // Widget provider may not exist yet, ignore
            }
        }
    }
}
