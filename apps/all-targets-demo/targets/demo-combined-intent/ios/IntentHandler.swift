import Intents

class IntentHandler: INExtension, INSendMessageIntentHandling, INSearchForMessagesIntentHandling {

    override func handler(for intent: INIntent) -> Any {
        switch intent {
        case is INSendMessageIntent,
             is INSearchForMessagesIntent:
            return self
        default:
            fatalError("Unhandled intent type: \(intent)")
        }
    }

    // MARK: - INSendMessageIntent

    func handle(intent: INSendMessageIntent, completion: @escaping (INSendMessageIntentResponse) -> Void) {
        let response = INSendMessageIntentResponse(code: .success, userActivity: nil)
        completion(response)
    }

    func resolveRecipients(for intent: INSendMessageIntent, with completion: @escaping ([INSendMessageRecipientResolutionResult]) -> Void) {
        if let recipients = intent.recipients, !recipients.isEmpty {
            completion(recipients.map { INSendMessageRecipientResolutionResult.success(with: $0) })
        } else {
            completion([INSendMessageRecipientResolutionResult.needsValue()])
        }
    }

    func resolveContent(for intent: INSendMessageIntent, with completion: @escaping (INStringResolutionResult) -> Void) {
        if let content = intent.content, !content.isEmpty {
            completion(INStringResolutionResult.success(with: content))
        } else {
            completion(INStringResolutionResult.needsValue())
        }
    }

    // MARK: - INSearchForMessagesIntent

    func handle(intent: INSearchForMessagesIntent, completion: @escaping (INSearchForMessagesIntentResponse) -> Void) {
        let response = INSearchForMessagesIntentResponse(code: .success, userActivity: nil)
        completion(response)
    }
}
