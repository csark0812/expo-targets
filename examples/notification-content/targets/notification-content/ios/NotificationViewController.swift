import UIKit
import UserNotifications
import UserNotificationsUI

/// Notification content extension — hosts React Native for rich push UI.
@objc(NotificationViewController)
class NotificationViewController: UIViewController, UNNotificationContentExtension {
  private var reactViewController: ReactNativeViewController?

  func didReceive(_ notification: UNNotification) {
    if reactViewController != nil {
      return
    }

    let payload: [String: Any] = [
      "title": notification.request.content.title,
      "body": notification.request.content.body,
      "category": notification.request.content.categoryIdentifier,
    ]

    let reactVC = ReactNativeViewController(messagesData: payload)
    addChild(reactVC)
    reactVC.view.frame = view.bounds
    reactVC.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    view.addSubview(reactVC.view)
    reactVC.didMove(toParent: self)
    reactViewController = reactVC
  }
}
