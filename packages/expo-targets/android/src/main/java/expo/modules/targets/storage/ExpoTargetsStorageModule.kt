package expo.modules.targets.storage

import android.content.Context
import android.content.SharedPreferences
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.targets.ExpoTargetsReceiver

class ExpoTargetsStorageModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoTargetsStorage")

    Function("setInt") { key: String, value: Int, suite: String? ->
      val prefs = getSharedPreferences(suite)
      prefs.edit().putInt(key, value).apply()
    }

    Function("setString") { key: String, value: String, suite: String? ->
      val prefs = getSharedPreferences(suite)
      prefs.edit().putString(key, value).apply()
    }

    Function("setObject") { key: String, value: Map<String, Any?>, suite: String? ->
      val prefs = getSharedPreferences(suite)
      // Convert map to JSON string for storage
      val jsonString = value.entries.joinToString(",", "{", "}") { (k, v) ->
        "\"$k\":${when (v) {
          is String -> "\"$v\""
          is Number -> v.toString()
          is Boolean -> v.toString()
          null -> "null"
          else -> "\"$v\""
        }}"
      }
      prefs.edit().putString(key, jsonString).apply()
      return@Function true
    }

    Function("get") { key: String, suite: String? ->
      val prefs = getSharedPreferences(suite)
      return@Function prefs.getString(key, null)
    }

    Function("remove") { key: String, suite: String? ->
      val prefs = getSharedPreferences(suite)
      prefs.edit().remove(key).apply()
    }

    Function("getAllKeys") { suite: String? ->
      val prefs = getSharedPreferences(suite)
      return@Function prefs.all.keys.toList()
    }

    Function("getAllData") { suite: String? ->
      val prefs = getSharedPreferences(suite)
      return@Function prefs.all
    }

    Function("clearAll") { suite: String? ->
      val prefs = getSharedPreferences(suite)
      prefs.edit().clear().apply()
    }

    Function("refreshTarget") { name: String? ->
      val context = appContext.reactContext ?: return@Function
      if (name != null) {
        ExpoTargetsReceiver.refreshWidget(context, name)
      }
    }

    Function("getTargetsConfig") {
      // Android: Read targets configuration
      // Will read from app resources or manifest metadata
      return@Function null
    }
  }

  private fun getSharedPreferences(suite: String?): SharedPreferences {
    val context = appContext.reactContext ?: throw IllegalStateException("React context is null")
    val prefsName = suite ?: "${context.packageName}_preferences"
    return context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
  }
}

