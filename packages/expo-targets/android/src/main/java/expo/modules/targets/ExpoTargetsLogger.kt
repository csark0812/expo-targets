package expo.modules.targets

import android.content.Context
import android.content.pm.ApplicationInfo
import android.util.Log

/**
 * Debug logger for expo-targets
 *
 * Logging is enabled when:
 * 1. The app is built in debug mode (ApplicationInfo.FLAG_DEBUGGABLE)
 * 2. Or explicitly enabled via setDebugEnabled(true)
 *
 * Usage in logcat: `adb logcat -s ExpoTargets:*`
 */
object ExpoTargetsLogger {
    private const val TAG = "ExpoTargets"

    @Volatile
    private var debugOverride: Boolean? = null

    @Volatile
    private var isDebuggable: Boolean? = null

    /**
     * Explicitly enable or disable debug logging
     */
    fun setDebugEnabled(enabled: Boolean) {
        debugOverride = enabled
    }

    /**
     * Initialize logger with context (checks if app is debuggable)
     */
    fun init(context: Context) {
        if (isDebuggable == null) {
            isDebuggable = (context.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
        }
    }

    /**
     * Check if debug logging is enabled
     */
    fun isEnabled(): Boolean {
        return debugOverride ?: isDebuggable ?: true
    }

    fun d(message: String) {
        if (isEnabled()) {
            Log.d(TAG, message)
        }
    }

    fun d(component: String, message: String) {
        if (isEnabled()) {
            Log.d(TAG, "[$component] $message")
        }
    }

    fun i(message: String) {
        if (isEnabled()) {
            Log.i(TAG, message)
        }
    }

    fun i(component: String, message: String) {
        if (isEnabled()) {
            Log.i(TAG, "[$component] $message")
        }
    }

    fun w(message: String) {
        // Warnings always logged
        Log.w(TAG, message)
    }

    fun w(component: String, message: String) {
        Log.w(TAG, "[$component] $message")
    }

    fun e(message: String, throwable: Throwable? = null) {
        // Errors always logged
        if (throwable != null) {
            Log.e(TAG, message, throwable)
        } else {
            Log.e(TAG, message)
        }
    }

    fun e(component: String, message: String, throwable: Throwable? = null) {
        if (throwable != null) {
            Log.e(TAG, "[$component] $message", throwable)
        } else {
            Log.e(TAG, "[$component] $message")
        }
    }
}

