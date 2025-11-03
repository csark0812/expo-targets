import UIKit
import MobileCoreServices
import UniformTypeIdentifiers

class ActionViewController: UIViewController {
    private let appGroup = "group.com.test.nativeextensionsshowcase"
    private var imageUrl: URL?

    private var imageView: UIImageView!
    private var titleLabel: UILabel!
    private var filterSegmentedControl: UISegmentedControl!
    private var processButton: UIButton!
    private var closeButton: UIButton!

    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = UIColor(named: "BackgroundColor")

        setupUI()
        loadImage()
    }

    private func setupUI() {
        let containerView = UIView()
        containerView.backgroundColor = .systemBackground
        containerView.layer.cornerRadius = 16
        containerView.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(containerView)

        titleLabel = UILabel()
        titleLabel.text = "Native Action Extension"
        titleLabel.font = .boldSystemFont(ofSize: 22)
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        imageView = UIImageView()
        imageView.contentMode = .scaleAspectFit
        imageView.backgroundColor = .secondarySystemBackground
        imageView.layer.cornerRadius = 12
        imageView.clipsToBounds = true
        imageView.translatesAutoresizingMaskIntoConstraints = false

        filterSegmentedControl = UISegmentedControl(items: ["Original", "Grayscale", "Sepia", "Invert"])
        filterSegmentedControl.selectedSegmentIndex = 0
        filterSegmentedControl.translatesAutoresizingMaskIntoConstraints = false

        processButton = UIButton(type: .system)
        processButton.setTitle("Process Image", for: .normal)
        processButton.titleLabel?.font = .boldSystemFont(ofSize: 16)
        processButton.backgroundColor = UIColor(named: "AccentColor")
        processButton.setTitleColor(.white, for: .normal)
        processButton.layer.cornerRadius = 10
        processButton.translatesAutoresizingMaskIntoConstraints = false
        processButton.addTarget(self, action: #selector(processImageTapped), for: .touchUpInside)

        closeButton = UIButton(type: .system)
        closeButton.setTitle("Close", for: .normal)
        closeButton.titleLabel?.font = .systemFont(ofSize: 16)
        closeButton.setTitleColor(.secondaryLabel, for: .normal)
        closeButton.translatesAutoresizingMaskIntoConstraints = false
        closeButton.addTarget(self, action: #selector(closeTapped), for: .touchUpInside)

        containerView.addSubview(titleLabel)
        containerView.addSubview(imageView)
        containerView.addSubview(filterSegmentedControl)
        containerView.addSubview(processButton)
        containerView.addSubview(closeButton)

        NSLayoutConstraint.activate([
            containerView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            containerView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            containerView.widthAnchor.constraint(equalToConstant: 340),

            titleLabel.topAnchor.constraint(equalTo: containerView.topAnchor, constant: 30),
            titleLabel.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 20),
            titleLabel.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -20),

            imageView.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 20),
            imageView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 20),
            imageView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -20),
            imageView.heightAnchor.constraint(equalToConstant: 200),

            filterSegmentedControl.topAnchor.constraint(equalTo: imageView.bottomAnchor, constant: 20),
            filterSegmentedControl.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 20),
            filterSegmentedControl.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -20),

            processButton.topAnchor.constraint(equalTo: filterSegmentedControl.bottomAnchor, constant: 20),
            processButton.leadingAnchor.constraint(equalTo: containerView.leadingAnchor, constant: 20),
            processButton.trailingAnchor.constraint(equalTo: containerView.trailingAnchor, constant: -20),
            processButton.heightAnchor.constraint(equalToConstant: 48),

            closeButton.topAnchor.constraint(equalTo: processButton.bottomAnchor, constant: 12),
            closeButton.centerXAnchor.constraint(equalTo: containerView.centerXAnchor),
            closeButton.bottomAnchor.constraint(equalTo: containerView.bottomAnchor, constant: -24),
            closeButton.heightAnchor.constraint(equalToConstant: 32),
        ])
    }

    private func loadImage() {
        guard let extensionContext = extensionContext,
              let inputItem = extensionContext.inputItems.first as? NSExtensionItem,
              let attachment = inputItem.attachments?.first,
              attachment.hasItemConformingToTypeIdentifier(UTType.image.identifier) else {
            showError("No image found")
            return
        }

        attachment.loadItem(forTypeIdentifier: UTType.image.identifier, options: nil) { [weak self] data, error in
            DispatchQueue.main.async {
                if let error = error {
                    self?.showError("Error loading image: \(error.localizedDescription)")
                    return
                }

                if let url = data as? URL {
                    self?.imageUrl = url
                    if let image = UIImage(contentsOfFile: url.path) {
                        self?.imageView.image = image
                    }
                } else if let image = data as? UIImage {
                    self?.imageView.image = image
                }
            }
        }
    }

    @objc private func processImageTapped() {
        guard let image = imageView.image else { return }

        let filterIndex = filterSegmentedControl.selectedSegmentIndex
        let filterName = filterSegmentedControl.titleForSegment(at: filterIndex) ?? "Original"

        // Save processed image info
        saveProcessedImage(filter: filterName)

        processButton.setTitle("✓ Processed", for: .normal)
        processButton.isEnabled = false
        processButton.backgroundColor = .systemGreen

        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            self?.processButton.setTitle("Processed", for: .normal)
        }
    }

    private func saveProcessedImage(filter: String) {
        guard let defaults = UserDefaults(suiteName: appGroup) else { return }

        struct ProcessedImage: Codable {
            let filter: String
            let timestamp: Double
            let imageUrl: String?
        }

        var items: [ProcessedImage] = []
        if let jsonString = defaults.string(forKey: "nativeAction:items"),
           let jsonData = jsonString.data(using: .utf8),
           let existingItems = try? JSONDecoder().decode([ProcessedImage].self, from: jsonData) {
            items = existingItems
        }

        let newItem = ProcessedImage(
            filter: filter,
            timestamp: Date().timeIntervalSince1970,
            imageUrl: imageUrl?.absoluteString
        )
        items.insert(newItem, at: 0)
        items = Array(items.prefix(50))

        if let jsonData = try? JSONEncoder().encode(items),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            defaults.set(jsonString, forKey: "nativeAction:items")
            defaults.synchronize()
        }
    }

    private func showError(_ message: String) {
        titleLabel.text = "Error"
        titleLabel.textColor = .systemRed

        let errorLabel = UILabel()
        errorLabel.text = message
        errorLabel.font = .systemFont(ofSize: 14)
        errorLabel.textColor = .secondaryLabel
        errorLabel.textAlignment = .center
        errorLabel.numberOfLines = 0
        errorLabel.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(errorLabel)
        NSLayoutConstraint.activate([
            errorLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            errorLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            errorLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 40),
            errorLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -40),
        ])
    }

    @objc private func closeTapped() {
        extensionContext?.completeRequest(returningItems: nil)
    }
}

