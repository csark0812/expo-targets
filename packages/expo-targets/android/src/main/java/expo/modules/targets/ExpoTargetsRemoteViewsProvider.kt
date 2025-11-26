package expo.modules.targets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews

/**
 * Base provider for RemoteViews widgets.
 * Automatically reads from SharedPreferences and calls updateWidget().
 */
abstract class ExpoTargetsRemoteViewsProvider(
    private val prefsName: String
) : AppWidgetProvider() {

    companion object {
        private const val TAG = "RemoteViewsProvider"
    }

    /** Layout resource ID for the widget */
    abstract val layoutResId: Int

    override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
        ExpoTargetsLogger.init(context)
        ExpoTargetsLogger.d(TAG, "onUpdate called: prefsName=$prefsName, widgetIds=${appWidgetIds.toList()}")

        val prefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
        val data = prefs.all
        ExpoTargetsLogger.d(TAG, "SharedPreferences data: $data")

        for (widgetId in appWidgetIds) {
            val views = RemoteViews(context.packageName, layoutResId)
            updateWidget(context, views, data)
            manager.updateAppWidget(widgetId, views)
            ExpoTargetsLogger.d(TAG, "Updated widget id=$widgetId")
        }

        ExpoTargetsLogger.d(TAG, "Updated ${appWidgetIds.size} widget(s)")
    }

    override fun onReceive(context: Context, intent: Intent) {
        ExpoTargetsLogger.init(context)
        ExpoTargetsLogger.d(TAG, "onReceive: action=${intent.action}, component=${intent.component}, extras=${intent.extras?.keySet()?.toList()}")

        super.onReceive(context, intent)

        // Handle expo-targets refresh broadcasts
        if (intent.action == ExpoTargetsReceiver.WIDGET_EVENT_ACTION ||
            intent.action == "expo.modules.targets.UPDATE_WIDGET") {
            ExpoTargetsLogger.d(TAG, "Handling expo-targets refresh broadcast")
            val manager = AppWidgetManager.getInstance(context)
            val componentName = android.content.ComponentName(context, this::class.java)
            val ids = manager.getAppWidgetIds(componentName)
            ExpoTargetsLogger.d(TAG, "Widget IDs for ${this::class.java.name}: ${ids.toList()}")
            if (ids.isNotEmpty()) {
                onUpdate(context, manager, ids)
            } else {
                ExpoTargetsLogger.w(TAG, "No widget instances found for component: ${componentName.className}")
            }
        }
    }

    /**
     * Override to populate the RemoteViews with data.
     * @param context Application context
     * @param views RemoteViews to populate
     * @param data All key-value pairs from SharedPreferences
     */
    abstract fun updateWidget(context: Context, views: RemoteViews, data: Map<String, *>)
}

