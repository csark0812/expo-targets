package expo.modules.targets.extension

import android.content.ComponentName
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.targets.ExpoTargetsLogger

/**
 * React Native host for Share/Action when the target has an `entry` (USE_RN=true).
 * Mirrors iOS ReactNativeViewController: AppRegistry module = config `name`,
 * Intent extras → launch options (text/url/images), same process as the host app.
 *
 * Requires the host JS bundle to register the component (e.g. host imports
 * `createTarget('Share', …)` so AppRegistry has module "Share").
 *
 * Note: [ReactActivity] calls [createReactActivityDelegate] from its constructor,
 * before subclass fields / [onCreate] run — so MODULE_NAME is resolved from the
 * Activity's manifest meta-data via [ActivityThread.currentApplication].
 */
abstract class ExpoTargetsReactTargetActivity : ReactActivity() {
  protected var targetName: String = "Target"
  protected var moduleName: String = "Target"
  protected var appGroup: String = ""

  override fun onCreate(savedInstanceState: Bundle?) {
    readMeta()
    ExpoTargetsActivityHolder.attach(this)
    // Dialog theme; no splash — share sheet budget.
    super.onCreate(null)
    // Give the RN ShareExtension room (default Dialog is too narrow/short).
    window?.setLayout(
      (resources.displayMetrics.widthPixels * 0.92f).toInt(),
      (resources.displayMetrics.heightPixels * 0.75f).toInt(),
    )
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

  override fun getMainComponentName(): String = resolveModuleName(javaClass)

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    val self = this
    val name = resolveModuleName(javaClass)
    return object : DefaultReactActivityDelegate(self, name, fabricEnabled) {
      override fun getLaunchOptions(): Bundle? =
        ExpoTargetsSharedIntent.toLaunchOptions(self.intent)
    }
  }

  private fun readMeta() {
    try {
      val info =
        packageManager.getActivityInfo(
          componentName,
          PackageManager.GET_META_DATA,
        )
      val meta = info.metaData
      targetName = meta?.getString("expo.targets.TARGET_NAME") ?: targetName
      moduleName = meta?.getString("expo.targets.MODULE_NAME") ?: targetName
      appGroup =
        meta?.getString("expo.targets.APP_GROUP")
          ?: "group.$packageName"
      ExpoTargetsLogger.d(
        "ReactTarget",
        "RN Share/Action host: module=$moduleName target=$targetName",
      )
    } catch (e: Exception) {
      ExpoTargetsLogger.w("ReactTarget", "readMeta failed: ${e.message}")
      appGroup = "group.$packageName"
    }
  }

  companion object {
    /**
     * Safe during [ReactActivity] construction (subclass fields not initialized yet).
     */
    fun resolveModuleName(activityClass: Class<*>): String {
      return try {
        val activityThreadClass = Class.forName("android.app.ActivityThread")
        val app =
          activityThreadClass
            .getMethod("currentApplication")
            .invoke(null) as? android.app.Application
            ?: return "Target"
        val component = ComponentName(app, activityClass)
        val info =
          app.packageManager.getActivityInfo(
            component,
            PackageManager.GET_META_DATA,
          )
        info.metaData?.getString("expo.targets.MODULE_NAME")
          ?: info.metaData?.getString("expo.targets.TARGET_NAME")
          ?: "Target"
      } catch (e: Exception) {
        ExpoTargetsLogger.w(
          "ReactTarget",
          "resolveModuleName failed: ${e.message}",
        )
        "Target"
      }
    }
  }
}

/** RN Share Activity — used when config has `entry`. */
open class ExpoTargetsReactShareActivity : ExpoTargetsReactTargetActivity()

/** RN Action Activity — used when config has `entry`. */
open class ExpoTargetsReactActionActivity : ExpoTargetsReactTargetActivity()
