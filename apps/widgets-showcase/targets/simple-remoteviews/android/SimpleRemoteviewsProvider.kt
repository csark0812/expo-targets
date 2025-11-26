package com.test.widgetshowcase.widget.simple_remoteviews

import android.content.Context
import android.widget.RemoteViews
import expo.modules.targets.ExpoTargetsRemoteViewsProvider
import com.test.widgetshowcase.R

class SimpleRemoteviewsProvider : ExpoTargetsRemoteViewsProvider(
    prefsName = "group.com.test.widgetshowcase"
) {
    override val layoutResId = R.layout.widget_simple_remoteviews

    override fun updateWidget(context: Context, views: RemoteViews, data: Map<String, *>) {
        val title = data["title"] as? String ?: "Hello"
        val message = data["message"] as? String ?: "RemoteViews Widget"

        views.setTextViewText(R.id.widget_title, title)
        views.setTextViewText(R.id.widget_message, message)
    }
}

