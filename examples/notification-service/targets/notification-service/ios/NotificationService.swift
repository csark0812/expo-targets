import UserNotifications

class NotificationService: UNNotificationServiceExtension {
  var contentHandler: ((UNNotificationContent) -> Void)?
  var bestAttemptContent: UNMutableNotificationContent?

  private let appGroup = "group.com.expotargets.example.notification-service"

  override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    self.contentHandler = contentHandler
    bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)
    if let bestAttemptContent {
      bestAttemptContent.title = "\(bestAttemptContent.title) [expo-targets]"
      persistMutationMarker(bestAttemptContent.title)
      contentHandler(bestAttemptContent)
    }
  }

  override func serviceExtensionTimeWillExpire() {
    if let contentHandler, let bestAttemptContent {
      contentHandler(bestAttemptContent)
    }
  }

  /// Journey-readable proof that NSE ran (Simulator lock-screen AX is flaky).
  private func persistMutationMarker(_ title: String) {
    guard let container = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: appGroup
    ) else {
      return
    }
    let url = container.appendingPathComponent("nse-last-title.txt")
    try? title.write(to: url, atomically: true, encoding: .utf8)
  }
}
