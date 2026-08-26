package com.expotargets.example.widgets.widget.helloexpoui

import android.content.Context
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.glance.Button
import androidx.glance.GlanceId
import androidx.glance.GlanceModifier
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.background
import androidx.glance.layout.Column
import androidx.glance.layout.Spacer
import androidx.glance.layout.fillMaxSize
import androidx.glance.layout.height
import androidx.glance.layout.padding
import androidx.glance.text.Text
import expo.modules.targets.ExpoTargetsWidgetInteraction
import expo.modules.targets.ExpoTargetsWidgetUpdateReceiver

/**
 * Android companion for the expo-ui widget target.
 * Props mirror App Group / SharedPreferences keys written by setData (no JS sandbox in Glance).
 * FQCN must match withAndroidWidget: {package}.widget.helloexpoui.HelloExpoUiWidgetReceiver
 */
class HelloExpoUi : GlanceAppWidget() {
  companion object {
    private const val PREFS = "group.com.expotargets.example.widgets"
    private const val TARGET = "HelloExpoUi"
  }

  override suspend fun provideGlance(context: Context, id: GlanceId) {
    val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    val message =
      prefs.getString("$TARGET:message", null)
        ?: prefs.getString("message", "Hello Expo UI")
        ?: "Hello Expo UI"
    val taps =
      when (val v = prefs.all["$TARGET:taps"]) {
        is Int -> v
        is Long -> v.toInt()
        is String -> v.toIntOrNull() ?: 0
        else -> 0
      }

    provideContent {
      Column(
        modifier =
          GlanceModifier.fillMaxSize().background(Color.White).padding(16.dp),
      ) {
        Text(text = "Hello Expo UI")
        Text(text = message)
        Text(text = "taps:$taps")
        Spacer(modifier = GlanceModifier.height(8.dp))
        Button(
          text = "Bump",
          onClick =
            ExpoTargetsWidgetInteraction.bumpAction(PREFS, TARGET, "Bump"),
        )
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
