package expo.modules.targets.extension

import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.util.TypedValue
import android.view.Gravity
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.json.JSONArray
import org.json.JSONObject

/**
 * Base dedicated Activity for share/action targets (Wave 1).
 * Attaches [ExpoTargetsActivityHolder] so JS getSharedData/close/openHostApp work.
 * Native UI when the target has no `entry`. With `entry`, the plugin registers
 * [ExpoTargetsReactTargetActivity] instead (TTI GO — see spike android-rn-host-tti-2026-08-10).
 */
abstract class ExpoTargetsTargetActivity : Activity() {
  protected var targetName: String = "Target"
  protected var appGroup: String = ""
  protected var moduleName: String = "Target"

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    readMeta()
    ExpoTargetsActivityHolder.attach(this)
    setContentView(buildNativeUi())
  }

  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    ExpoTargetsActivityHolder.updateIntent(intent)
    setContentView(buildNativeUi())
  }

  override fun onDestroy() {
    ExpoTargetsActivityHolder.detach(this)
    super.onDestroy()
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
    } catch (_: Exception) {
      appGroup = "group.$packageName"
    }
  }

  private fun dp(value: Float): Int =
    TypedValue.applyDimension(
      TypedValue.COMPLEX_UNIT_DIP,
      value,
      resources.displayMetrics,
    ).toInt()

  private fun buildNativeUi(): ScrollView {
    val pad = dp(20f)
    val gap = dp(10f)
    // Match iOS ShareExtension.tsx accents (#007AFF primary / light chrome).
    val iosBlue = Color.parseColor("#007AFF")
    val labelMuted = Color.parseColor("#666666")
    val cardBg = Color.parseColor("#F2F2F7")
    val titleInk = Color.parseColor("#111111")

    val column =
      LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(pad, pad, pad, pad)
        gravity = Gravity.CENTER_HORIZONTAL
        setBackgroundColor(Color.WHITE)
      }

    // Eyebrow: map Android Activity → iOS mental model ("Share extension").
    column.addView(
      TextView(this).apply {
        text = parityEyebrow()
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
        setTextColor(iosBlue)
        setTypeface(typeface, android.graphics.Typeface.BOLD)
        setPadding(0, 0, 0, dp(4f))
      },
    )

    column.addView(
      TextView(this).apply {
        text = titleLabel()
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 22f)
        setTextColor(titleInk)
        setTypeface(typeface, android.graphics.Typeface.BOLD)
        setPadding(0, 0, 0, gap)
      },
    )

    column.addView(
      TextView(this).apply {
        text =
          "Same outcome as an iOS Share extension: this sheet is not the main app.\n" +
            "• Save — write to the app group, then close (does not open the host)\n" +
            "• Open main app — explicit launch of the host (parity with openHostApp)\n" +
            "• Cancel — dismiss without saving"
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
        setTextColor(labelMuted)
        setLineSpacing(0f, 1.15f)
        setPadding(0, 0, 0, gap)
      },
    )

    // Shared payload card — what the user just shared into the extension.
    val payloadCard =
      LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(gap, gap, gap, gap)
        background =
          android.graphics.drawable.GradientDrawable().apply {
            setColor(cardBg)
            cornerRadius = dp(10f).toFloat()
          }
      }
    payloadCard.addView(
      TextView(this).apply {
        text = "Shared content"
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 11f)
        setTextColor(labelMuted)
        setTypeface(typeface, android.graphics.Typeface.BOLD)
        setPadding(0, 0, 0, dp(4f))
      },
    )
    payloadCard.addView(
      TextView(this).apply {
        text = summarizeShared()
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
        setTextColor(titleInk)
      },
    )
    payloadCard.addView(
      TextView(this).apply {
        text = "kind:${resolveKindLabel()}"
        setTextSize(TypedValue.COMPLEX_UNIT_SP, 12f)
        setTextColor(labelMuted)
        setPadding(0, dp(6f), 0, 0)
      },
    )
    column.addView(payloadCard)
    payloadCard.layoutParams =
      LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      ).apply { bottomMargin = gap }

    val saveBtn = primaryButton("Save", iosBlue) { saveAndClose() }
    column.addView(
      saveBtn,
      LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      ).apply { bottomMargin = gap },
    )

    val openBtn = secondaryButton("Open main app", iosBlue) { openHost("/") }
    column.addView(
      openBtn,
      LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      ).apply { bottomMargin = gap },
    )

    column.addView(
      Button(this).apply {
        text = "Cancel"
        setAllCaps(false)
        setTextColor(labelMuted)
        background =
          android.graphics.drawable.GradientDrawable().apply {
            setColor(Color.TRANSPARENT)
            cornerRadius = dp(8f).toFloat()
          }
        setOnClickListener { finish() }
        minimumHeight = dp(44f)
      },
      LinearLayout.LayoutParams(
        LinearLayout.LayoutParams.MATCH_PARENT,
        LinearLayout.LayoutParams.WRAP_CONTENT,
      ),
    )

    return ScrollView(this).apply {
      setBackgroundColor(Color.WHITE)
      addView(column)
    }
  }

  private fun roundedFill(
    fill: Int,
    stroke: Int? = null,
  ): android.graphics.drawable.GradientDrawable =
    android.graphics.drawable.GradientDrawable().apply {
      setColor(fill)
      cornerRadius = dp(8f).toFloat()
      if (stroke != null) setStroke(dp(1.5f), stroke)
    }

  private fun primaryButton(
    label: String,
    accent: Int,
    onClick: () -> Unit,
  ): Button =
    Button(this).apply {
      text = label
      setAllCaps(false)
      setTextColor(Color.WHITE)
      background = roundedFill(accent)
      setOnClickListener { onClick() }
      minimumHeight = dp(48f)
    }

  private fun secondaryButton(
    label: String,
    accent: Int,
    onClick: () -> Unit,
  ): Button =
    Button(this).apply {
      text = label
      setAllCaps(false)
      setTextColor(accent)
      background = roundedFill(Color.WHITE, accent)
      setOnClickListener { onClick() }
      minimumHeight = dp(48f)
    }

  protected open fun titleLabel(): String = "Share"

  protected open fun parityEyebrow(): String = "Share extension · Android"

  private fun resolveKindLabel(): String {
    val data = extractSharedMap() ?: return "text"
    val hasImage = (data["images"] as? List<*>)?.isNotEmpty() == true
    val hasText = data["text"] != null
    val hasUrl = data["url"] != null
    return when {
      hasImage && (hasText || hasUrl) -> "mixed"
      hasImage -> "image"
      hasUrl && !hasText -> "url"
      else -> "text"
    }
  }

  private fun summarizeShared(): String {
    val data = extractSharedMap() ?: return "No content"
    val parts = mutableListOf<String>()
    (data["text"] as? String)?.let { parts.add(it) }
    (data["url"] as? String)?.let { parts.add(it) }
    @Suppress("UNCHECKED_CAST")
    val images = data["images"] as? List<String>
    if (images != null && images.isNotEmpty()) {
      parts.add("Images: ${images.size}")
    }
    return parts.joinToString("\n").ifBlank { "No content" }
  }

  private fun extractSharedMap(): Map<String, Any?>? {
    return ExpoTargetsSharedIntent.extract(intent)
  }

  private fun saveAndClose() {
    val data = ExpoTargetsSharedIntent.extract(intent) ?: emptyMap()
    val prefs = getSharedPreferences(appGroup, MODE_PRIVATE)
    // Match JS AppGroupStorage namespacing: "{targetName}:items"
    val itemsKey = "$targetName:items"
    val items = JSONArray()
    val existingJson = prefs.getString(itemsKey, null)
    if (existingJson != null) {
      try {
        val prev = JSONArray(existingJson)
        for (i in 0 until prev.length()) {
          items.put(prev.get(i))
        }
      } catch (_: Exception) {
        // start fresh
      }
    }

    val kind =
      when {
        data["images"] != null && (data["text"] != null || data["url"] != null) -> "mixed"
        data["images"] != null -> "image"
        data["url"] != null && data["text"] == null -> "url"
        else -> "text"
      }

    val content = JSONObject()
    data["text"]?.let { content.put("text", it) }
    data["url"]?.let { content.put("url", it) }
    @Suppress("UNCHECKED_CAST")
    (data["images"] as? List<String>)?.let { imgs ->
      content.put("images", JSONArray(imgs))
      content.put("imageCount", imgs.size)
    }

    val item =
      JSONObject()
        .put("id", System.currentTimeMillis().toString())
        .put(
          "sharedAt",
          java.text.SimpleDateFormat(
            "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
            java.util.Locale.US,
          ).format(java.util.Date()),
        )
        .put("kind", kind)
        .put("content", content)
    items.put(item)

    prefs.edit().putString(itemsKey, items.toString()).commit()

    if (intent.action == Intent.ACTION_PROCESS_TEXT) {
      val resultIntent = Intent()
      val original = intent.getStringExtra(Intent.EXTRA_PROCESS_TEXT) ?: ""
      resultIntent.putExtra(Intent.EXTRA_PROCESS_TEXT, original)
      setResult(RESULT_OK, resultIntent)
    }

    finish()
  }

  private fun openHost(path: String) {
    val launch =
      packageManager.getLaunchIntentForPackage(packageName)
        ?: return
    launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
    launch.putExtra("expo_targets_path", path)
    startActivity(launch)
    finish()
  }
}

open class ExpoTargetsShareActivity : ExpoTargetsTargetActivity() {
  override fun titleLabel(): String = "Share"
  override fun parityEyebrow(): String = "Share extension · Android"
}

open class ExpoTargetsActionActivity : ExpoTargetsTargetActivity() {
  override fun titleLabel(): String = "Action"
  override fun parityEyebrow(): String = "Action extension · Android"
}
