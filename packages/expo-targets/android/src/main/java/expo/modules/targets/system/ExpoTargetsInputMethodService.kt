package expo.modules.targets.system

import android.inputmethodservice.InputMethodService
import android.util.Log
import android.view.View
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.LinearLayout

/**
 * Minimal IME (Wave 3b keyboard). Settings → Language & input enablement is leftover.
 * Inserts `ET` via the labeled key (Devicewright journeys assert `typed:ET`).
 */
open class ExpoTargetsInputMethodService : InputMethodService() {
  override fun onCreateInputView(): View {
    val density = resources.displayMetrics.density
    val pad = (12 * density).toInt()
    val minH = (48 * density).toInt()
    val layout =
      LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        setPadding(pad, pad, pad, pad)
      }

    fun key(
      label: String,
      weight: Float = 1f,
      onActivate: () -> Unit,
    ): Button {
      val button =
        Button(this).apply {
          text = label
          contentDescription = label
          isAllCaps = false
          minimumHeight = minH
          setOnClickListener { onActivate() }
        }
      layout.addView(
        button,
        LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, weight),
      )
      return button
    }

    key("ET") { commitEt() }
    key("⌫") {
      getCurrentInputConnection()?.deleteSurroundingText(1, 0)
        ?: Log.w(TAG, "⌫: no InputConnection")
    }
    return layout
  }

  override fun onStartInputView(info: EditorInfo?, restarting: Boolean) {
    super.onStartInputView(info, restarting)
  }

  private fun commitEt() {
    val ic = getCurrentInputConnection()
    if (ic == null) {
      Log.w(TAG, "ET: no InputConnection")
      return
    }
    ic.beginBatchEdit()
    try {
      ic.commitText("ET", 1)
    } finally {
      ic.endBatchEdit()
    }
  }

  companion object {
    private const val TAG = "ExpoTargetsIME"
  }
}
