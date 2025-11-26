package expo.modules.targets.messages

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ExpoTargetsMessagesModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoTargetsMessages")

    // Android doesn't have iMessage equivalent
    // These are stubs to maintain API compatibility

    Function("getPresentationStyle") {
      return@Function null
    }

    Function("requestPresentationStyle") { style: String ->
      // No-op on Android
    }

    Function("sendMessage") { layout: Map<String, Any?> ->
      // No-op on Android
    }

    Function("sendUpdate") { layout: Map<String, Any?>, sessionId: String ->
      // No-op on Android
    }

    Function("createSession") {
      return@Function ""
    }

    Function("getConversationInfo") {
      return@Function null
    }

    Events("onPresentationStyleChange")
  }
}

