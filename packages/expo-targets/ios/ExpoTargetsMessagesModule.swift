import ExpoModulesCore
import Messages

public class ExpoTargetsMessagesModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExpoTargetsMessages")

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
        guard let msViewController = self.findMessagesViewController() else { return }
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
          if let error = error {
            print("Error sending message: \(error.localizedDescription)")
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
          if let error = error {
            print("Error updating message: \(error.localizedDescription)")
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
    // In extensions, search through view controller hierarchy
    // UIApplication.shared is not available in app extensions
    // Note: This approach may have limitations - consider getting reference during initialization
    return nil // TODO: Implement proper view controller discovery
  }

  private func findMessagesVC(in vc: UIViewController) -> MSMessagesAppViewController? {
    if let msVC = vc as? MSMessagesAppViewController {
      return msVC
    }
    for child in vc.children {
      if let found = findMessagesVC(in: child) {
        return found
      }
    }
    return nil
  }
}

