package com.test.widgetshowcase.widget.counterwidget

import androidx.compose.runtime.Composable
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.glance.GlanceModifier
import androidx.glance.LocalSize
import androidx.glance.appwidget.cornerRadius
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider
import com.test.widgetshowcase.R

/**
 * Main composable for Counter Widget
 * Provides different layouts based on widget size (small, medium)
 * Mirrors the iOS SwiftUI CounterWidgetView
 */
@Composable
fun CounterWidgetView(data: CounterData) {
    val size = LocalSize.current

    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ColorProvider(R.color.counterwidget_background_color))
            .padding(16.dp)
            .cornerRadius(16.dp),
        contentAlignment = Alignment.Center
    ) {
        when {
            // Small widget (2x2) - compact counter view
            size.width.value < 200 -> SmallCounterView(data)

            // Medium widget (4x2) - detailed counter view
            else -> MediumCounterView(data)
        }
    }
}

/**
 * Small widget view (2x2) - Compact counter display
 * Mirrors the small family view in CounterWidget.swift
 */
@Composable
fun SmallCounterView(data: CounterData) {
    Column(
        modifier = GlanceModifier.fillMaxSize(),
        verticalAlignment = Alignment.CenterVertically,
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Count number
        Text(
            text = "${data.count}",
            style = TextStyle(
                fontSize = 48.sp,
                fontWeight = FontWeight.Bold,
                color = ColorProvider(R.color.counterwidget_accent_color)
            )
        )

        Spacer(modifier = GlanceModifier.height(8.dp))

        // Label or default text
        Text(
            text = data.label?.takeIf { it.isNotEmpty() } ?: "Count",
            style = TextStyle(
                fontSize = 12.sp,
                color = ColorProvider(R.color.counterwidget_text_secondary)
            ),
            maxLines = 1
        )
    }
}

/**
 * Medium widget view (4x2) - Detailed counter display
 * Mirrors the medium family view in CounterWidget.swift
 */
@Composable
fun MediumCounterView(data: CounterData) {
    Column(
        modifier = GlanceModifier.fillMaxSize(),
        verticalAlignment = Alignment.Top,
        horizontalAlignment = Alignment.Start
    ) {
        // Header with icon and title
        Row(
            modifier = GlanceModifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Text(
                text = "🔢",
                style = TextStyle(fontSize = 24.sp)
            )

            Spacer(modifier = GlanceModifier.width(8.dp))

            Text(
                text = "Counter",
                style = TextStyle(
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold,
                    color = ColorProvider(R.color.counterwidget_text_primary)
                )
            )
        }

        Spacer(modifier = GlanceModifier.height(16.dp))

        // Count number
        Text(
            text = "${data.count}",
            style = TextStyle(
                fontSize = 56.sp,
                fontWeight = FontWeight.Bold,
                color = ColorProvider(R.color.counterwidget_accent_color)
            )
        )

        Spacer(modifier = GlanceModifier.height(8.dp))

        // Label or default text
        Text(
            text = data.label?.takeIf { it.isNotEmpty() } ?: "No label set",
            style = TextStyle(
                fontSize = 14.sp,
                color = ColorProvider(R.color.counterwidget_text_secondary)
            )
        )
    }
}

