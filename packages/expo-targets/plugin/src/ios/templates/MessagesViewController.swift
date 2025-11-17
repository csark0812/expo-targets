import UIKit
import Messages

// Principal class for Messages extension - required by iMessage
// This hosts the React Native view as a child view controller
@objc(MessagesViewController)
class MessagesViewController: MSMessagesAppViewController {
    @objc static weak var shared: MSMessagesAppViewController?
    private var reactViewController: ReactNativeViewController?

    override func viewDidLoad() {
        super.viewDidLoad()
        MessagesViewController.shared = self
        setupReactViewController()
        setupNotificationObservers()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    private func setupReactViewController() {
        let messagesData = loadMessagesData()

        let reactVC = ReactNativeViewController(messagesData: messagesData)
        addChild(reactVC)
        reactVC.view.frame = view.bounds
        reactVC.view.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(reactVC.view)
        reactVC.didMove(toParent: self)

        self.reactViewController = reactVC
    }

    private func loadMessagesData() -> [String: Any] {
        var data: [String: Any] = [:]

        // Load presentation style
        data["presentationStyle"] = self.presentationStyle == .compact ? "compact" : "expanded"

        // Load conversation data
        if let conversation = self.activeConversation {
            data["conversationId"] = conversation.localParticipantIdentifier.uuidString
            data["remoteParticipantIds"] = conversation.remoteParticipantIdentifiers.map { $0.uuidString }
            data["participantCount"] = conversation.remoteParticipantIdentifiers.count + 1

            // Load selected message if present
            if let message = conversation.selectedMessage {
                data["hasSelectedMessage"] = true
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

                data["selectedMessage"] = msgData
            } else {
                data["hasSelectedMessage"] = false
            }
        } else {
            data["participantCount"] = 1
            data["remoteParticipantIds"] = []
            data["hasSelectedMessage"] = false
        }

        return data
    }

    // MARK: - Notification Handling

    private func setupNotificationObservers() {
        print("[MessagesViewController] Setting up notification observers")
        NotificationCenter.default.addObserver(
            forName: NSNotification.Name("ExpoTargetsCloseExtension"),
            object: nil,
            queue: .main
        ) { [weak self] notification in
            print("[MessagesViewController] Received ExpoTargetsCloseExtension notification")
            print("[MessagesViewController] Current presentation style:", self?.presentationStyle == .compact ? "compact" : "expanded")
            self?.closeExtension()
        }
        print("[MessagesViewController] Notification observer registered successfully")
    }

    private func closeExtension() {
        print("[MessagesViewController] closeExtension() called")
        print("[MessagesViewController] Current presentation style:", self.presentationStyle == .compact ? "compact" : "expanded")

        // For Messages extensions, minimize to compact mode instead of dismissing
        print("[MessagesViewController] Calling requestPresentationStyle(.compact)")
        self.requestPresentationStyle(.compact)
        print("[MessagesViewController] requestPresentationStyle(.compact) returned")
    }

    // MARK: - Messages Lifecycle

    override func didTransition(to presentationStyle: MSMessagesAppPresentationStyle) {
        super.didTransition(to: presentationStyle)

        let styleString = presentationStyle == .compact ? "compact" : "expanded"
        print("[MessagesViewController] didTransition to:", styleString)

        // Notify React Native of presentation style change
        print("[MessagesViewController] Posting MSMessagesAppPresentationStyleDidChange notification")
        NotificationCenter.default.post(
            name: NSNotification.Name("MSMessagesAppPresentationStyleDidChange"),
            object: nil,
            userInfo: ["presentationStyle": styleString]
        )
        print("[MessagesViewController] Notification posted successfully")
    }
}

