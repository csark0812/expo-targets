package expo.modules.targets

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import androidx.glance.action.ActionParameters
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.GlanceId
import androidx.glance.action.actionParametersOf
import expo.modules.targets.storage.ExpoTargetsStorageModule

/**
 * Shared Bump / tap path for Glance + RemoteViews deepen.
 * Mutates SharedPreferences taps, refreshes the widget, emits host listener event.
 */
object ExpoTargetsWidgetInteraction {
  const val ACTION_BUMP = "expo.modules.targets.WIDGET_BUMP"

  val PARAM_PREFS: ActionParameters.Key<String> = ActionParameters.Key("prefsName")
  val PARAM_TARGET: ActionParameters.Key<String> = ActionParameters.Key("targetName")
  val PARAM_SOURCE: ActionParameters.Key<String> = ActionParameters.Key("source")

  fun bump(
    context: Context,
    prefsName: String,
    targetName: String,
    source: String = "Bump",
  ) {
    ExpoTargetsLogger.init(context)
    val prefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
    val tapsKey = "$targetName:taps"
    val current =
      when (val v = prefs.all[tapsKey]) {
        is Int -> v
        is Long -> v.toInt()
        is String -> v.toIntOrNull() ?: 0
        is Float -> v.toInt()
        else -> 0
      }
    prefs.edit().putInt(tapsKey, current + 1).commit()
    ExpoTargetsLogger.d(
      "WidgetInteraction",
      "bump: target=$targetName source=$source taps=${current + 1}",
    )
    ExpoTargetsReceiver.refreshWidget(context, targetName)
    ExpoTargetsStorageModule.emitUserInteraction(source, targetName)
  }

  fun bumpPendingIntent(
    context: Context,
    prefsName: String,
    targetName: String,
    source: String = "Bump",
    requestCode: Int = targetName.hashCode(),
  ): PendingIntent {
    val intent =
      Intent(ACTION_BUMP).apply {
        setPackage(context.packageName)
        putExtra("prefsName", prefsName)
        putExtra("targetName", targetName)
        putExtra("source", source)
      }
    return PendingIntent.getBroadcast(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }

  /** Glance Button onClick helper. */
  fun bumpAction(
    prefsName: String,
    targetName: String,
    source: String = "Bump",
  ) =
    actionRunCallback<ExpoTargetsWidgetBumpAction>(
      actionParametersOf(
        PARAM_PREFS to prefsName,
        PARAM_TARGET to targetName,
        PARAM_SOURCE to source,
      ),
    )
}

/** Glance actionRunCallback entry — must stay public no-arg for App Widget. */
class ExpoTargetsWidgetBumpAction : ActionCallback {
  override suspend fun onAction(
    context: Context,
    glanceId: GlanceId,
    parameters: ActionParameters,
  ) {
    val prefsName = parameters[ExpoTargetsWidgetInteraction.PARAM_PREFS] ?: return
    val targetName = parameters[ExpoTargetsWidgetInteraction.PARAM_TARGET] ?: return
    val source = parameters[ExpoTargetsWidgetInteraction.PARAM_SOURCE] ?: "Bump"
    ExpoTargetsWidgetInteraction.bump(context, prefsName, targetName, source)
  }
}
