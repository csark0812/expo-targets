package expo.modules.targets.system

import android.content.Intent
import android.net.VpnService
import android.os.ParcelFileDescriptor

/**
 * Fail-closed VpnService (Wave 3c network-packet-tunnel).
 * Does not establish a tunnel without explicit VpnService.prepare consent.
 * User VPN permission dialog is leftover (Settings/Play taxonomy).
 */
open class ExpoTargetsVpnService : VpnService() {
  private var iface: ParcelFileDescriptor? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    // Fail closed: never builder.establish() from a cold start without prepare.
    stopSelf(startId)
    return START_NOT_STICKY
  }

  override fun onDestroy() {
    iface?.close()
    iface = null
    super.onDestroy()
  }

  override fun onRevoke() {
    iface?.close()
    iface = null
    stopSelf()
  }
}
