package expo.modules.targets.storage

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import android.content.SharedPreferences
import android.net.VpnService
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.targets.ExpoTargetsLogger
import expo.modules.targets.ExpoTargetsReceiver
import java.lang.ref.WeakReference

class ExpoTargetsStorageModule : Module() {
  companion object {
    private const val TAG = "Storage"
    const val TARGETS_CONFIG_ASSET = "expo_targets_config.json"

    @Volatile
    private var moduleRef: WeakReference<ExpoTargetsStorageModule>? = null

    /** Emit from widget process / BroadcastReceiver when host JS is alive. */
    fun emitUserInteraction(source: String, target: String) {
      val module = moduleRef?.get() ?: run {
        ExpoTargetsLogger.d(TAG, "emitUserInteraction: no module (host not ready)")
        return
      }
      try {
        module.sendEvent(
          "onUserInteraction",
          mapOf(
            "source" to source,
            "target" to target,
            "timestamp" to System.currentTimeMillis().toDouble(),
            "type" to "ExpoWidgetsUserInteraction",
          ),
        )
      } catch (e: Exception) {
        ExpoTargetsLogger.w(TAG, "emitUserInteraction failed: ${e.message}")
      }
    }
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoTargetsStorage")

    Events("onUserInteraction")

    OnCreate {
      appContext.reactContext?.let { ExpoTargetsLogger.init(it) }
      moduleRef = WeakReference(this@ExpoTargetsStorageModule)
    }

    OnDestroy {
      if (moduleRef?.get() === this@ExpoTargetsStorageModule) {
        moduleRef = null
      }
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

    /**
     * Host helper for network-packet-tunnel Devicewright Locked P.
     * Starts the system VpnService.prepare consent UI when needed.
     * @return "consent-shown" | "already-consented" | "unavailable"
     */
    Function("prepareVpn") {
      val activity = appContext.currentActivity
      if (activity == null) {
        ExpoTargetsLogger.w(TAG, "prepareVpn: no foreground Activity")
        return@Function "unavailable"
      }
      val prepareIntent = VpnService.prepare(activity)
      if (prepareIntent != null) {
        activity.startActivity(prepareIntent)
        ExpoTargetsLogger.d(TAG, "prepareVpn: consent intent started")
        "consent-shown"
      } else {
        ExpoTargetsLogger.d(TAG, "prepareVpn: already consented")
        "already-consented"
      }
    }

    /**
     * Host helper for Devicewright Android widget journeys.
     * Shows the system "Add to Home screen?" pin sheet for a widget target.
     * @return "requested" | "already-hosted" | "unsupported" | "unknown-target" | "no-activity" | "failed"
     */
    Function("requestPinWidget") { targetName: String ->
      val activity = appContext.currentActivity
      if (activity == null) {
        ExpoTargetsLogger.w(TAG, "requestPinWidget: no foreground Activity")
        return@Function "no-activity"
      }
      val awm = AppWidgetManager.getInstance(activity)
      if (!awm.isRequestPinAppWidgetSupported) {
        ExpoTargetsLogger.w(TAG, "requestPinWidget: launcher does not support pin")
        return@Function "unsupported"
      }
      val provider = resolveWidgetProvider(activity, targetName)
      if (provider == null) {
        ExpoTargetsLogger.w(TAG, "requestPinWidget: no provider for '$targetName'")
        return@Function "unknown-target"
      }
      val hosted = awm.getAppWidgetIds(provider)
      if (hosted.isNotEmpty()) {
        // Still request a pin: dumpsys "hosted" can be a zombie (not on the
        // current launcher workspace). Skipping the sheet leaves journeys red
        // when AX cannot see the seeded Glance tile.
        ExpoTargetsLogger.d(
          TAG,
          "requestPinWidget: already hosted count=${hosted.size} provider=$provider; requesting another pin",
        )
      }
      val ok = awm.requestPinAppWidget(provider, null, null)
      ExpoTargetsLogger.d(TAG, "requestPinWidget: requested=$ok provider=$provider")
      if (ok) "requested" else "failed"
    }

    /** Count of live App Widget instances for a target's Glance receiver. */
    Function("getHostedWidgetCount") { targetName: String ->
      val context = appContext.reactContext
      if (context == null) {
        ExpoTargetsLogger.w(TAG, "getHostedWidgetCount: React context is null")
        return@Function 0
      }
      val provider = resolveWidgetProvider(context, targetName) ?: return@Function 0
      AppWidgetManager.getInstance(context).getAppWidgetIds(provider).size
    }
  }

  /**
   * Resolve AppWidget ComponentName for a target name.
   * Matches withAndroidWidget FQCNs:
   * - Glance: `{package}.widget.{sanitized}.{Pascal}WidgetReceiver`
   * - RemoteViews: `{package}.widget.{sanitized}.{Pascal}Provider`
   */
  private fun resolveWidgetProvider(context: Context, targetName: String): ComponentName? {
    val pkg = context.packageName
    val segment = targetName.lowercase().replace(Regex("[^a-z0-9_]"), "_")
    val segmentAlt = targetName.replace(Regex("[^a-zA-Z0-9]"), "").lowercase()
    val pascal =
      targetName.replaceFirstChar { it.uppercaseChar() }.replace(Regex("[-_]([a-z])")) {
        it.groupValues[1].uppercase()
      }
    val candidates =
      linkedSetOf(
        "$pkg.widget.$segment.${pascal}WidgetReceiver",
        "$pkg.widget.$segmentAlt.${pascal}WidgetReceiver",
        "$pkg.widget.$segment.${pascal}Provider",
        "$pkg.widget.$segmentAlt.${pascal}Provider",
      )

    val awm = AppWidgetManager.getInstance(context)
    for (info in awm.installedProviders) {
      if (info.provider.packageName != pkg) continue
      val className = info.provider.className
      if (candidates.contains(className)) return info.provider
      val lower = className.lowercase()
      if (
        lower.contains(".$segment.") ||
          lower.contains(".$segmentAlt.") ||
          lower.endsWith("${pascal.lowercase()}widgetreceiver") ||
          lower.endsWith("${pascal.lowercase()}provider")
      ) {
        return info.provider
      }
    }

    // Fall back to constructed Glance FQCN even if not yet in installedProviders.
    val constructed = candidates.firstOrNull() ?: return null
    return ComponentName(pkg, constructed)
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
