package com.expotargets.example.widgets.widget.helloremoteviewsbundle

import android.content.Context
import android.widget.RemoteViews
import com.expotargets.example.widgets.R
import expo.modules.targets.ExpoTargetsRemoteViewsProvider

/**
 * RemoteViews picker row 1 — FQCN:
 * com.expotargets.example.widgets.widget.helloremoteviewsbundle.StatusProvider
 */
class StatusProvider :
  ExpoTargetsRemoteViewsProvider("group.com.expotargets.example.widgets") {
  companion object {
    private const val TARGET = "HelloRemoteViewsBundle"
  }

  override val layoutResId: Int = R.layout.widget_status

  override fun updateWidget(
    context: Context,
    views: RemoteViews,
    data: Map<String, *>,
  ) {
    val message =
      (data["$TARGET:message"] as? String)
        ?: (data["message"] as? String)
        ?: "Status ready"
    views.setTextViewText(R.id.widget_status_title, "Hello Status")
    views.setTextViewText(R.id.widget_status_message, message)
  }
}
