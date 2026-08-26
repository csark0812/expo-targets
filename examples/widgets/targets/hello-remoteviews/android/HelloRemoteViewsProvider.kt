package com.expotargets.example.widgets.widget.helloremoteviews

import android.content.Context
import android.widget.RemoteViews
import com.expotargets.example.widgets.R
import expo.modules.targets.ExpoTargetsRemoteViewsProvider
import expo.modules.targets.ExpoTargetsWidgetInteraction

/**
 * RemoteViews widget deepen — FQCN must match withAndroidWidget:
 * com.expotargets.example.widgets.widget.helloremoteviews.HelloRemoteViewsProvider
 */
class HelloRemoteViewsProvider :
  ExpoTargetsRemoteViewsProvider("group.com.expotargets.example.widgets") {
  companion object {
    private const val PREFS = "group.com.expotargets.example.widgets"
    private const val TARGET = "HelloRemoteViews"
  }

  override val layoutResId: Int = R.layout.widget_helloremoteviews

  override fun updateWidget(
    context: Context,
    views: RemoteViews,
    data: Map<String, *>,
  ) {
    val message =
      (data["HelloRemoteViews:message"] as? String)
        ?: (data["message"] as? String)
        ?: "Hello RemoteViews"
    val taps =
      when (val v = data["HelloRemoteViews:taps"]) {
        is Int -> v
        is Long -> v.toInt()
        is String -> v.toIntOrNull() ?: 0
        else -> 0
      }

    views.setTextViewText(R.id.widget_helloremoteviews_title, "Hello RemoteViews")
    views.setTextViewText(R.id.widget_helloremoteviews_message, message)
    views.setTextViewText(R.id.widget_helloremoteviews_taps, "taps:$taps")
    views.setOnClickPendingIntent(
      R.id.widget_helloremoteviews_bump,
      ExpoTargetsWidgetInteraction.bumpPendingIntent(
        context,
        PREFS,
        TARGET,
        "Bump",
        requestCode = TARGET.hashCode(),
      ),
    )
  }
}
