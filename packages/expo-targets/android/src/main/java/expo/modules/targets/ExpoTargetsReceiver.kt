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
        if (widgetName == null) return
        
        // Trigger AppWidgetManager update for all instances of this widget
        val appWidgetManager = AppWidgetManager.getInstance(context)
        
        // Find all widget provider classes and update matching ones
        // This will be called by specific widget implementations
        val packageName = context.packageName
        try {
            // Attempt to find and trigger widget provider update
            val componentName = ComponentName(context, "$packageName.widget.$widgetName")
            val appWidgetIds = appWidgetManager.getAppWidgetIds(componentName)
            
            if (appWidgetIds.isNotEmpty()) {
                val updateIntent = Intent(context, Class.forName("$packageName.widget.$widgetName")).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, appWidgetIds)
                }
                context.sendBroadcast(updateIntent)
            }
        } catch (e: Exception) {
            // Widget class not found or not yet generated - this is normal during initial setup
        }
    }
}
