package expo.modules.targets

import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.content.SharedPreferences

abstract class ExpoTargetsWidgetProvider : AppWidgetProvider() {
    
    abstract fun getWidgetName(): String
    
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        super.onUpdate(context, appWidgetManager, appWidgetIds)
        
        for (appWidgetId in appWidgetIds) {
            renderWidget(context, appWidgetManager, appWidgetId)
        }
    }
    
    override fun onDeleted(context: Context, appWidgetIds: IntArray) {
        super.onDeleted(context, appWidgetIds)
        
        for (appWidgetId in appWidgetIds) {
            getWidgetPreferences(context).edit().clear().apply()
        }
    }
    
    protected fun getWidgetPreferences(context: Context): SharedPreferences {
        return context.getSharedPreferences(
            "expo_targets_${getWidgetName()}",
            Context.MODE_PRIVATE
        )
    }
    
    protected open fun renderWidget(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetId: Int
    ) {
        // Override in user's widget implementation
    }
}
