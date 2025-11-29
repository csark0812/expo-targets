import PassKit
import UIKit

class PassProvider: PKIssuerProvisioningExtensionHandler {

    override func status() async -> PKIssuerProvisioningExtensionStatus {
        let status = PKIssuerProvisioningExtensionStatus()
        status.requiresAuthentication = true
        status.passEntriesAvailable = true
        status.remotePassEntriesAvailable = true
        return status
    }

    override func passEntries() async -> [PKIssuerProvisioningExtensionPassEntry] {
        guard let cardArt = UIImage(named: "CardArt")?.cgImage,
              let config = createAddRequestConfiguration() else {
            return []
        }

        guard let entry = PKIssuerProvisioningExtensionPaymentPassEntry(
            identifier: "combined-card-identifier",
            title: "Combined Card",
            art: cardArt,
            addRequestConfiguration: config
        ) else {
            return []
        }

        return [entry]
    }

    override func remotePassEntries() async -> [PKIssuerProvisioningExtensionPassEntry] {
        return await passEntries()
    }

    override func generateAddPaymentPassRequestForPassEntryWithIdentifier(
        _ identifier: String,
        configuration: PKAddPaymentPassRequestConfiguration,
        certificateChain certificates: [Data],
        nonce: Data,
        nonceSignature: Data
    ) async -> PKAddPaymentPassRequest? {
        let request = PKAddPaymentPassRequest()
        return request
    }

    private func createAddRequestConfiguration() -> PKAddPaymentPassRequestConfiguration? {
        guard let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2) else {
            return nil
        }

        config.cardholderName = "Cardholder Name"
        config.primaryAccountSuffix = "1234"
        config.localizedDescription = "Combined Wallet Card"
        config.primaryAccountIdentifier = ""
        config.paymentNetwork = .visa

        return config
    }
}

