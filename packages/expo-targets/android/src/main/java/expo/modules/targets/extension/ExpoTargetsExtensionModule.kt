package expo.modules.targets.extension

import android.content.Intent
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.targets.ExpoTargetsLogger

class ExpoTargetsExtensionModule : Module() {
  companion object {
    private const val TAG = "Extension"
  }

  override fun definition() = ModuleDefinition {
    Name("ExpoTargetsExtension")

    Function("closeExtension") {
      val activity = ExpoTargetsActivityHolder.currentActivity()
      if (activity != null) {
        activity.runOnUiThread { activity.finish() }
      } else {
        ExpoTargetsLogger.w(TAG, "closeExtension: no current target Activity")
      }
    }

    Function("openHostApp") { path: String ->
      val activity = ExpoTargetsActivityHolder.currentActivity()
      val context =
        appContext.reactContext
          ?: activity
      if (context == null) {
        ExpoTargetsLogger.w(TAG, "openHostApp: no context")
      } else {
        val packageName = context.packageName
        val launch =
          context.packageManager.getLaunchIntentForPackage(packageName)
            ?: Intent(Intent.ACTION_MAIN).apply {
              addCategory(Intent.CATEGORY_LAUNCHER)
              setPackage(packageName)
            }

        launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)

        val trimmed = path.trim()
        if (trimmed.isNotEmpty()) {
          val deepLink =
            when {
              trimmed.contains("://") -> Uri.parse(trimmed)
              trimmed.startsWith("/") ->
                Uri.Builder()
                  .scheme("expotargets")
                  .authority(packageName)
                  .path(trimmed.removePrefix("/"))
                  .build()
              else -> Uri.parse("expotargets://$packageName/$trimmed")
            }
          launch.data = deepLink
          launch.putExtra("expo_targets_path", trimmed)
        }

        context.startActivity(launch)
        // Match native Activity.openHost: dismiss the Share/Action surface.
        activity?.runOnUiThread { activity.finish() }
      }
    }

    Function("getSharedData") {
      val intent =
        ExpoTargetsActivityHolder.currentActivity()?.intent
          ?: ExpoTargetsActivityHolder.lastIntent
      if (intent == null) {
        ExpoTargetsLogger.d(TAG, "getSharedData: no intent")
        return@Function null
      }
      return@Function ExpoTargetsSharedIntent.extract(intent)
    }
  }
}
