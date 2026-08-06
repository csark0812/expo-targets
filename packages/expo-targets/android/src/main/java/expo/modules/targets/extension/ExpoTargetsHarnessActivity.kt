package expo.modules.targets.extension

import android.app.Activity
import android.content.Intent
import android.os.Bundle

/**
 * Throwaway Activity for Wave 0 DoD of getSharedData / openHostApp / close.
 * Launch with ACTION_SEND (or custom extras) for synthetic share payloads.
 * Product share/action Activities replace this path in Wave 1.
 */
class ExpoTargetsHarnessActivity : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    ExpoTargetsActivityHolder.attach(this)
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    ExpoTargetsActivityHolder.updateIntent(intent)
  }

  override fun onDestroy() {
    ExpoTargetsActivityHolder.detach(this)
    super.onDestroy()
  }
}
