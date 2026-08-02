package com.expotargets.example.widgets.widget.hellowidget

import android.content.Context
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.Text
import androidx.glance.unit.dp
import expo.modules.targets.ExpoTargetsWidgetUpdateReceiver

/**
 * Bridge-grade Glance widget for examples/widgets.
 * FQCN must match withAndroidWidget: {package}.widget.hellowidget.HelloWidgetWidgetReceiver
 */
class HelloWidget : GlanceAppWidget() {
  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val prefs =
      context.getSharedPreferences(
        "group.com.expotargets.example.widgets",
        Context.MODE_PRIVATE,
      )
    val message =
      prefs.getString("HelloWidget:message", null)
        ?: prefs.getString("message", "ET Widgets")
        ?: "ET Widgets"

    provideContent {
      Column(modifier = GlanceModifier.fillMaxSize().padding(16.dp)) {
        Text("Hello Widget")
        Text(message)
      }
    }
  }
}

class HelloWidgetWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = HelloWidget()
}

class HelloWidgetUpdateReceiver :
  ExpoTargetsWidgetUpdateReceiver<HelloWidget>(
    HelloWidget::class,
    "group.com.expotargets.example.widgets",
  )
