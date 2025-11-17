package com.test.widgetshowcase.hello

import androidx.compose.runtime.Composable
import androidx.glance.GlanceModifier
import androidx.glance.LocalSize
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.FontWeight
import androidx.glance.text.Text
import androidx.glance.text.TextAlign
import androidx.glance.text.TextStyle
import androidx.glance.unit.ColorProvider

/**
 * Main composable for Hello Widget
 * Mirrors the iOS SwiftUI HelloWidgetView
 */
@Composable
fun HelloWidgetView(message: String) {
    Box(
        modifier = GlanceModifier
            .fillMaxSize()
            .background(ColorProvider(R.color.background_color))
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
                    color = ColorProvider(R.color.text_primary),
                    textAlign = TextAlign.Center
                ),
                maxLines = 3
            )
        }
    }
}

