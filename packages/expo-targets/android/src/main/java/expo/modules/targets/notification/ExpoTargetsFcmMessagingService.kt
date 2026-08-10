package expo.modules.targets.notification

import android.content.ComponentName
import android.content.pm.PackageManager
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * FCM receive path for notification-service / notification-content.
 * Routes data (or notification) payloads into [ExpoTargetsNotificationRouter].
 *
 * Expects data keys: `title`, `body`, optional `expo_targets_kind` (`service`|`content`),
 * optional `expo_targets_category`. Falls back to this Service's manifest meta-data
 * (same keys as [ExpoTargetsNotificationService]).
 *
 * Requires the host app to ship Firebase Messaging (e.g. via `expo-notifications`
 * + `google-services.json`). compileOnly in the library; resolved from the app classpath.
 */
open class ExpoTargetsFcmMessagingService : FirebaseMessagingService() {
  override fun onMessageReceived(message: RemoteMessage) {
    val data = message.data
    val title =
      data["title"]
        ?: message.notification?.title
        ?: return
    val body = data["body"] ?: message.notification?.body ?: ""
    val meta = readMeta()
    val kind = data["expo_targets_kind"] ?: meta.kind
    val category = data["expo_targets_category"] ?: meta.category

    if (kind == "content") {
      ExpoTargetsNotificationRouter.presentRichContent(
        this,
        meta.appGroup,
        meta.channelId,
        meta.channelName,
        title,
        body,
        category,
      )
    } else {
      ExpoTargetsNotificationRouter.presentProcessed(
        this,
        meta.appGroup,
        meta.channelId,
        meta.channelName,
        title,
        body,
        meta.mutationMarker,
      )
    }
  }

  private data class NotifMeta(
    val appGroup: String,
    val channelId: String,
    val channelName: String,
    val kind: String,
    val category: String,
    val mutationMarker: String,
  )

  private fun readMeta(): NotifMeta {
    val defaults =
      NotifMeta(
        appGroup = "group.$packageName",
        channelId = "expo_targets_notification",
        channelName = "Notifications",
        kind = "service",
        category = "myNotificationCategory",
        mutationMarker = " [expo-targets]",
      )
    return try {
      val info =
        packageManager.getServiceInfo(
          ComponentName(this, javaClass),
          PackageManager.GET_META_DATA,
        )
      val meta = info.metaData ?: return defaults
      NotifMeta(
        appGroup = meta.getString("expo.targets.APP_GROUP") ?: defaults.appGroup,
        channelId = meta.getString("expo.targets.CHANNEL_ID") ?: defaults.channelId,
        channelName =
          meta.getString("expo.targets.CHANNEL_NAME") ?: defaults.channelName,
        kind = meta.getString("expo.targets.NOTIF_KIND") ?: defaults.kind,
        category = meta.getString("expo.targets.CATEGORY") ?: defaults.category,
        mutationMarker =
          meta.getString("expo.targets.MUTATION_MARKER") ?: defaults.mutationMarker,
      )
    } catch (_: Exception) {
      defaults
    }
  }
}
