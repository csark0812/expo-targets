package expo.modules.targets.liveActivity

import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.targets.notification.ExpoTargetsNotificationRouter
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * Android Live Activity helper (Wave 2): same JS surface as iOS ActivityKit,
 * backed by ongoing NotificationCompat. No Dynamic Island / StandBy / push-to-start.
 */
class ExpoTargetsLiveActivityModule : Module() {
  private val activeIds = ConcurrentHashMap<String, String>()

  override fun definition() = ModuleDefinition {
    Name("ExpoTargetsLiveActivity")

    AsyncFunction("start") {
        attributesName: String,
        attributesJson: String,
        contentStateJson: String,
      ->
      val ctx =
        appContext.reactContext
          ?: throw Exception("React context unavailable")
      if (!areEnabled(ctx)) {
        throw Exception("Notifications disabled — cannot start Live Activity helper")
      }

      val activityId = UUID.randomUUID().toString()
      val title = titleFrom(attributesName, attributesJson, contentStateJson)
      val body = bodyFrom(contentStateJson)

      ExpoTargetsNotificationRouter.presentOngoing(
        ctx,
        activityId,
        title,
        body,
        contentStateJson,
      )
      activeIds[activityId] = attributesName
      persistIds(ctx)
      activityId
    }

    AsyncFunction("update") { activityId: String, contentStateJson: String ->
      val ctx =
        appContext.reactContext
          ?: throw Exception("React context unavailable")
      val attributesName = activeIds[activityId] ?: loadIds(ctx)[activityId]
      if (attributesName == null) return@AsyncFunction false

      val title = attributesName
      val body = bodyFrom(contentStateJson)
      ExpoTargetsNotificationRouter.presentOngoing(
        ctx,
        activityId,
        title,
        body,
        contentStateJson,
      )
      true
    }

    AsyncFunction("end") { activityId: String ->
      val ctx =
        appContext.reactContext
          ?: throw Exception("React context unavailable")
      ExpoTargetsNotificationRouter.cancelOngoing(ctx, activityId)
      activeIds.remove(activityId)
      persistIds(ctx)
    }

    AsyncFunction("endAll") {
      val ctx =
        appContext.reactContext
          ?: throw Exception("React context unavailable")
      val ids = (activeIds.keys + loadIds(ctx).keys).toSet()
      ExpoTargetsNotificationRouter.cancelAllLive(ctx, ids)
      activeIds.clear()
      persistIds(ctx)
    }

    AsyncFunction("areActivitiesEnabled") {
      val ctx =
        appContext.reactContext
          ?: throw Exception("React context unavailable")
      areEnabled(ctx)
    }
  }

  private fun areEnabled(ctx: Context): Boolean {
    if (Build.VERSION.SDK_INT >= 33) {
      val granted =
        ctx.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) ==
          PackageManager.PERMISSION_GRANTED
      if (!granted) return false
    }
    return ExpoTargetsNotificationRouter.notificationsEnabled(ctx)
  }

  private fun titleFrom(
    attributesName: String,
    attributesJson: String,
    contentStateJson: String,
  ): String {
    try {
      val attrs = JSONObject(attributesJson)
      val t = attrs.optString("title", "")
      if (t.isNotEmpty()) return t
    } catch (_: Exception) {
    }
    try {
      val state = JSONObject(contentStateJson)
      val t = state.optString("title", "")
      if (t.isNotEmpty()) return t
    } catch (_: Exception) {
    }
    return attributesName
  }

  private fun bodyFrom(contentStateJson: String): String {
    return try {
      val state = JSONObject(contentStateJson)
      state.optString("status", state.toString())
    } catch (_: Exception) {
      contentStateJson
    }
  }

  private fun prefs(ctx: Context) =
    ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun persistIds(ctx: Context) {
    prefs(ctx).edit().putString(KEY_IDS, activeIds.keys.joinToString(",")).commit()
  }

  private fun loadIds(ctx: Context): Map<String, String> {
    val raw = prefs(ctx).getString(KEY_IDS, "") ?: ""
    if (raw.isEmpty()) return emptyMap()
    return raw.split(',').filter { it.isNotEmpty() }.associateWith { "live" }
  }

  companion object {
    private const val PREFS = "expo_targets_live_activity"
    private const val KEY_IDS = "active_ids"
  }
}
