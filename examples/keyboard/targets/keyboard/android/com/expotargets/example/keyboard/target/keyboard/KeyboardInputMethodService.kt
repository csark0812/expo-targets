package com.expotargets.example.keyboard.target.keyboard

import android.util.Log
import android.view.View
import android.widget.Button
import android.widget.LinearLayout
import expo.modules.targets.system.ExpoTargetsInputMethodService

/**
 * User deepen — FQCN must match the Android config plugin:
 * com.expotargets.example.keyboard.target.keyboard.KeyboardInputMethodService
 *
 * Overrides input view so ET key commit is reliable (same-process IME + injected taps).
 */
class KeyboardInputMethodService : ExpoTargetsInputMethodService() {
  override fun onCreateInputView(): View {
    val density = resources.displayMetrics.density
    val pad = (12 * density).toInt()
    val minH = (48 * density).toInt()
    val layout =
      LinearLayout(this).apply {
        orientation = LinearLayout.HORIZONTAL
        setPadding(pad, pad, pad, pad)
      }

    fun addKey(label: String, onActivate: () -> Unit) {
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
        LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f),
      )
    }

    addKey("ET") {
      val ic = currentInputConnection
      if (ic == null) {
        Log.w(TAG, "ET tap: no InputConnection")
        return@addKey
      }
      ic.beginBatchEdit()
      try {
        ic.commitText("ET", 1)
      } finally {
        ic.endBatchEdit()
      }
    }
    addKey("⌫") {
      currentInputConnection?.deleteSurroundingText(1, 0)
    }
    return layout
  }

  companion object {
    private const val TAG = "KeyboardIME"
  }
}
