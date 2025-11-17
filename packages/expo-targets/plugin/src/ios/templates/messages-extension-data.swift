// Messages Extension Data Loading
// Note: This is embedded in ReactNativeViewController, but for messages extensions,
// the MessagesViewController (MSMessagesAppViewController) is the parent and passes
// data down. This code provides default values.

private var presentationStyle: String = "compact"
private var conversationId: String?
private var remoteParticipantIds: [String] = []
private var hasSelectedMessage: Bool = false
private var selectedMessageData: [String: Any]?

private func loadMessagesContent() {
    // For messages extensions, the parent MessagesViewController handles
    // the MSMessagesAppViewController and passes data as initialProps.
    // This method is a no-op to maintain compatibility with the template structure.
}

private func getMessagesDataProps() -> [String: Any] {
    // Return default data - the actual data comes from parent MessagesViewController
    // via initialProps in viewDidLoad
    var data: [String: Any] = [:]
    data["presentationStyle"] = presentationStyle
    data["participantCount"] = 1
    data["remoteParticipantIds"] = remoteParticipantIds
    data["hasSelectedMessage"] = false
    return data
}

