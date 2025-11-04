import ExpoModulesCore
import Messages
import UIKit

public class ExpoTargetsMessagesModule: Module {
  private var notificationObserver: NSObjectProtocol?

  deinit {
    if let observer = notificationObserver {
      NotificationCenter.default.removeObserver(observer)
    }
  }

  public func definition() -> ModuleDefinition {
    Name("ExpoTargetsMessages")

    OnCreate {
      self.notificationObserver = NotificationCenter.default.addObserver(
        forName: NSNotification.Name("MSMessagesAppPresentationStyleDidChange"),
        object: nil,
        queue: .main
      ) { [weak self] notification in
        if let style = notification.userInfo?["presentationStyle"] as? String {
          self?.sendEvent("onPresentationStyleChange", [
            "presentationStyle": style
          ])
        }
      }
    }

    // Get current presentation style
    Function("getPresentationStyle") { () -> String? in
      guard let msViewController = self.findMessagesViewController() else {
        return nil
      }
      return msViewController.presentationStyle == .compact ? "compact" : "expanded"
    }

    // Request presentation style change
    Function("requestPresentationStyle") { (style: String) -> Void in
      DispatchQueue.main.async {
        guard let msViewController = self.findMessagesViewController() else {
          return
        }

        let presentationStyle: MSMessagesAppPresentationStyle =
          style == "compact" ? .compact : .expanded
        msViewController.requestPresentationStyle(presentationStyle)
      }
    }

    // Send message with full layout options
    Function("sendMessage") { (layout: [String: Any]) -> Void in
      DispatchQueue.main.async {
        guard let msViewController = self.findMessagesViewController(),
              let conversation = msViewController.activeConversation else {
          return
        }

        let message = MSMessage()
        let messageLayout = MSMessageTemplateLayout()

        if let caption = layout["caption"] as? String {
          messageLayout.caption = caption
        }
        if let subcaption = layout["subcaption"] as? String {
          messageLayout.subcaption = subcaption
        }
        if let trailing = layout["trailingCaption"] as? String {
          messageLayout.trailingCaption = trailing
        }
        if let trailingSub = layout["trailingSubcaption"] as? String {
          messageLayout.trailingSubcaption = trailingSub
        }

        // Handle image (SF Symbol or local file)
        if let imageUrl = layout["imageUrl"] as? String {
          if imageUrl.starts(with: "file://") || imageUrl.starts(with: "/") {
            messageLayout.image = UIImage(contentsOfFile: imageUrl)
          } else {
            messageLayout.image = UIImage(systemName: imageUrl)
          }
        }

        // Handle custom URL
        if let urlString = layout["url"] as? String, let url = URL(string: urlString) {
          message.url = url
        }

        message.layout = messageLayout

        conversation.insert(message) { error in
          if error != nil {
            // Error handling
          }
        }
      }
    }

    // Send update to existing message
    Function("sendUpdate") { (layout: [String: Any], sessionId: String) -> Void in
      DispatchQueue.main.async {
        guard let msViewController = self.findMessagesViewController(),
              let conversation = msViewController.activeConversation else {
          return
        }

        // Reuse session from selected message if available, otherwise create new
        let session = conversation.selectedMessage?.session ?? MSSession()
        let message = MSMessage(session: session)
        let messageLayout = MSMessageTemplateLayout()

        // Same layout setup as sendMessage
        if let caption = layout["caption"] as? String {
          messageLayout.caption = caption
        }
        if let subcaption = layout["subcaption"] as? String {
          messageLayout.subcaption = subcaption
        }
        if let trailing = layout["trailingCaption"] as? String {
          messageLayout.trailingCaption = trailing
        }
        if let trailingSub = layout["trailingSubcaption"] as? String {
          messageLayout.trailingSubcaption = trailingSub
        }
        if let imageUrl = layout["imageUrl"] as? String {
          if imageUrl.starts(with: "file://") || imageUrl.starts(with: "/") {
            messageLayout.image = UIImage(contentsOfFile: imageUrl)
          } else {
            messageLayout.image = UIImage(systemName: imageUrl)
          }
        }
        if let urlString = layout["url"] as? String, let url = URL(string: urlString) {
          message.url = url
        }

        message.layout = messageLayout

        conversation.insert(message) { error in
          if error != nil {
            // Error handling
          }
        }
      }
    }

    // Create new session ID
    // Note: MSSession doesn't expose identifier, so we generate a UUID for tracking
    Function("createSession") { () -> String in
      return UUID().uuidString
    }

    // Get conversation info
    Function("getConversationInfo") { () -> [String: Any]? in
      guard let msViewController = self.findMessagesViewController(),
            let conversation = msViewController.activeConversation else {
        return nil
      }

      return [
        "conversationId": conversation.localParticipantIdentifier.uuidString,
        "remoteParticipantIds": conversation.remoteParticipantIdentifiers.map { $0.uuidString },
        "participantCount": conversation.remoteParticipantIdentifiers.count + 1,
        "hasSelectedMessage": conversation.selectedMessage != nil
      ]
    }

    // Event for presentation style changes
    Events("onPresentationStyleChange")
  }

  private func findMessagesViewController() -> MSMessagesAppViewController? {
    // First, try to get the shared instance from MessagesViewController
    // Swift classes need module-qualified names for NSClassFromString
    // Try common patterns: MessagesViewController, <ModuleName>.MessagesViewController
    let classNames = [
      "MessagesViewController",
      "\(Bundle.main.infoDictionary?["CFBundleExecutable"] as? String ?? "").MessagesViewController"
    ]

    for className in classNames {
      if let viewControllerClass = NSClassFromString(className) as? NSObject.Type {
        if let sharedInstance = viewControllerClass.value(forKey: "shared") as? MSMessagesAppViewController {
          return sharedInstance
        }
      }
    }

    // Fallback: Get windows using modern API for iOS 15+ or legacy API for older versions
    let windows: [UIWindow]
    if #available(iOS 15.0, *) {
      let scenes = UIApplication.shared.connectedScenes
      let windowScenes = scenes.compactMap { $0 as? UIWindowScene }
      windows = windowScenes.flatMap { $0.windows }
    } else {
      windows = UIApplication.shared.windows
    }

    // Try key window first
    if let keyWindow = windows.first(where: { $0.isKeyWindow }),
       let rootVC = keyWindow.rootViewController {
      if let msViewController = findMessagesViewController(in: rootVC) {
        return msViewController
      }
    }

    // Fallback: search all windows
    for window in windows {
      if let rootVC = window.rootViewController {
        if let msViewController = findMessagesViewController(in: rootVC) {
          return msViewController
        }
      }
    }

    return nil
  }

  private func findMessagesViewController(in viewController: UIViewController) -> MSMessagesAppViewController? {
    // Check if this view controller is MSMessagesAppViewController
    if let msViewController = viewController as? MSMessagesAppViewController {
      return msViewController
    }

    // Check parent first (React Native runs inside Messages extension as a child)
    if let parent = viewController.parent {
      if let msViewController = findMessagesViewController(in: parent) {
        return msViewController
      }
    }

    // Then check children
    for childVC in viewController.children {
      if let msViewController = findMessagesViewController(in: childVC) {
        return msViewController
      }
    }

    // Check presented view controllers
    if let presented = viewController.presentedViewController {
      if let msViewController = findMessagesViewController(in: presented) {
        return msViewController
      }
    }

    // Check navigation controller
    if let navController = viewController as? UINavigationController {
      if let topVC = navController.topViewController {
        if let msViewController = findMessagesViewController(in: topVC) {
          return msViewController
        }
      }
    }

    // Check tab controller
    if let tabController = viewController as? UITabBarController {
      if let selectedVC = tabController.selectedViewController {
        if let msViewController = findMessagesViewController(in: selectedVC) {
          return msViewController
        }
      }
    }

    return nil
  }
}

