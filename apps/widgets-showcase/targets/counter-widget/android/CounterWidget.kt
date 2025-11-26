package com.test.widgetshowcase.widget.counterwidget

import android.content.Context
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.glance.GlanceId
import androidx.glance.appwidget.GlanceAppWidget
import androidx.glance.appwidget.GlanceAppWidgetReceiver
import androidx.glance.appwidget.provideContent
import androidx.glance.currentState
import androidx.glance.state.PreferencesGlanceStateDefinition
import expo.modules.targets.ExpoTargetsWidgetUpdateReceiver

private val COUNT_KEY = intPreferencesKey("count")
private val LABEL_KEY = stringPreferencesKey("label")

class CounterWidget : GlanceAppWidget() {
    override val stateDefinition = PreferencesGlanceStateDefinition

    override suspend fun provideGlance(context: Context, id: GlanceId) {
        provideContent {
            val prefs = currentState<androidx.datastore.preferences.core.Preferences>()
            val count = prefs[COUNT_KEY] ?: 0
            val label = prefs[LABEL_KEY]
            CounterWidgetView(CounterData(count, label))
        }
    }
}

data class CounterData(val count: Int, val label: String?)

class CounterWidgetUpdateReceiver : ExpoTargetsWidgetUpdateReceiver<CounterWidget>(
    CounterWidget::class,
    "group.com.test.widgetshowcase"
)

class CounterWidgetWidgetReceiver : GlanceAppWidgetReceiver() {
    override val glanceAppWidget: GlanceAppWidget = CounterWidget()
}

