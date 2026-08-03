import UIKit
import UniformTypeIdentifiers

class ShareViewController: UIViewController {
    private let appGroup = "group.com.expotargets.example.native.share"
    private var items: [(type: String, content: String)] = []

    private let titleLabel = UILabel()
    private let detailLabel = UILabel()
    private let saveButton = UIButton(type: .system)
    private let closeButton = UIButton(type: .system)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(named: "BackgroundColor")
        setupUI()
        loadSharedContent()
    }

    private func setupUI() {
        titleLabel.text = "Native Share"
        titleLabel.font = .boldSystemFont(ofSize: 20)
        titleLabel.textAlignment = .center
        detailLabel.numberOfLines = 0
        detailLabel.textAlignment = .center
        detailLabel.textColor = .secondaryLabel
        saveButton.setTitle("Save to App", for: .normal)
        saveButton.backgroundColor = UIColor(named: "AccentColor")
        saveButton.setTitleColor(.white, for: .normal)
        saveButton.layer.cornerRadius = 8
        saveButton.addTarget(self, action: #selector(saveTapped), for: .touchUpInside)
        closeButton.setTitle("Close", for: .normal)
        closeButton.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        [titleLabel, detailLabel, saveButton, closeButton].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview($0)
        }
        NSLayoutConstraint.activate([
            titleLabel.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 24),
            titleLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            titleLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            detailLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 12),
            detailLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            detailLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            saveButton.topAnchor.constraint(equalTo: detailLabel.bottomAnchor, constant: 24),
            saveButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            saveButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            saveButton.heightAnchor.constraint(equalToConstant: 44),
            closeButton.topAnchor.constraint(equalTo: saveButton.bottomAnchor, constant: 12),
            closeButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
        ])
    }

    private func loadSharedContent() {
        guard let context = extensionContext,
              let inputItems = context.inputItems as? [NSExtensionItem] else {
            detailLabel.text = "No content"
            return
        }
        let group = DispatchGroup()
        for item in inputItems {
            for provider in item.attachments ?? [] {
                if provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        var summary = "image"
                        if let url = data as? URL {
                            summary = url.lastPathComponent
                        } else if data is UIImage {
                            summary = "UIImage"
                        }
                        DispatchQueue.main.async {
                            self?.items.append((type: "image", content: summary))
                        }
                    }
                } else if provider.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.plainText.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        if let text = data as? String {
                            DispatchQueue.main.async { self?.items.append((type: "text", content: text)) }
                        }
                    }
                } else if provider.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    group.enter()
                    provider.loadItem(forTypeIdentifier: UTType.url.identifier) { [weak self] data, _ in
                        defer { group.leave() }
                        if let url = data as? URL {
                            DispatchQueue.main.async { self?.items.append((type: "url", content: url.absoluteString)) }
                        }
                    }
                }
            }
        }
        group.notify(queue: .main) { [weak self] in
            guard let self else { return }
            let multi = self.items.count > 1 ? " multi:\(self.items.count)" : ""
            detailLabel.text = items.isEmpty
                ? "No content"
                : items.map { "\($0.type):\($0.content)" }.joined(separator: "\n") + multi
        }
    }

    @objc private func saveTapped() {
        guard let defaults = UserDefaults(suiteName: appGroup) else { return }
        struct SharedItem: Codable {
            let type: String
            let content: String
            let timestamp: Double
            let itemCount: Int
        }
        var saved: [SharedItem] = []
        if let json = defaults.string(forKey: "nativeShare:items"),
           let data = json.data(using: .utf8),
           let existing = try? JSONDecoder().decode([SharedItem].self, from: data) {
            saved = existing
        }
        let count = max(items.count, 1)
        for item in items {
            saved.insert(
                SharedItem(
                    type: item.type,
                    content: item.content,
                    timestamp: Date().timeIntervalSince1970,
                    itemCount: count
                ),
                at: 0
            )
        }
        if let data = try? JSONEncoder().encode(Array(saved.prefix(50))),
           let json = String(data: data, encoding: .utf8) {
            defaults.set(json, forKey: "nativeShare:items")
        }
        saveButton.setTitle("Saved", for: .normal)
    }

    @objc private func closeTapped() {
        extensionContext?.completeRequest(returningItems: nil)
    }
}
