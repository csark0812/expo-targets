package expo.modules.targets.extension

import android.content.Intent
import android.net.Uri
import android.os.Bundle

/**
 * Shared Intent → props map for Share/Action Activities and [ExpoTargetsExtensionModule].
 * Keys match iOS initialProperties / ShareExtension props: text, url, images.
 */
object ExpoTargetsSharedIntent {
  fun extract(intent: Intent?): Map<String, Any?>? {
    if (intent == null) return null
    val result = linkedMapOf<String, Any?>()
    val type = intent.type

    when (intent.action) {
      Intent.ACTION_SEND -> {
        intent.getStringExtra(Intent.EXTRA_TEXT)?.let { result["text"] = it }
        intent.getStringExtra(Intent.EXTRA_SUBJECT)?.let { subject ->
          if (!result.containsKey("text")) result["text"] = subject
        }
        @Suppress("DEPRECATION")
        (intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM))?.let { uri ->
          if (type?.startsWith("image/") == true) {
            result["images"] = listOf(uri.toString())
          } else {
            result["url"] = uri.toString()
          }
        }
        intent.dataString?.let { data ->
          if (!result.containsKey("url") && data.startsWith("http")) {
            result["url"] = data
          }
        }
      }
      Intent.ACTION_SEND_MULTIPLE -> {
        intent.getStringExtra(Intent.EXTRA_TEXT)?.let { result["text"] = it }
        @Suppress("DEPRECATION")
        val streams = intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)
        if (streams != null && streams.isNotEmpty()) {
          if (type?.startsWith("image/") == true) {
            result["images"] = streams.map { it.toString() }
          } else {
            result["url"] = streams.first().toString()
          }
        }
      }
      Intent.ACTION_PROCESS_TEXT -> {
        intent.getStringExtra(Intent.EXTRA_PROCESS_TEXT)?.let { result["text"] = it }
      }
      else -> {
        intent.getStringExtra("expo_targets_text")?.let { result["text"] = it }
        intent.getStringExtra("expo_targets_url")?.let { result["url"] = it }
        intent.getStringExtra(Intent.EXTRA_TEXT)?.let { result["text"] = it }
      }
    }

    val clip = intent.clipData
    if (clip != null && !result.containsKey("images") && !result.containsKey("url")) {
      val images = mutableListOf<String>()
      for (i in 0 until clip.itemCount) {
        val item = clip.getItemAt(i)
        item.uri?.let { images.add(it.toString()) }
        item.text?.toString()?.let { text ->
          if (!result.containsKey("text")) result["text"] = text
        }
      }
      if (images.isNotEmpty()) {
        result["images"] = images
      }
    }

    return if (result.isEmpty()) null else result
  }

  /** Bundle for ReactActivityDelegate.getLaunchOptions (RN initial props). */
  fun toLaunchOptions(intent: Intent?): Bundle? {
    val data = extract(intent) ?: return null
    val bundle = Bundle()
    (data["text"] as? String)?.let { bundle.putString("text", it) }
    (data["url"] as? String)?.let { bundle.putString("url", it) }
    @Suppress("UNCHECKED_CAST")
    (data["images"] as? List<String>)?.let { imgs ->
      bundle.putStringArrayList("images", ArrayList(imgs))
    }
    return if (bundle.isEmpty) null else bundle
  }
}
