import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: UIViewController {
    private let appGroup = "group.com.test.shareextension2"
    private let processingGroup = DispatchGroup()
    private var processingCount = 0
    private var processedItems: [(type: String, content: String)] = []

    private var iconLabel: UILabel!
    private var titleLabel: UILabel!
    private var messageLabel: UILabel!
    private var contentScrollView: UIScrollView!
    private var contentStackView: UIStackView!
    private var saveButton: UIButton!
    private var openAppButton: UIButton!
    private var closeButton: UIButton!
    private var buttonStackView: UIStackView!

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = UIColor(named: "BackgroundColor")

        setupUI()
        processSharedContent()
    }

    private func setupUI() {
        let containerView = UIView()
        containerView.backgroundColor = .systemBackground
        containerView.layer.cornerRadius = 16
        containerView.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(containerView)

        iconLabel = UILabel()
        iconLabel.text = "📤"
        iconLabel.font = .systemFont(ofSize: 50)
        iconLabel.textAlignment = .center
        iconLabel.translatesAutoresizingMaskIntoConstraints = false

        titleLabel = UILabel()
        titleLabel.text = "Sharing Content"
        titleLabel.font = .boldSystemFont(ofSize: 22)
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        messageLabel = UILabel()
        messageLabel.text = "Processing your shared content..."
        messageLabel.font = .systemFont(ofSize: 15)
        messageLabel.textColor = .secondaryLabel
        messageLabel.textAlignment = .center
        messageLabel.numberOfLines = 0
        messageLabel.translatesAutoresizingMaskIntoConstraints = false

        contentScrollView = UIScrollView()
        contentScrollView.backgroundColor = .secondarySystemBackground
        contentScrollView.layer.cornerRadius = 8
        contentScrollView.translatesAutoresizingMaskIntoConstraints = false
        contentScrollView.isHidden = true

        contentStackView = UIStackView()
        contentStackView.axis = .vertical
        contentStackView.spacing = 8
        contentStackView.translatesAutoresizingMaskIntoConstraints = false

        contentScrollView.addSubview(contentStackView)

        saveButton = UIButton(type: .system)
        saveButton.setTitle("Save to App", for: .normal)
        saveButton.titleLabel?.font = .boldSystemFont(ofSize: 16)
        saveButton.backgroundColor = UIColor(named: "AccentColor")
        saveButton.setTitleColor(.white, for: .normal)
        saveButton.layer.cornerRadius = 10
        saveButton.translatesAutoresizingMaskIntoConstraints = false
        saveButton.addTarget(self, action: #selector(saveToAppTapped), for: .touchUpInside)
        saveButton.isHidden = true

        openAppButton = UIButton(type: .system)
        openAppButton.setTitle("Open App", for: .normal)
        openAppButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .medium)
        openAppButton.backgroundColor = .systemGray5
        openAppButton.setTitleColor(UIColor(named: "AccentColor"), for: .normal)
        openAppButton.layer.cornerRadius = 10
        openAppButton.translatesAutoresizingMaskIntoConstraints = false
        openAppButton.addTarget(self, action: #selector(openAppTapped), for: .touchUpInside)
        openAppButton.isHidden = true

        closeButton = UIButton(type: .system)
        closeButton.setTitle("Close", for: .normal)
        closeButton.titleLabel?.font = .systemFont(ofSize: 16)
        closeButton.setTitleColor(.secondaryLabel, for: .normal)
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        closeButton.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        closeButton.isHidden = true

        buttonStackView = UIStackView(arrangedSubviews: [saveButton, openAppButton])
        buttonStackView.axis = .vertical
        buttonStackView.spacing = 12
        buttonStackView.translatesAutoresizingMaskIntoConstraints = false

        containerView.addSubview(iconLabel)
        containerView.addSubview(titleLabel)
        containerView.addSubview(messageLabel)
        containerView.addSubview(contentScrollView)
        containerView.addSubview(buttonStackView)
        containerView.addSubview(closeButton)

        NSLayoutConstraint.activate([
            containerView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            containerView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            containerView.widthAnchor.constraint(equalToConstant: 340),

            iconLabel.topAnchor.constraint(equalTo: containerView.topAnchor, constant: 30),
            iconLabel.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),

            titleLabel.topAnchor.constraint(equalTo: iconLabel.bottomAnchor, constant: 12),
            titleLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 20),
            titleLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -20),

            messageLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 6),
            messageLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 20),
            messageLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -20),

            contentScrollView.topAnchor.constraint(equalTo: messageLabel.bottomAnchor, constant: 16),
            contentScrollView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 20),
            contentScrollView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -20),
            contentScrollView.heightAnchor.constraint(equalToConstant: 150),

            contentStackView.topAnchor.constraint(equalTo: contentScrollView.topAnchor, constant: 12),
            contentStackView.leadingAnchor.constraint(equalTo: contentScrollView.leadingAnchor, constant: 12),
            contentStackView.trailingAnchor.constraint(equalTo: contentScrollView.trailingAnchor, constant: -12),
            contentStackView.bottomAnchor.constraint(equalTo: contentScrollView.bottomAnchor, constant: -12),
            contentStackView.widthAnchor.constraint(equalTo: contentScrollView.widthAnchor, constant: -24),

            buttonStackView.topAnchor.constraint(equalTo: contentScrollView.bottomAnchor, constant: 20),
            buttonStackView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 20),
            buttonStackView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -20),

            saveButton.heightAnchor.constraint(equalToConstant: 48),
            openAppButton.heightAnchor.constraint(equalToConstant: 48),

            closeButton.topAnchor.constraint(equalTo: buttonStackView.bottomAnchor, constant: 12),
            closeButton.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),
            closeButton.bottomAnchor.constraint(equalTo: containerView.bottomAnchor, constant: -24),
            closeButton.heightAnchor.constraint(equalToConstant: 32),
        ])
    }

    private func processSharedContent() {
        guard let extensionContext = extensionContext,
              let items = extensionContext.inputItems as? [NSExtensionItem] else {
            handleNoContent()
            return
        }

        for item in items {
            guard let attachments = item.attachments else { continue }

            for attachment in attachments {
                processingGroup.enter()
                processingCount += 1

                if attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, error in
                        defer { self?.processingGroup.leave() }

                        if let error = error {
                            print("Error loading image: \(error)")
                            return
                        }

                        if let url = data as? URL {
                            self?.collectSharedContent(type: "image", content: url.absoluteString)
                        } else if data is UIImage {
                            self?.collectSharedContent(type: "image", content: "Image data received")
                        }
                    }
                } else if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, error in
                        defer { self?.processingGroup.leave() }

                        if let error = error {
                            print("Error loading URL: \(error)")
                            return
                        }

                        if let url = data as? URL {
                            self?.collectSharedContent(type: "url", content: url.absoluteString)
                        }
                    }
                } else if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, error in
                        defer { self?.processingGroup.leave() }

                        if let error = error {
                            print("Error loading text: \(error)")
                            return
                        }

                        if let text = data as? String {
                            self?.collectSharedContent(type: "text", content: text)
                        } else if let data = data as? Data, let text = String(data: data, encoding: .utf8) {
                            self?.collectSharedContent(type: "text", content: text)
                        }
                    }
                } else {
                    processingGroup.leave()
                }
            }
        }

        processingGroup.notify(queue: .main) { [weak self] in
            self?.handleProcessingComplete()
        }
    }

    private func handleNoContent() {
        DispatchQueue.main.async { [weak self] in
            self?.iconLabel.text = "⚠️"
            self?.messageLabel.text = "No content to share"
            self?.closeButton.isHidden = false
        }
    }

    private func handleProcessingComplete() {
        if !processedItems.isEmpty {
            iconLabel.text = "✅"
            titleLabel.text = "Content Received"
            messageLabel.text = "Review the items below and choose an action"

            displayProcessedContent()

            contentScrollView.isHidden = false
            saveButton.isHidden = false
            openAppButton.isHidden = false
            closeButton.isHidden = false
        } else {
            iconLabel.text = "⚠️"
            titleLabel.text = "Nothing to Share"
            messageLabel.text = "No content could be processed"
            closeButton.isHidden = false
        }
    }

    private func displayProcessedContent() {
        contentStackView.arrangedSubviews.forEach { $0.removeFromSuperview() }

        for (index, item) in processedItems.enumerated() {
            let itemView = createItemView(type: item.type, content: item.content, index: index + 1)
            contentStackView.addArrangedSubview(itemView)
        }
    }

    private func createItemView(type: String, content: String, index: Int) -> UIView {
        let container = UIView()
        container.backgroundColor = .systemBackground
        container.layer.cornerRadius = 6
        container.translatesAutoresizingMaskIntoConstraints = false

        let typeIcon: String
        switch type {
        case "image": typeIcon = "🖼️"
        case "url": typeIcon = "🔗"
        case "text": typeIcon = "📝"
        default: typeIcon = "📄"
        }

        let typeLabel = UILabel()
        typeLabel.text = "\(typeIcon) \(type.capitalized)"
        typeLabel.font = .boldSystemFont(ofSize: 13)
        typeLabel.textColor = .label
        typeLabel.translatesAutoresizingMaskIntoConstraints = false

        let contentLabel = UILabel()
        contentLabel.text = content
        contentLabel.font = .systemFont(ofSize: 12)
        contentLabel.textColor = .secondaryLabel
        contentLabel.numberOfLines = 3
        contentLabel.translatesAutoresizingMaskIntoConstraints = false

        container.addSubview(typeLabel)
        container.addSubview(contentLabel)

        NSLayoutConstraint.activate([
            container.heightAnchor.constraint(greaterThanOrEqualToConstant: 60),

            typeLabel.topAnchor.constraint(equalTo: container.topAnchor, constant: 8),
            typeLabel.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 10),
            typeLabel.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -10),

            contentLabel.topAnchor.constraint(equalTo: typeLabel.bottomAnchor, constant: 4),
            contentLabel.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 10),
            contentLabel.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -10),
            contentLabel.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -8),
        ])

        return container
    }

    private func collectSharedContent(type: String, content: String) {
        DispatchQueue.main.async { [weak self] in
            self?.processedItems.append((type: type, content: content))
        }
    }

    private func saveToUserDefaults() {
        guard let defaults = UserDefaults(suiteName: appGroup) else { return }

        struct SharedItem: Codable {
            let type: String
            let content: String
            let timestamp: Double
        }

        var items: [SharedItem] = []
        if let jsonString = defaults.string(forKey: "items"),
           let jsonData = jsonString.data(using: .utf8),
           let existingItems = try? JSONDecoder().decode([SharedItem].self, from: jsonData) {
            items = existingItems
        }

        for processedItem in processedItems {
            let newItem = SharedItem(
                type: processedItem.type,
                content: processedItem.content,
                timestamp: Date().timeIntervalSince1970
            )
            items.insert(newItem, at: 0)
        }
        items = Array(items.prefix(50))

        if let jsonData = try? JSONEncoder().encode(items),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            defaults.set(jsonString, forKey: "items")
            defaults.synchronize()
        }
    }

    @objc private func saveToAppTapped() {
        saveToUserDefaults()

        saveButton.setTitle("✓ Saved", for: .normal)
        saveButton.isEnabled = false
        saveButton.backgroundColor = .systemGreen

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.saveButton.setTitle("Saved to App", for: .normal)
        }
    }

    @objc private func openAppTapped() {
        openAppButton.isEnabled = false
        openAppButton.setTitle("Opening...", for: .normal)

        guard let urlScheme = URL(string: "shareextension://open") else {
            showAlert(message: "Invalid URL scheme configuration")
            resetOpenButton()
            return
        }

        if openURL(urlScheme) {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
                self?.extensionContext?.completeRequest(returningItems: nil)
            }
        } else {
            resetOpenButton()
            showAlert(message: "Unable to open the main app. This feature may not work in the simulator. Please try on a physical device.")
        }
    }

    @discardableResult
    private func openURL(_ url: URL) -> Bool {
        var responder: UIResponder? = self

        while responder != nil {
            if let application = responder as? UIApplication {
                application.open(url, options: [:], completionHandler: nil)
                return true
            }
            responder = responder?.next
        }

        return false
    }

    private func resetOpenButton() {
        openAppButton.isEnabled = true
        openAppButton.setTitle("Open App", for: .normal)
    }

    private func closeAfterDelay() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil)
        }
    }

    private func showAlert(message: String) {
        let alert = UIAlertController(title: nil, message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "OK", style: .default))
        present(alert, animated: true)
    }

    @objc private func closeTapped() {
        extensionContext?.completeRequest(returningItems: nil)
    }
}

