package expo.modules.targets.system

import android.os.CancellationSignal
import android.service.autofill.AutofillService
import android.service.autofill.FillCallback
import android.service.autofill.FillRequest
import android.service.autofill.SaveCallback
import android.service.autofill.SaveRequest

/**
 * Minimal AutofillService (Wave 3a credentials-provider).
 * Settings → Autofill service picker is leftover (Play/Settings taxonomy).
 * BeginGetCredential / CredentialProviderService can deepen later beside Autofill.
 */
open class ExpoTargetsAutofillService : AutofillService() {
  override fun onFillRequest(
    request: FillRequest,
    cancellationSignal: CancellationSignal,
    callback: FillCallback,
  ) {
    // Empty response — registered + fails closed without preferred-service selection.
    callback.onSuccess(null)
  }

  override fun onSaveRequest(request: SaveRequest, callback: SaveCallback) {
    callback.onSuccess()
  }
}
