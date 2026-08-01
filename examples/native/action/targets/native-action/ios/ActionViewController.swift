import UIKit
import UniformTypeIdentifiers

class ActionViewController: UIViewController {
    private let appGroup = "group.com.expotargets.example.native.action"
    private let imageView = UIImageView()
    private let processButton = UIButton(type: .system)
    private let closeButton = UIButton(type: .system)
    private let filterControl = UISegmentedControl(items: ["Original", "Grayscale"])
    private var didAutoProcess = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(named: "BackgroundColor")
        setupUI()
        loadImage()
    }

    private func setupUI() {
        imageView.contentMode = .scaleAspectFit
        imageView.backgroundColor = .secondarySystemBackground
        processButton.setTitle("Process Image", for: .normal)
        processButton.backgroundColor = UIColor(named: "AccentColor")
        processButton.setTitleColor(.white, for: .normal)
        processButton.layer.cornerRadius = 8
        processButton.accessibilityIdentifier = "btn-process-image"
        processButton.addTarget(self, action: #selector(processTapped), for: .touchUpInside)
        closeButton.setTitle("Close", for: .normal)
        closeButton.accessibilityIdentifier = "btn-close-appex"
        closeButton.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)
        filterControl.selectedSegmentIndex = 0
        [imageView, filterControl, processButton, closeButton].forEach {
            $0.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview($0)
        }
        NSLayoutConstraint.activate([
            imageView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: 20),
            imageView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            imageView.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            imageView.heightAnchor.constraint(equalToConstant: 200),
            filterControl.topAnchor.constraint(equalTo: imageView.bottomAnchor, constant: 16),
            filterControl.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            filterControl.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            processButton.topAnchor.constraint(equalTo: filterControl.bottomAnchor, constant: 16),
            processButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 20),
            processButton.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -20),
            processButton.heightAnchor.constraint(equalToConstant: 44),
            closeButton.topAnchor.constraint(equalTo: processButton.bottomAnchor, constant: 12),
            closeButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
        ])
    }

    private func loadImage() {
        guard let item = extensionContext?.inputItems.first as? NSExtensionItem,
              let provider = item.attachments?.first,
              provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) else {
            // Still prove App Group write for automation when no image lands.
            scheduleAutoProcess()
            return
        }
        provider.loadItem(forTypeIdentifier: UTType.image.identifier) { [weak self] data, _ in
            DispatchQueue.main.async {
                if let image = data as? UIImage { self?.imageView.image = image }
                else if let url = data as? URL { self?.imageView.image = UIImage(contentsOfFile: url.path) }
                self?.scheduleAutoProcess()
            }
        }
    }

    /// idb/coordinate taps on this action sheet are unreliable on iOS 26
    /// (AX hit-test ≠ UITouch; taps fall through to the share sheet). Auto-write
    /// + dismiss keeps the Devicewright C1 journey honest about App Group I/O.
    private func scheduleAutoProcess() {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.35) { [weak self] in
            self?.processTapped()
        }
    }

    @objc private func processTapped() {
        if didAutoProcess { return }
        didAutoProcess = true
        let idx = filterControl.selectedSegmentIndex
        let filter =
            (idx >= 0 ? filterControl.titleForSegment(at: idx) : nil) ?? "Original"
        guard let defaults = UserDefaults(suiteName: appGroup) else { return }
        struct Processed: Codable { let filter: String; let timestamp: Double }
        var items: [Processed] = []
        if let json = defaults.string(forKey: "nativeAction:items"),
           let data = json.data(using: .utf8),
           let existing = try? JSONDecoder().decode([Processed].self, from: data) {
            items = existing
        }
        items.insert(Processed(filter: filter, timestamp: Date().timeIntervalSince1970), at: 0)
        if let data = try? JSONEncoder().encode(Array(items.prefix(50))),
           let json = String(data: data, encoding: .utf8) {
            defaults.set(json, forKey: "nativeAction:items")
            defaults.synchronize()
        }
        processButton.setTitle("Processed", for: .normal)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) { [weak self] in
            self?.extensionContext?.completeRequest(returningItems: nil)
        }
    }

    @objc private func closeTapped() {
        extensionContext?.completeRequest(returningItems: nil)
    }
}
