import UIKit
import PassKit

class AuthorizationViewController: UIViewController, PKIssuerProvisioningExtensionAuthorizationProviding {

    var completionHandler: ((PKIssuerProvisioningExtensionAuthorizationResult) -> Void)?

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }

    private func setupUI() {
        view.backgroundColor = .systemBackground

        let titleLabel = UILabel()
        titleLabel.text = "Authenticate"
        titleLabel.font = .boldSystemFont(ofSize: 24)
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        let subtitleLabel = UILabel()
        subtitleLabel.text = "Verify your identity to add this card"
        subtitleLabel.font = .systemFont(ofSize: 16)
        subtitleLabel.textColor = .secondaryLabel
        subtitleLabel.textAlignment = .center
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false

        let authenticateButton = UIButton(type: .system)
        authenticateButton.setTitle("Authenticate", for: .normal)
        authenticateButton.titleLabel?.font = .boldSystemFont(ofSize: 18)
        authenticateButton.addTarget(self, action: #selector(authenticateTapped), for: .touchUpInside)
        authenticateButton.translatesAutoresizingMaskIntoConstraints = false

        let cancelButton = UIButton(type: .system)
        cancelButton.setTitle("Cancel", for: .normal)
        cancelButton.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        cancelButton.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(titleLabel)
        view.addSubview(subtitleLabel)
        view.addSubview(authenticateButton)
        view.addSubview(cancelButton)

        NSLayoutConstraint.activate([
            titleLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            titleLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -60),
            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            subtitleLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            authenticateButton.topAnchor.constraint(equalTo: subtitleLabel.bottomAnchor, constant: 32),
            authenticateButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            cancelButton.topAnchor.constraint(equalTo: authenticateButton.bottomAnchor, constant: 16),
            cancelButton.centerXAnchor.constraint(equalTo: view.centerXAnchor)
        ])
    }

    @objc private func authenticateTapped() {
        completionHandler?(.authorized)
    }

    @objc private func cancelTapped() {
        completionHandler?(.canceled)
    }
}
