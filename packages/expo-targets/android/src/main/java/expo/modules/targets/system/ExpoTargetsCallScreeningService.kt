package expo.modules.targets.system

import android.content.ComponentName
import android.content.Context
import android.telecom.Call
import android.telecom.CallScreeningService

/**
 * CallScreeningService dual for call-directory (Wave 3b).
 * Role grant / telephony Settings is leftover. Host can seed blocked numbers
 * in SharedPreferences suite (appGroup) under key `blocked_numbers` (CSV).
 */
open class ExpoTargetsCallScreeningService : CallScreeningService() {
  override fun onScreenCall(callDetails: Call.Details) {
    val number = callDetails.handle?.schemeSpecificPart ?: ""
    val blocked = loadBlocked().any { number.endsWith(it) || number == it }
    val response =
      CallResponse.Builder()
        .setDisallowCall(blocked)
        .setRejectCall(blocked)
        .setSkipCallLog(false)
        .setSkipNotification(false)
        .build()
    respondToCall(callDetails, response)
  }

  private fun loadBlocked(): List<String> {
    val suite =
      try {
        val cn = ComponentName(this, javaClass)
        val info =
          packageManager.getServiceInfo(
            cn,
            android.content.pm.PackageManager.GET_META_DATA,
          )
        info.metaData?.getString("expo.targets.APP_GROUP")
      } catch (_: Exception) {
        null
      } ?: "group.$packageName"

    val raw =
      getSharedPreferences(suite, Context.MODE_PRIVATE)
        .getString("blocked_numbers", "")
        ?: ""
    return raw.split(',').map { it.trim() }.filter { it.isNotEmpty() }
  }
}
