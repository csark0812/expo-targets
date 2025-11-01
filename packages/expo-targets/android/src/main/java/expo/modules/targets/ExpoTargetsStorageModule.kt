package expo.modules.targets

import android.content.Context
import android.content.SharedPreferences
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoTargetsStorageModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoTargetsStorage")
        
        AsyncFunction("set") { widgetName: String, key: String, value: String ->
            try {
                getPreferences(widgetName).edit().putString(key, value).apply()
                return@AsyncFunction true
            } catch (e: Exception) {
                throw Exception("Failed to set widget data: ${e.message}")
            }
        }
        
        AsyncFunction("get") { widgetName: String, key: String ->
            return@AsyncFunction getPreferences(widgetName).getString(key, null)
        }
        
        AsyncFunction("remove") { widgetName: String, key: String ->
            try {
                getPreferences(widgetName).edit().remove(key).apply()
                return@AsyncFunction true
            } catch (e: Exception) {
                throw Exception("Failed to remove widget data: ${e.message}")
            }
        }
    }
    
    private fun getPreferences(widgetName: String): SharedPreferences {
        return appContext.reactContext?.getSharedPreferences(
            "expo_targets_$widgetName",
            Context.MODE_PRIVATE
        ) ?: throw Exception("Context not available")
    }
}
