package expo.modules.targets

import android.content.Context
import android.content.SharedPreferences
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONObject

class ExpoTargetsStorageModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoTargetsStorage")
        
        // iOS-compatible function signature: key, value, suite (widgetName)
        AsyncFunction("setInt") { key: String, value: Int, widgetName: String? ->
            getPreferences(widgetName ?: "default").edit().putInt(key, value).apply()
        }
        
        AsyncFunction("setString") { key: String, value: String, widgetName: String? ->
            getPreferences(widgetName ?: "default").edit().putString(key, value).apply()
        }
        
        AsyncFunction("setObject") { key: String, value: Map<String, Any>, widgetName: String? ->
            val jsonObject = JSONObject()
            value.forEach { (k, v) ->
                when (v) {
                    is String -> jsonObject.put(k, v)
                    is Number -> jsonObject.put(k, v)
                    is Boolean -> jsonObject.put(k, v)
                    else -> jsonObject.put(k, v.toString())
                }
            }
            val jsonString = jsonObject.toString()
            getPreferences(widgetName ?: "default").edit().putString(key, jsonString).apply()
            return@AsyncFunction true
        }
        
        AsyncFunction("get") { key: String, widgetName: String? ->
            return@AsyncFunction getPreferences(widgetName ?: "default").getString(key, null)
        }
        
        AsyncFunction("remove") { key: String, widgetName: String? ->
            getPreferences(widgetName ?: "default").edit().remove(key).apply()
        }
        
        AsyncFunction("getAllKeys") { widgetName: String? ->
            return@AsyncFunction getPreferences(widgetName ?: "default").all.keys.toList()
        }
        
        AsyncFunction("getAllData") { widgetName: String? ->
            val prefs = getPreferences(widgetName ?: "default")
            val result = mutableMapOf<String, Any>()
            prefs.all.forEach { (key, value) ->
                result[key] = value ?: ""
            }
            return@AsyncFunction result
        }
        
        AsyncFunction("clearAll") { widgetName: String? ->
            getPreferences(widgetName ?: "default").edit().clear().apply()
        }
        
        AsyncFunction("refreshTarget") { targetName: String? ->
            if (targetName != null) {
                ExpoTargetsReceiver.refreshWidget(appContext.reactContext!!, targetName)
            }
        }
        
        AsyncFunction("getTargetsConfig") {
            // Android doesn't have Info.plist equivalent, return null
            return@AsyncFunction null
        }
    }
    
    private fun getPreferences(widgetName: String): SharedPreferences {
        return appContext.reactContext?.getSharedPreferences(
            "expo_targets_$widgetName",
            Context.MODE_PRIVATE
        ) ?: throw Exception("Context not available")
    }
}
