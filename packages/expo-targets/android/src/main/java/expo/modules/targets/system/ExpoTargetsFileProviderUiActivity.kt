package expo.modules.targets.system

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.widget.LinearLayout
import android.widget.TextView

/**
 * Companion document UI Activity (Wave 3a file-provider-ui).
 * Partial vs iOS File Provider UI actions — VIEW intent host stub.
 */
open class ExpoTargetsFileProviderUiActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val pad =
      TypedValue.applyDimension(
        TypedValue.COMPLEX_UNIT_DIP,
        20f,
        resources.displayMetrics,
      ).toInt()
    val column =
      LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(pad, pad, pad, pad)
        gravity = Gravity.CENTER
        setBackgroundColor(Color.WHITE)
      }
    column.addView(
      TextView(this).apply {
        text = "Expo Targets Document UI"
        setTextColor(Color.BLACK)
        textSize = 18f
      },
    )
    column.addView(
      TextView(this).apply {
        text = intent?.dataString ?: intent?.type ?: "(no document)"
        setTextColor(Color.DKGRAY)
        textSize = 14f
      },
    )
    setContentView(column)
  }
}
