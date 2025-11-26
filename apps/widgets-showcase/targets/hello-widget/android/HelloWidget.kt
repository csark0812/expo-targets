package com.test.widgetshowcase.widget.hellowidget

import android.content.Context
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.currentState
import androidx.glance.state.PreferencesGlanceStateDefinition
import expo.modules.targets.ExpoTargetsWidgetUpdateReceiver

private val MESSAGE_KEY = stringPreferencesKey("message")

class HelloWidget : GlanceAppWidget() {
    override val stateDefinition = PreferencesGlanceStateDefinition

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            val prefs = currentState<androidx.datastore.preferences.core.Preferences>()
            val message = prefs[MESSAGE_KEY] ?: "No message yet"
            HelloWidgetView(message)
        }
    }
}

class HelloWidgetUpdateReceiver : ExpoTargetsWidgetUpdateReceiver<HelloWidget>(
    HelloWidget::class,
    "group.com.test.widgetshowcase"
)

class HelloWidgetWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = HelloWidget()
}

