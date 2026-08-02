import PassKit

class PassProvider: PKIssuerProvisioningExtensionHandler {
  override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {
    let status = PKIssuerProvisioningExtensionStatus()
    status.passEntriesAvailable = false
    status.remotePassEntriesAvailable = false
    status.requiresAuthentication = false
    completion(status)
  }
}
