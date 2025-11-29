package com.csarkissian.alltargetsdemo.widget.demowidget

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

class DemoWidget : GlanceAppWidget() {
    override val stateDefinition = PreferencesGlanceStateDefinition

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            val prefs = currentState<androidx.datastore.preferences.core.Preferences>()
            val message = prefs[MESSAGE_KEY] ?: "All Targets Demo"
            DemoWidgetView(message)
        }
    }
}

class DemoWidgetUpdateReceiver : ExpoTargetsWidgetUpdateReceiver<DemoWidget>(
    DemoWidget::class,
    "group.com.csarkissian.alltargetsdemo"
)

class DemoWidgetWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = DemoWidget()
}

