package com.expotargets.example.widgets.widget.helloremoteviews

import android.content.Context
import android.widget.RemoteViews
import com.expotargets.example.widgets.R
import expo.modules.targets.ExpoTargetsRemoteViewsProvider

/**
 * RemoteViews widget deepen — FQCN must match withAndroidWidget:
 * com.expotargets.example.widgets.widget.helloremoteviews.HelloRemoteViewsProvider
 */
class HelloRemoteViewsProvider :
  ExpoTargetsRemoteViewsProvider("group.com.expotargets.example.widgets") {
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

    views.setTextViewText(R.id.widget_helloremoteviews_title, "Hello RemoteViews")
    views.setTextViewText(R.id.widget_helloremoteviews_message, message)
  }
}
