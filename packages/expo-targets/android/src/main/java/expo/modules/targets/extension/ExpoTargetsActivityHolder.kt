package expo.modules.targets.extension

import android.app.Activity
import android.content.Intent
import java.lang.ref.WeakReference

/**
 * Holds the current target Activity (harness, share, or action) so
 * [ExpoTargetsExtensionModule] can finish it and read Intent extras.
 */
object ExpoTargetsActivityHolder {
  @Volatile
  private var activityRef: WeakReference<Activity>? = null

  @Volatile
  var lastIntent: Intent? = null
    private set

  fun attach(activity: Activity) {
    activityRef = WeakReference(activity)
    lastIntent = activity.intent
  }

  fun detach(activity: Activity) {
    if (activityRef?.get() === activity) {
      activityRef = null
    }
  }

  fun currentActivity(): Activity? = activityRef?.get()

  fun updateIntent(intent: Intent?) {
    if (intent != null) {
      lastIntent = intent
    }
  }
}
