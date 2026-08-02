import UserNotifications
import UserNotificationsUI
import UIKit

/// Minimal notification content extension for expo-targets example.
@objc(NotificationViewController)
class NotificationViewController: UIViewController, UNNotificationContentExtension {
  private let titleLabel: UILabel = {
    let label = UILabel()
    label.textAlignment = .center
    label.font = .systemFont(ofSize: 17, weight: .semibold)
    label.translatesAutoresizingMaskIntoConstraints = false
    label.accessibilityIdentifier = "nce-title"
    return label
  }()

  private let markerLabel: UILabel = {
    let label = UILabel()
    label.text = "ET Trick NCE"
    label.textAlignment = .center
    label.font = .systemFont(ofSize: 15, weight: .regular)
    label.translatesAutoresizingMaskIntoConstraints = false
    label.accessibilityIdentifier = "nce-marker"
    return label
  }()

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .systemBackground
    view.addSubview(titleLabel)
    view.addSubview(markerLabel)
    NSLayoutConstraint.activate([
      titleLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
      titleLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
      titleLabel.topAnchor.constraint(equalTo: view.topAnchor, constant: 16),
      markerLabel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 16),
      markerLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -16),
      markerLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
    ])
  }

  func didReceive(_ notification: UNNotification) {
    titleLabel.text = notification.request.content.title
  }
}
