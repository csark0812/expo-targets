package expo.modules.targets

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.glance.appwidget.GlanceAppWidget
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlin.reflect.KClass

/** Base receiver for widget updates. Syncs SharedPreferences → Glance state automatically. */
abstract class ExpoTargetsWidgetUpdateReceiver<T : GlanceAppWidget>(
    private val widgetClass: KClass<T>,
    private val prefsName: String
) : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        ExpoTargetsLogger.init(context)

        CoroutineScope(Dispatchers.IO).launch {
            try {
                ExpoTargetsWidgetSync.syncAndUpdate(context, widgetClass, prefsName)
            } catch (e: Exception) {
                ExpoTargetsLogger.e("UpdateReceiver", "Sync failed: ${widgetClass.simpleName}", e)
            }
        }
    }
}

