package expo.modules.targets.system

import android.inputmethodservice.InputMethodService
import android.view.View
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.LinearLayout

/**
 * Minimal IME (Wave 3b keyboard). Settings → Language & input enablement is leftover.
 */
open class ExpoTargetsInputMethodService : InputMethodService() {
  override fun onCreateInputView(): View {
    val layout =
      LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        setPadding(24, 24, 24, 24)
      }
    layout.addView(
      Button(this).apply {
        text = "ET"
        setOnClickListener {
          currentInputConnection?.commitText("ET", 1)
        }
      },
    )
    layout.addView(
      Button(this).apply {
        text = "⌫"
        setOnClickListener {
          currentInputConnection?.deleteSurroundingText(1, 0)
        }
      },
    )
    return layout
  }

  override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
    super.onStartInputView(info, restarting)
  }
}
