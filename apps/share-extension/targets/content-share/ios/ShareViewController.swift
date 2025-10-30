import UIKit
import Social
import MobileCoreServices
import UniformTypeIdentifiers

class ShareViewController: UIViewController {
    private let appGroup = "group.com.test.shareextension"
    private let processingGroup = DispatchGroup()
    private var processingCount = 0
    private var hasProcessedContent = false

    private var messageLabel: UILabel!
    private var iconLabel: UILabel!
    private var doneButton: UIButton!

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
        iconLabel.font = .systemFont(ofSize: 60)
        iconLabel.textAlignment = .center
        iconLabel.translatesAutoresizingMaskIntoConstraints = false

        let titleLabel = UILabel()
        titleLabel.text = "Sharing Content"
        titleLabel.font = .boldSystemFont(ofSize: 24)
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        messageLabel = UILabel()
        messageLabel.text = "Processing your shared content..."
        messageLabel.font = .systemFont(ofSize: 16)
        messageLabel.textColor = .secondaryLabel
        messageLabel.textAlignment = .center
        messageLabel.numberOfLines = 0
        messageLabel.translatesAutoresizingMaskIntoConstraints = false

        doneButton = UIButton(type: .system)
        doneButton.setTitle("Done", for: .normal)
        doneButton.titleLabel?.font = .boldSystemFont(ofSize: 17)
        doneButton.backgroundColor = UIColor(named: "AccentColor")
        doneButton.setTitleColor(.white, for: .normal)
        doneButton.layer.cornerRadius = 12
        doneButton.translatesAutoresizingMaskIntoConstraints = false
        doneButton.addTarget(self, action: #selector(doneTapped), for: .touchUpInside)

        containerView.addSubview(iconLabel)
        containerView.addSubview(titleLabel)
        containerView.addSubview(messageLabel)
        containerView.addSubview(doneButton)

        NSLayoutConstraint.activate([
            containerView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            containerView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            containerView.widthAnchor.constraint(equalToConstant: 300),

            iconLabel.topAnchor.constraint(equalTo: containerView.topAnchor, constant: 40),
            iconLabel.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),

            titleLabel.topAnchor.constraint(equalTo: iconLabel.bottomAnchor, constant: 16),
            titleLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 20),
            titleLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -20),

            messageLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            messageLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 20),
            messageLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -20),

            doneButton.topAnchor.constraint(equalTo: messageLabel.bottomAnchor, constant: 32),
            doneButton.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 20),
            doneButton.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -20),
            doneButton.bottomAnchor.constraint(equalTo: containerView.bottomAnchor, constant: -40),
            doneButton.heightAnchor.constraint(equalToConstant: 50),
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
                            self?.saveSharedContent(type: "image", content: url.absoluteString)
                        } else if let image = data as? UIImage {
                            self?.saveSharedContent(type: "image", content: "Image data received")
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
                            self?.saveSharedContent(type: "url", content: url.absoluteString)
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
                            self?.saveSharedContent(type: "text", content: text)
                        } else if let data = data as? Data, let text = String(data: data, encoding: .utf8) {
                            self?.saveSharedContent(type: "text", content: text)
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
            self?.doneButton.isEnabled = true
        }
    }

    private func handleProcessingComplete() {
        if hasProcessedContent {
            iconLabel.text = "✅"
            messageLabel.text = "Content shared successfully!"
        } else {
            iconLabel.text = "⚠️"
            messageLabel.text = "No content could be processed"
        }

        doneButton.isEnabled = true

        DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) { [weak self] in
            self?.doneTapped()
        }
    }

    private func saveSharedContent(type: String, content: String) {
        guard let defaults = UserDefaults(suiteName: appGroup) else { return }

        struct SharedItem: Codable {
            let type: String
            let content: String
            let timestamp: Double
        }

        struct SharedItemsData: Codable {
            let items: [SharedItem]
        }

        var items: [SharedItem] = []
        if let jsonString = defaults.string(forKey: "ContentShare:data"),
           let jsonData = jsonString.data(using: .utf8),
           let existingData = try? JSONDecoder().decode(SharedItemsData.self, from: jsonData) {
            items = existingData.items
        }

        let newItem = SharedItem(
            type: type,
            content: content,
            timestamp: Date().timeIntervalSince1970
        )
        items.insert(newItem, at: 0)
        items = Array(items.prefix(50))

        let data = SharedItemsData(items: items)
        if let jsonData = try? JSONEncoder().encode(data),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            defaults.set(jsonString, forKey: "ContentShare:data")
            defaults.synchronize()
            hasProcessedContent = true
        }
    }

    @objc private func doneTapped() {
        extensionContext?.completeRequest(returningItems: nil)
    }
}

