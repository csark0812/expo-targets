package com.test.widgetshowcase.widget.hellowidget

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
 * Main composable for Hello Widget
 * Mirrors the iOS SwiftUI HelloWidgetView
 */
@Composable
fun HelloWidgetView(message: String) {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ColorProvider(R.color.hellowidget_background_color))
            .padding(16.dp)
            .cornerRadius(16.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(
            modifier = GlanceModifier.fillMaxSize(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Star icon (using emoji)
            Text(
                text = "⭐",
                style = TextStyle(fontSize = 32.sp)
            )

            Spacer(modifier = GlanceModifier.height(12.dp))

            // Message text
            Text(
                text = message,
                style = TextStyle(
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Medium,
                    color = ColorProvider(R.color.hellowidget_text_primary),
                    textAlign = TextAlign.Center
                ),
                maxLines = 3
            )
        }
    }
}

