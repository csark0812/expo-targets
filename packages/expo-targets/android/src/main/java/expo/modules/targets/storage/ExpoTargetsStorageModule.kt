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
    const val TARGETS_CONFIG_ASSET = "expo_targets_config.json"
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoTargetsStorage")

    OnCreate {
      appContext.reactContext?.let { ExpoTargetsLogger.init(it) }
    }

    Function("setInt") { key: String, value: Int, suite: String?, targetName: String? ->
      val resolved = resolveKey(key, targetName)
      ExpoTargetsLogger.d(TAG, "setInt: key=$resolved, value=$value, suite=$suite")
      val prefs = getSharedPreferences(suite)
      prefs.edit().putInt(resolved, value).commit().also { success ->
        ExpoTargetsLogger.d(TAG, "setInt committed: $success")
      }
    }

    Function("setString") { key: String, value: String, suite: String?, targetName: String? ->
      val resolved = resolveKey(key, targetName)
      ExpoTargetsLogger.d(TAG, "setString: key=$resolved, value=$value, suite=$suite")
      val prefs = getSharedPreferences(suite)
      prefs.edit().putString(resolved, value).commit().also { success ->
        ExpoTargetsLogger.d(TAG, "setString committed: $success")
      }
    }

    Function("setObject") { key: String, value: Map<String, Any?>, suite: String?, targetName: String? ->
      val resolved = resolveKey(key, targetName)
      ExpoTargetsLogger.d(TAG, "setObject: key=$resolved, value=$value, suite=$suite")
      val prefs = getSharedPreferences(suite)
      // Convert map to JSON string for storage
      val jsonString =
        value.entries.joinToString(",", "{", "}") { (k, v) ->
          "\"$k\":${
            when (v) {
              is String -> "\"$v\""
              is Number -> v.toString()
              is Boolean -> v.toString()
              null -> "null"
              else -> "\"$v\""
            }
          }"
        }
      val success = prefs.edit().putString(resolved, jsonString).commit()
      ExpoTargetsLogger.d(TAG, "setObject committed: $success, json=$jsonString")
      success
    }

    Function("get") { key: String, suite: String?, targetName: String? ->
      val resolved = resolveKey(key, targetName)
      val prefs = getSharedPreferences(suite)
      val value = prefs.getString(resolved, null)
      ExpoTargetsLogger.d(TAG, "get: key=$resolved, suite=$suite, value=$value")
      value
    }

    Function("remove") { key: String, suite: String?, targetName: String? ->
      val resolved = resolveKey(key, targetName)
      ExpoTargetsLogger.d(TAG, "remove: key=$resolved, suite=$suite")
      val prefs = getSharedPreferences(suite)
      prefs.edit().remove(resolved).commit()
    }

    Function("getAllKeys") { suite: String?, targetName: String? ->
      val prefs = getSharedPreferences(suite)
      val keys =
        if (targetName.isNullOrEmpty()) {
          prefs.all.keys.toList()
        } else {
          val prefix = "$targetName:"
          prefs.all.keys
            .filter { it.startsWith(prefix) }
            .map { it.removePrefix(prefix) }
        }
      ExpoTargetsLogger.d(TAG, "getAllKeys: suite=$suite, keys=$keys")
      keys
    }

    Function("getAllData") { suite: String?, targetName: String? ->
      val prefs = getSharedPreferences(suite)
      val all = prefs.all
      val data: Map<String, Any?> =
        if (targetName.isNullOrEmpty()) {
          all
        } else {
          val prefix = "$targetName:"
          all
            .filterKeys { it.startsWith(prefix) }
            .mapKeys { it.key.removePrefix(prefix) }
        }
      ExpoTargetsLogger.d(TAG, "getAllData: suite=$suite, data=$data")
      data
    }

    Function("clearAll") { suite: String?, targetName: String? ->
      ExpoTargetsLogger.d(TAG, "clearAll: suite=$suite, targetName=$targetName")
      val prefs = getSharedPreferences(suite)
      if (targetName.isNullOrEmpty()) {
        prefs.edit().clear().commit()
      } else {
        val prefix = "$targetName:"
        val editor = prefs.edit()
        prefs.all.keys.filter { it.startsWith(prefix) }.forEach { editor.remove(it) }
        editor.commit()
      }
    }

    Function("refreshTarget") { name: String? ->
      ExpoTargetsLogger.d(TAG, "refreshTarget called: name=$name")
      val context = appContext.reactContext
      if (context == null) {
        ExpoTargetsLogger.w(TAG, "refreshTarget: React context is null, cannot refresh")
      } else if (name != null) {
        ExpoTargetsLogger.d(TAG, "refreshTarget: Calling ExpoTargetsReceiver.refreshWidget for '$name'")
        ExpoTargetsReceiver.refreshWidget(context, name)
      } else {
        ExpoTargetsLogger.w(TAG, "refreshTarget: name is null, skipping refresh")
      }
    }

    Function("getTargetsConfig") {
      ExpoTargetsLogger.d(TAG, "getTargetsConfig called")
      val context = appContext.reactContext
      if (context == null) {
        ExpoTargetsLogger.w(TAG, "getTargetsConfig: React context is null")
        null
      } else {
        readTargetsConfigAsset(context)
      }
    }
  }

  private fun resolveKey(key: String, targetName: String?): String {
    if (targetName.isNullOrEmpty()) return key
    return "$targetName:$key"
  }

  private fun getSharedPreferences(suite: String?): SharedPreferences {
    val context = appContext.reactContext ?: throw IllegalStateException("React context is null")
    val prefsName = suite ?: "${context.packageName}_preferences"
    ExpoTargetsLogger.d(TAG, "getSharedPreferences: prefsName=$prefsName")
    return context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
  }

  /**
   * Reads `assets/expo_targets_config.json` written by the config plugin
   * ([withAndroidTargetsConfig]).
   */
  private fun readTargetsConfigAsset(context: Context): Any? {
    return try {
      context.assets.open(TARGETS_CONFIG_ASSET).bufferedReader().use { reader ->
        val json = reader.readText()
        if (json.isBlank()) {
          null
        } else {
          parseJsonValue(org.json.JSONTokener(json).nextValue())
        }
      }
    } catch (e: java.io.FileNotFoundException) {
      ExpoTargetsLogger.d(TAG, "getTargetsConfig: asset missing (${e.message})")
      null
    } catch (e: Exception) {
      ExpoTargetsLogger.w(TAG, "getTargetsConfig: failed to read asset: ${e.message}")
      null
    }
  }

  private fun parseJsonValue(value: Any?): Any? {
    return when (value) {
      is org.json.JSONObject -> {
        val map = HashMap<String, Any?>()
        val keys = value.keys()
        while (keys.hasNext()) {
          val key = keys.next()
          map[key] = parseJsonValue(value.get(key))
        }
        map
      }
      is org.json.JSONArray -> {
        val list = ArrayList<Any?>(value.length())
        for (i in 0 until value.length()) {
          list.add(parseJsonValue(value.get(i)))
        }
        list
      }
      org.json.JSONObject.NULL -> null
      else -> value
    }
  }
}
