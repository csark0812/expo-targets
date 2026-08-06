package expo.modules.targets.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.widget.RemoteViews
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import expo.modules.targets.R
import org.json.JSONObject

/**
 * Shared NotificationCompat posting for notification-service, notification-content,
 * and LiveActivity ongoing-notification helper (Wave 2).
 */
object ExpoTargetsNotificationRouter {
  const val LAST_TITLE_KEY = "nse-last-title"
  const val LIVE_CHANNEL_ID = "expo_targets_live_activity"
  const val LIVE_CHANNEL_NAME = "Live Activities"

  fun ensureChannel(
    context: Context,
    channelId: String,
    channelName: String,
    importance: Int = NotificationManager.IMPORTANCE_DEFAULT,
  ) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val mgr = context.getSystemService(NotificationManager::class.java) ?: return
    if (mgr.getNotificationChannel(channelId) != null) return
    mgr.createNotificationChannel(
      NotificationChannel(channelId, channelName, importance),
    )
  }

  fun persistLastTitle(context: Context, appGroup: String, title: String) {
    context
      .getSharedPreferences(appGroup, Context.MODE_PRIVATE)
      .edit()
      .putString(LAST_TITLE_KEY, title)
      .commit()
  }

  fun readLastTitle(context: Context, appGroup: String): String? {
    return context
      .getSharedPreferences(appGroup, Context.MODE_PRIVATE)
      .getString(LAST_TITLE_KEY, null)
  }

  fun processTitle(title: String, mutationMarker: String): String {
    return if (title.contains(mutationMarker.trim())) title else "$title$mutationMarker"
  }

  /**
   * Local NSE equivalent: mutate title, persist marker, post NotificationCompat.
   */
  fun presentProcessed(
    context: Context,
    appGroup: String,
    channelId: String,
    channelName: String,
    title: String,
    body: String,
    mutationMarker: String,
    notificationId: Int = title.hashCode(),
  ): String {
    ensureChannel(context, channelId, channelName)
    val mutated = processTitle(title, mutationMarker)
    persistLastTitle(context, appGroup, mutated)

    val builder =
      NotificationCompat.Builder(context, channelId)
        .setSmallIcon(android.R.drawable.ic_dialog_info)
        .setContentTitle(mutated)
        .setContentText(body)
        .setContentIntent(hostPendingIntent(context))
        .setAutoCancel(true)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)

    NotificationManagerCompat.from(context).notify(notificationId, builder.build())
    return mutated
  }

  /**
   * notification-content approximation: DecoratedCustomViewStyle + RemoteViews.
   * Android 12+ clamps custom chrome — documented partial.
   */
  fun presentRichContent(
    context: Context,
    appGroup: String,
    channelId: String,
    channelName: String,
    title: String,
    body: String,
    category: String,
    notificationId: Int = (title + category).hashCode(),
  ) {
    ensureChannel(context, channelId, channelName)
    persistLastTitle(context, appGroup, title)

    val custom =
      RemoteViews(context.packageName, R.layout.expo_targets_notification_content).apply {
        setTextViewText(R.id.expo_targets_notif_title, title)
        setTextViewText(R.id.expo_targets_notif_body, body)
        setTextViewText(R.id.expo_targets_notif_category, category)
      }

    val builder =
      NotificationCompat.Builder(context, channelId)
        .setSmallIcon(android.R.drawable.ic_dialog_info)
        .setContentTitle(title)
        .setContentText(body)
        .setStyle(NotificationCompat.DecoratedCustomViewStyle())
        .setCustomContentView(custom)
        .setCustomBigContentView(custom)
        .setContentIntent(hostPendingIntent(context))
        .setAutoCancel(true)
        .setCategory(category)
        .setPriority(NotificationCompat.PRIORITY_DEFAULT)

    NotificationManagerCompat.from(context).notify(notificationId, builder.build())
  }

  fun presentOngoing(
    context: Context,
    activityId: String,
    title: String,
    body: String,
    contentStateJson: String,
  ) {
    ensureChannel(
      context,
      LIVE_CHANNEL_ID,
      LIVE_CHANNEL_NAME,
      NotificationManager.IMPORTANCE_LOW,
    )

    val stateHint =
      try {
        val json = JSONObject(contentStateJson)
        json.optString("status", body).ifEmpty { body }
      } catch (_: Exception) {
        body
      }

    val builder =
      NotificationCompat.Builder(context, LIVE_CHANNEL_ID)
        .setSmallIcon(android.R.drawable.ic_menu_info_details)
        .setContentTitle(title)
        .setContentText(stateHint)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setContentIntent(hostPendingIntent(context))
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .setCategory(NotificationCompat.CATEGORY_STATUS)

    NotificationManagerCompat.from(context).notify(notifIdFor(activityId), builder.build())
  }

  fun cancelOngoing(context: Context, activityId: String) {
    NotificationManagerCompat.from(context).cancel(notifIdFor(activityId))
  }

  fun cancelAllLive(context: Context, activityIds: Collection<String>) {
    val mgr = NotificationManagerCompat.from(context)
    for (id in activityIds) {
      mgr.cancel(notifIdFor(id))
    }
  }

  fun notificationsEnabled(context: Context): Boolean {
    return NotificationManagerCompat.from(context).areNotificationsEnabled()
  }

  private fun notifIdFor(activityId: String): Int {
    return 0x71000000 or (activityId.hashCode() and 0x00FFFFFF)
  }

  private fun hostPendingIntent(context: Context): PendingIntent {
    val launch =
      context.packageManager.getLaunchIntentForPackage(context.packageName)
        ?: Intent().setPackage(context.packageName)
    return PendingIntent.getActivity(
      context,
      0,
      launch,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }
}
