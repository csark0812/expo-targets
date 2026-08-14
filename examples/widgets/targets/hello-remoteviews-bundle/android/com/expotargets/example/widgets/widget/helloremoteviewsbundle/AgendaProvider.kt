package com.expotargets.example.widgets.widget.helloremoteviewsbundle

import android.content.Context
import android.widget.RemoteViews
import com.expotargets.example.widgets.R
import expo.modules.targets.ExpoTargetsRemoteViewsProvider

/**
 * RemoteViews picker row 2 — FQCN:
 * com.expotargets.example.widgets.widget.helloremoteviewsbundle.AgendaProvider
 */
class AgendaProvider :
  ExpoTargetsRemoteViewsProvider("group.com.expotargets.example.widgets") {
  companion object {
    private const val TARGET = "HelloRemoteViewsBundle"
  }

  override val layoutResId: Int = R.layout.widget_agenda

  override fun updateWidget(
    context: Context,
    views: RemoteViews,
    data: Map<String, *>,
  ) {
    val message =
      (data["$TARGET:message"] as? String)
        ?: (data["message"] as? String)
        ?: "Ship widgets"
    views.setTextViewText(R.id.widget_agenda_title, "Hello Agenda")
    views.setTextViewText(R.id.widget_agenda_line1, "1. Morning standup")
    views.setTextViewText(R.id.widget_agenda_line2, "2. $message")
  }
}
