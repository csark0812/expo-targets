package expo.modules.targets

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoTargetsExtensionModule : Module() {
    override fun definition() = ModuleDefinition {
        Name("ExpoTargetsExtension")

        Constants {
            "supportsGlance" to (android.os.Build.VERSION.SDK_INT >= 33)
            "platformVersion" to android.os.Build.VERSION.SDK_INT
        }

        AsyncFunction("refresh") { widgetName: String ->
            appContext.reactContext?.let { context ->
                try {
                    ExpoTargetsReceiver.refreshWidget(context, widgetName)
                    return@AsyncFunction true
                } catch (e: Exception) {
                    throw Exception("Failed to refresh widget: ${e.message}")
                }
            } ?: throw Exception("React context not available")
        }
    }
}
