// Messages Extension Data Loading

import Messages

private var presentationStyle: String = "compact"
private var conversationId: String?
private var remoteParticipantIds: [String] = []
private var hasSelectedMessage: Bool = false
private var selectedMessageData: [String: Any]?

private func loadMessagesContent() {
    guard let msViewController = findMessagesViewController() else { return }

    // Load presentation style
    presentationStyle = msViewController.presentationStyle == .compact ? "compact" : "expanded"

    // Load conversation data
    if let conversation = msViewController.activeConversation {
        conversationId = conversation.localParticipantIdentifier.uuidString
        remoteParticipantIds = conversation.remoteParticipantIdentifiers.map { $0.uuidString }

        // Load selected message if present
        if let message = conversation.selectedMessage {
            hasSelectedMessage = true
            var msgData: [String: Any] = [:]

            if let url = message.url?.absoluteString {
                msgData["url"] = url
            }

            if let layout = message.layout as? MSMessageTemplateLayout {
                if let caption = layout.caption { msgData["caption"] = caption }
                if let subcaption = layout.subcaption { msgData["subcaption"] = subcaption }
                if let trailing = layout.trailingCaption { msgData["trailingCaption"] = trailing }
                if let trailingSub = layout.trailingSubcaption { msgData["trailingSubcaption"] = trailingSub }
            }

            selectedMessageData = msgData
        }
    }
}

private func getMessagesDataProps() -> [String: Any] {
    var data: [String: Any] = [:]
    data["presentationStyle"] = presentationStyle

    if let convId = conversationId {
        data["conversationId"] = convId
    }

    data["remoteParticipantIds"] = remoteParticipantIds
    data["participantCount"] = remoteParticipantIds.count + 1
    data["hasSelectedMessage"] = hasSelectedMessage

    if let selected = selectedMessageData {
        data["selectedMessage"] = selected
    }

    return data
}

private func findMessagesViewController() -> MSMessagesAppViewController? {
    // In extensions, walk up the view controller hierarchy from self
    // UIApplication.shared is not available in app extensions
    var current: UIViewController? = self
    while let vc = current {
        if let msVC = vc as? MSMessagesAppViewController {
            return msVC
        }
        current = vc.parent
    }
    return nil
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

