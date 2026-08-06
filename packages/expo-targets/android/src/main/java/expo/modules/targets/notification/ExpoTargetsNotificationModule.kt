package expo.modules.targets.notification

import android.content.pm.PackageManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject

/**
 * JS bridge for the Android local notification path (Wave 2).
 * Posts via [ExpoTargetsNotificationRouter] using target config from assets.
 */
class ExpoTargetsNotificationModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoTargetsNotification")

    AsyncFunction("processAndPresent") {
        title: String,
        body: String,
        targetName: String?,
      ->
      val ctx =
        appContext.reactContext
          ?: throw Exception("React context unavailable")
      val cfg =
        findTarget(targetName, "notification-service")
          ?: throw Exception(
            "No notification-service target in expo_targets_config.json. " +
              "Add platforms:[\"android\"] to a notification-service target.",
          )
      ExpoTargetsNotificationRouter.presentProcessed(
        ctx,
        cfg.appGroup,
        cfg.channelId,
        cfg.channelName,
        title,
        body,
        cfg.mutationMarker,
      )
    }

    AsyncFunction("presentContent") {
        title: String,
        body: String,
        targetName: String?,
      ->
      val ctx =
        appContext.reactContext
          ?: throw Exception("React context unavailable")
      val cfg =
        findTarget(targetName, "notification-content")
          ?: throw Exception(
            "No notification-content target in expo_targets_config.json. " +
              "Add platforms:[\"android\"] to a notification-content target.",
          )
      ExpoTargetsNotificationRouter.presentRichContent(
        ctx,
        cfg.appGroup,
        cfg.channelId,
        cfg.channelName,
        title,
        body,
        cfg.category,
      )
      true
    }

    AsyncFunction("getLastProcessedTitle") { suite: String ->
      val ctx =
        appContext.reactContext
          ?: throw Exception("React context unavailable")
      ExpoTargetsNotificationRouter.readLastTitle(ctx, suite)
    }

    AsyncFunction("areNotificationsEnabled") {
      val ctx =
        appContext.reactContext
          ?: throw Exception("React context unavailable")
      if (Build.VERSION.SDK_INT >= 33) {
        val granted =
          ctx.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) ==
            PackageManager.PERMISSION_GRANTED
        granted && ExpoTargetsNotificationRouter.notificationsEnabled(ctx)
      } else {
        ExpoTargetsNotificationRouter.notificationsEnabled(ctx)
      }
    }
  }

  private data class NotifTargetConfig(
    val appGroup: String,
    val channelId: String,
    val channelName: String,
    val category: String,
    val mutationMarker: String,
  )

  private fun findTarget(targetName: String?, type: String): NotifTargetConfig? {
    val ctx = appContext.reactContext ?: return null
    return try {
      val json =
        ctx.assets.open("expo_targets_config.json").bufferedReader().use { it.readText() }
      val arr = JSONArray(json)
      for (i in 0 until arr.length()) {
        val obj = arr.getJSONObject(i)
        if (obj.optString("type") != type) continue
        if (targetName != null && obj.optString("name") != targetName) continue
        val name = obj.optString("name", "Notification")
        val android = obj.optJSONObject("android") ?: JSONObject()
        val packageName = ctx.packageName
        return NotifTargetConfig(
          appGroup =
            obj.optString("appGroup").ifEmpty { "group.$packageName" },
          channelId =
            android.optString("channelId").ifEmpty {
              "expo_targets_${name.lowercase().replace(Regex("[^a-z0-9]"), "")}"
            },
          channelName =
            android.optString("channelName").ifEmpty {
              obj.optString("displayName", name)
            },
          category =
            android.optString("category").ifEmpty { "myNotificationCategory" },
          mutationMarker =
            android.optString("mutationMarker").ifEmpty { " [expo-targets]" },
        )
      }
      null
    } catch (_: Exception) {
      null
    }
  }
}
