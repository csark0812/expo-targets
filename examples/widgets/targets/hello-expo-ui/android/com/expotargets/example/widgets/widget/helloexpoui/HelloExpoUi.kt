package com.expotargets.example.widgets.widget.helloexpoui

import android.content.Context
import androidx.compose.ui.unit.dp
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.layout.Column
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.padding
import androidx.glance.text.Text
import expo.modules.targets.ExpoTargetsWidgetUpdateReceiver

/**
 * Android companion for the expo-ui widget target.
 * Props mirror App Group / SharedPreferences keys written by setData (no JS sandbox in Glance).
 * FQCN must match withAndroidWidget: {package}.widget.helloexpoui.HelloExpoUiWidgetReceiver
 */
class HelloExpoUi : GlanceAppWidget() {
  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val prefs =
      context.getSharedPreferences(
        "group.com.expotargets.example.widgets",
        Context.MODE_PRIVATE,
      )
    val message =
      prefs.getString("HelloExpoUi:message", null)
        ?: prefs.getString("message", "Hello Expo UI")
        ?: "Hello Expo UI"

    provideContent {
      Column(modifier = GlanceModifier.fillMaxSize().padding(16.dp)) {
        Text("Hello Expo UI")
        Text(message)
      }
    }
  }
}

class HelloExpoUiWidgetReceiver : GlanceAppWidgetReceiver() {
  override val glanceAppWidget: GlanceAppWidget = HelloExpoUi()
}

class HelloExpoUiUpdateReceiver :
  ExpoTargetsWidgetUpdateReceiver<HelloExpoUi>(
    HelloExpoUi::class,
    "group.com.expotargets.example.widgets",
  )
