import UIKit
import UserNotifications
import UserNotificationsUI

class NotificationViewController: UIViewController, UNNotificationContentExtension {

    private let titleLabel = UILabel()
    private let bodyLabel = UILabel()
    private let timestampLabel = UILabel()
    private let iconImageView = UIImageView()

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }

    private func setupUI() {
        view.backgroundColor = UIColor.systemBackground

        // Icon
        iconImageView.translatesAutoresizingMaskIntoConstraints = false
        iconImageView.contentMode = .scaleAspectFit
        iconImageView.image = UIImage(systemName: "bell.badge.fill")
        iconImageView.tintColor = .systemBlue
        view.addSubview(iconImageView)

        // Title
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.font = UIFont.boldSystemFont(ofSize: 18)
        titleLabel.textColor = .label
        titleLabel.numberOfLines = 0
        view.addSubview(titleLabel)

        // Body
        bodyLabel.translatesAutoresizingMaskIntoConstraints = false
        bodyLabel.font = UIFont.systemFont(ofSize: 14)
        bodyLabel.textColor = .secondaryLabel
        bodyLabel.numberOfLines = 0
        view.addSubview(bodyLabel)

        // Timestamp
        timestampLabel.translatesAutoresizingMaskIntoConstraints = false
        timestampLabel.font = UIFont.systemFont(ofSize: 12)
        timestampLabel.textColor = .tertiaryLabel
        view.addSubview(timestampLabel)

        NSLayoutConstraint.activate([
            iconImageView.topAnchor.constraint(equalTo: view.topAnchor, constant: 16),
            iconImageView.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
            iconImageView.widthAnchor.constraint(equalToConstant: 40),
            iconImageView.heightAnchor.constraint(equalToConstant: 40),

            titleLabel.topAnchor.constraint(equalTo: view.topAnchor, constant: 16),
            titleLabel.leadingAnchor.constraint(equalTo: iconImageView.trailingAnchor, constant: 12),
            titleLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),

            bodyLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            bodyLabel.leadingAnchor.constraint(equalTo: iconImageView.trailingAnchor, constant: 12),
            bodyLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),

            timestampLabel.topAnchor.constraint(equalTo: bodyLabel.bottomAnchor, constant: 12),
            timestampLabel.leadingAnchor.constraint(equalTo: iconImageView.trailingAnchor, constant: 12),
            timestampLabel.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -16),
        ])

        // Set preferred content size for the extension
        preferredContentSize = CGSize(width: view.bounds.width, height: 120)
    }

    func didReceive(_ notification: UNNotification) {
        let content = notification.request.content

        titleLabel.text = content.title
        bodyLabel.text = content.body

        let formatter = DateFormatter()
        formatter.dateStyle = .short
        formatter.timeStyle = .short
        timestampLabel.text = "Received: \(formatter.string(from: notification.date))"

        // Check for custom data
        if let customIcon = content.userInfo["icon"] as? String {
            iconImageView.image = UIImage(systemName: customIcon)
        }

        if let tintColorHex = content.userInfo["tintColor"] as? String {
            iconImageView.tintColor = UIColor(hex: tintColorHex)
        }

        print("📬 NotificationContent: Received notification - \(content.title)")
    }
}

// Helper extension for hex colors
extension UIColor {
    convenience init(hex: String) {
        var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hexSanitized = hexSanitized.replacingOccurrences(of: "#", with: "")

        var rgb: UInt64 = 0
        Scanner(string: hexSanitized).scanHexInt64(&rgb)

        let r = CGFloat((rgb & 0xFF0000) >> 16) / 255.0
        let g = CGFloat((rgb & 0x00FF00) >> 8) / 255.0
        let b = CGFloat(rgb & 0x0000FF) / 255.0

        self.init(red: r, green: g, blue: b, alpha: 1.0)
    }
}

