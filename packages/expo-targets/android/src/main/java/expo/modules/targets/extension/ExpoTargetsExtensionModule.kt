package expo.modules.targets.extension

import android.app.Activity
import android.content.Intent
import android.net.Uri
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

class ExpoTargetsExtensionModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("ExpoTargetsExtension")

    Function("closeExtension") {
      // Close the current activity
      val currentActivity = appContext.currentActivity
      currentActivity?.finish()
    }

    Function("openHostApp") { path: String ->
      // Open the host app with a deep link
      val currentActivity = appContext.currentActivity ?: return@Function
      val packageName = currentActivity.packageName
      
      try {
        // Create intent to open main app with custom path
        val intent = Intent(Intent.ACTION_VIEW).apply {
          data = Uri.parse("$packageName://$path")
          flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
          setPackage(packageName)
        }
        currentActivity.startActivity(intent)
        currentActivity.finish()
      } catch (e: Exception) {
        // Fallback: Open main app without deep link
        val launchIntent = currentActivity.packageManager.getLaunchIntentForPackage(packageName)
        launchIntent?.let {
          it.flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
          currentActivity.startActivity(it)
        }
        currentActivity.finish()
      }
    }

    Function("getSharedData") -> Map<String, Any?> {
      val currentActivity = appContext.currentActivity
      val intent = currentActivity?.intent
      
      if (intent == null) {
        return@Function emptyMap()
      }

      val result = mutableMapOf<String, Any?>()

      when (intent.action) {
        Intent.ACTION_SEND -> {
          // Handle single item share
          extractSharedContent(intent, result)
        }
        Intent.ACTION_SEND_MULTIPLE -> {
          // Handle multiple items share
          extractMultipleSharedContent(intent, result)
        }
      }

      return@Function result
    }
  }

  private fun extractSharedContent(intent: Intent, result: MutableMap<String, Any?>) {
    // Extract text
    intent.getStringExtra(Intent.EXTRA_TEXT)?.let { text ->
      // Check if it's a URL
      if (text.startsWith("http://") || text.startsWith("https://")) {
        result["url"] = text
      } else {
        result["text"] = text
      }
    }

    // Extract subject (often used as title)
    intent.getStringExtra(Intent.EXTRA_SUBJECT)?.let { subject ->
      result["title"] = subject
    }

    // Extract single image/file
    (intent.getParcelableExtra(Intent.EXTRA_STREAM) as? Uri)?.let { uri ->
      val mimeType = intent.type ?: ""
      when {
        mimeType.startsWith("image/") -> {
          result["images"] = listOf(uri.toString())
        }
        mimeType.startsWith("video/") -> {
          result["videos"] = listOf(uri.toString())
        }
        else -> {
          result["files"] = listOf(uri.toString())
        }
      }
    }
  }

  private fun extractMultipleSharedContent(intent: Intent, result: MutableMap<String, Any?>) {
    // Extract text (if any)
    intent.getStringExtra(Intent.EXTRA_TEXT)?.let { text ->
      result["text"] = text
    }

    // Extract subject
    intent.getStringExtra(Intent.EXTRA_SUBJECT)?.let { subject ->
      result["title"] = subject
    }

    // Extract multiple items
    intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)?.let { uris ->
      val mimeType = intent.type ?: ""
      val paths = uris.map { it.toString() }
      
      when {
        mimeType.startsWith("image/") -> {
          result["images"] = paths
        }
        mimeType.startsWith("video/") -> {
          result["videos"] = paths
        }
        else -> {
          result["files"] = paths
        }
      }
    }
  }
}

