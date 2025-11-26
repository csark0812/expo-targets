package expo.modules.targets.storage

import android.content.Context
import android.content.SharedPreferences
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.targets.ExpoTargetsLogger
import expo.modules.targets.ExpoTargetsReceiver

class ExpoTargetsStorageModule : Module() {
  companion object {
    private const val TAG = "Storage"
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoTargetsStorage")

    OnCreate {
      appContext.reactContext?.let { ExpoTargetsLogger.init(it) }
    }

    Function("setInt") { key: String, value: Int, suite: String? ->
      ExpoTargetsLogger.d(TAG, "setInt: key=$key, value=$value, suite=$suite")
      val prefs = getSharedPreferences(suite)
      prefs.edit().putInt(key, value).commit().also { success ->
        ExpoTargetsLogger.d(TAG, "setInt committed: $success")
      }
    }

    Function("setString") { key: String, value: String, suite: String? ->
      ExpoTargetsLogger.d(TAG, "setString: key=$key, value=$value, suite=$suite")
      val prefs = getSharedPreferences(suite)
      prefs.edit().putString(key, value).commit().also { success ->
        ExpoTargetsLogger.d(TAG, "setString committed: $success")
      }
    }

    Function("setObject") { key: String, value: Map<String, Any?>, suite: String? ->
      ExpoTargetsLogger.d(TAG, "setObject: key=$key, value=$value, suite=$suite")
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
      val success = prefs.edit().putString(key, jsonString).commit()
      ExpoTargetsLogger.d(TAG, "setObject committed: $success, json=$jsonString")
      return@Function success
    }

    Function("get") { key: String, suite: String? ->
      val prefs = getSharedPreferences(suite)
      val value = prefs.getString(key, null)
      ExpoTargetsLogger.d(TAG, "get: key=$key, suite=$suite, value=$value")
      return@Function value
    }

    Function("remove") { key: String, suite: String? ->
      ExpoTargetsLogger.d(TAG, "remove: key=$key, suite=$suite")
      val prefs = getSharedPreferences(suite)
      prefs.edit().remove(key).commit()
    }

    Function("getAllKeys") { suite: String? ->
      val prefs = getSharedPreferences(suite)
      val keys = prefs.all.keys.toList()
      ExpoTargetsLogger.d(TAG, "getAllKeys: suite=$suite, keys=$keys")
      return@Function keys
    }

    Function("getAllData") { suite: String? ->
      val prefs = getSharedPreferences(suite)
      val data = prefs.all
      ExpoTargetsLogger.d(TAG, "getAllData: suite=$suite, data=$data")
      return@Function data
    }

    Function("clearAll") { suite: String? ->
      ExpoTargetsLogger.d(TAG, "clearAll: suite=$suite")
      val prefs = getSharedPreferences(suite)
      prefs.edit().clear().commit()
    }

    Function("refreshTarget") { name: String? ->
      ExpoTargetsLogger.d(TAG, "refreshTarget called: name=$name")
      val context = appContext.reactContext
      if (context == null) {
        ExpoTargetsLogger.w(TAG, "refreshTarget: React context is null, cannot refresh")
        return@Function
      }
      if (name != null) {
        ExpoTargetsLogger.d(TAG, "refreshTarget: Calling ExpoTargetsReceiver.refreshWidget for '$name'")
        ExpoTargetsReceiver.refreshWidget(context, name)
      } else {
        ExpoTargetsLogger.w(TAG, "refreshTarget: name is null, skipping refresh")
      }
    }

    Function("getTargetsConfig") {
      // Android: Read targets configuration
      // Will read from app resources or manifest metadata
      ExpoTargetsLogger.d(TAG, "getTargetsConfig called")
      return@Function null
    }
  }

  private fun getSharedPreferences(suite: String?): SharedPreferences {
    val context = appContext.reactContext ?: throw IllegalStateException("React context is null")
    val prefsName = suite ?: "${context.packageName}_preferences"
    ExpoTargetsLogger.d(TAG, "getSharedPreferences: prefsName=$prefsName")
    return context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
  }
}

