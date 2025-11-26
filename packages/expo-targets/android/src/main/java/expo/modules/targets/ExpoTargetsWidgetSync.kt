package expo.modules.targets

import android.content.Context
import androidx.datastore.preferences.core.MutablePreferences
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.booleanPreferencesKey
import androidx.datastore.preferences.core.floatPreferencesKey
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.longPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.core.stringSetPreferencesKey
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetManager
import androidx.glance.appwidget.state.updateAppWidgetState
import androidx.glance.state.GlanceStateDefinition
import kotlin.reflect.KClass

/** Syncs SharedPreferences to Glance state, mirroring iOS WidgetKit behavior. */
object ExpoTargetsWidgetSync {
    private const val TAG = "WidgetSync"

    suspend fun <T : GlanceAppWidget> syncAndUpdate(
        context: Context,
        widgetClass: KClass<T>,
        prefsName: String
    ) {
        ExpoTargetsLogger.init(context)

        val sharedPrefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
        val allData = sharedPrefs.all

        val manager = GlanceAppWidgetManager(context)
        val glanceIds = manager.getGlanceIds(widgetClass.java)

        if (glanceIds.isEmpty()) return

        val widget = widgetClass.java.getDeclaredConstructor().newInstance()

        for (glanceId in glanceIds) {
            @Suppress("UNCHECKED_CAST")
            val stateDefinition = widget.stateDefinition as GlanceStateDefinition<Preferences>
            syncToGlanceState(context, stateDefinition, glanceId, allData)
            widget.update(context, glanceId)
        }

        ExpoTargetsLogger.d(TAG, "Synced ${allData.size} keys → ${glanceIds.size} widget(s)")
    }

    private suspend fun syncToGlanceState(
        context: Context,
        stateDefinition: GlanceStateDefinition<Preferences>,
        glanceId: GlanceId,
        data: Map<String, *>
    ) {
        updateAppWidgetState(context, stateDefinition, glanceId) { prefs: Preferences ->
            prefs.toMutablePreferences().also { mutablePrefs: MutablePreferences ->
                mutablePrefs.clear()

                data.forEach { (key, value) ->
                    when (value) {
                        is Int -> mutablePrefs[intPreferencesKey(key)] = value
                        is Long -> mutablePrefs[longPreferencesKey(key)] = value
                        is Float -> mutablePrefs[floatPreferencesKey(key)] = value
                        is Boolean -> mutablePrefs[booleanPreferencesKey(key)] = value
                        is String -> mutablePrefs[stringPreferencesKey(key)] = value
                        is Set<*> -> {
                            @Suppress("UNCHECKED_CAST")
                            mutablePrefs[stringSetPreferencesKey(key)] = value as Set<String>
                        }
                        else -> mutablePrefs[stringPreferencesKey(key)] = value.toString()
                    }
                }
            }
        }
    }
}

