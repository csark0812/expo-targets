package expo.modules.targets.notification

import android.app.Service
import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.os.IBinder

/**
 * Host-process notification processor (Wave 2).
 * Receives `expo.targets.action.PROCESS_NOTIFICATION` with title/body extras,
 * mutates like iOS NSE, posts NotificationCompat, writes SharedPreferences marker.
 *
 * Not a system NSE — only notifications you route here (local path REQUIRED;
 * FCM via [ExpoTargetsFcmMessagingService] when Firebase Messaging is on the
 * classpath; operator matrix needs FCM_* + google-services).
 */
open class ExpoTargetsNotificationService : Service() {
  protected var targetName: String = "Notification"
  protected var appGroup: String = ""
  protected var channelId: String = "expo_targets_notification"
  protected var channelName: String = "Notifications"
  protected var kind: String = "service"
  protected var category: String = "myNotificationCategory"
  protected var mutationMarker: String = " [expo-targets]"

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    readMeta()
    if (intent?.action == ACTION_PROCESS) {
      handleProcess(intent)
    }
    stopSelf(startId)
    return START_NOT_STICKY
  }

  private fun readMeta() {
    try {
      val cn = ComponentName(this, javaClass)
      val info =
        packageManager.getServiceInfo(
          cn,
          PackageManager.GET_META_DATA,
        )
      val meta = info.metaData
      targetName = meta?.getString("expo.targets.TARGET_NAME") ?: targetName
      appGroup =
        meta?.getString("expo.targets.APP_GROUP") ?: "group.$packageName"
      channelId = meta?.getString("expo.targets.CHANNEL_ID") ?: channelId
      channelName = meta?.getString("expo.targets.CHANNEL_NAME") ?: channelName
      kind = meta?.getString("expo.targets.NOTIF_KIND") ?: kind
      category = meta?.getString("expo.targets.CATEGORY") ?: category
      mutationMarker =
        meta?.getString("expo.targets.MUTATION_MARKER") ?: mutationMarker
    } catch (_: Exception) {
      appGroup = "group.$packageName"
    }
  }

  private fun handleProcess(intent: Intent) {
    val title = intent.getStringExtra(EXTRA_TITLE) ?: "Notification"
    val body = intent.getStringExtra(EXTRA_BODY) ?: ""

    if (kind == "content") {
      ExpoTargetsNotificationRouter.presentRichContent(
        this,
        appGroup,
        channelId,
        channelName,
        title,
        body,
        category,
      )
    } else {
      ExpoTargetsNotificationRouter.presentProcessed(
        this,
        appGroup,
        channelId,
        channelName,
        title,
        body,
        mutationMarker,
      )
    }
  }

  companion object {
    const val ACTION_PROCESS = "expo.targets.action.PROCESS_NOTIFICATION"
    const val EXTRA_TITLE = "expo.targets.TITLE"
    const val EXTRA_BODY = "expo.targets.BODY"
  }
}
