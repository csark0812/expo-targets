export type WidgetTemplateOptions = {
  appGroup: string;
  /** When true, omit @main — caller emits a WidgetBundle instead. */
  useBundle?: boolean;
  /** When true, scaffold AppIntentConfiguration (iOS 17+ Edit Widget). */
  configurable?: boolean;
};

function getStaticWidgetTemplate(
  name: string,
  appGroup: string,
  mainAttr: string
): string {
  return `import WidgetKit
import SwiftUI

struct SimpleEntry: TimelineEntry {
    let date: Date
    let message: String
}

struct Provider: TimelineProvider {
    let appGroup = "${appGroup}"

    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), message: "Placeholder")
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), message: loadMessage())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<SimpleEntry>) -> ()) {
        let entry = SimpleEntry(date: Date(), message: loadMessage())
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadMessage() -> String {
        let defaults = UserDefaults(suiteName: appGroup)
        return defaults?.string(forKey: "message") ?? "No message yet"
    }
}

struct WidgetView: View {
    var entry: Provider.Entry

    var body: some View {
        VStack {
            Text("Widget")
                .font(.headline)
            Text(entry.message)
                .font(.caption)
        }
    }
}

${mainAttr}struct ${name}: Widget {
    // ⚠️ IMPORTANT: This "kind" must match the "name" field in expo-target.config.json exactly
    let kind: String = "${name}"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            WidgetView(entry: entry)
        }
        .configurationDisplayName("${name}")
        .description("A simple widget")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}`;
}

function getConfigurableWidgetTemplate(
  name: string,
  appGroup: string,
  mainAttr: string
): string {
  const intentName = `${name}ConfigurationIntent`;
  return `import AppIntents
import SwiftUI
import WidgetKit

/// Edit Widget intent — customize parameters in the widget gallery (iOS 17+).
struct ${intentName}: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Display"
    static var description = IntentDescription("Choose what the widget shows.")

    @Parameter(title: "List")
    var listId: String?
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let listId: String
    let message: String
}

struct Provider: AppIntentTimelineProvider {
    typealias Intent = ${intentName}
    typealias Entry = SimpleEntry

    let appGroup = "${appGroup}"
    private let storageKey = "listId"

    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), listId: "default", message: "Placeholder")
    }

    func snapshot(for configuration: ${intentName}, in context: Context) async -> SimpleEntry {
        let listId = resolvedListId(from: configuration)
        return SimpleEntry(date: Date(), listId: listId, message: displayMessage(for: listId))
    }

    func timeline(for configuration: ${intentName}, in context: Context) async -> Timeline<SimpleEntry> {
        let listId = resolvedListId(from: configuration)
        let entry = SimpleEntry(
            date: Date(),
            listId: listId,
            message: displayMessage(for: listId)
        )
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        return Timeline(entries: [entry], policy: .after(nextUpdate))
    }

    private func resolvedListId(from configuration: ${intentName}) -> String {
        if let intentListId = configuration.listId, !intentListId.isEmpty {
            persistSelection(intentListId)
            return intentListId
        }
        return loadPersistedListId()
    }

    private func persistSelection(_ listId: String) {
        UserDefaults(suiteName: appGroup)?.set(listId, forKey: storageKey)
    }

    private func loadPersistedListId() -> String {
        UserDefaults(suiteName: appGroup)?.string(forKey: storageKey) ?? "default"
    }

    private func displayMessage(for listId: String) -> String {
        "List: \\(listId)"
    }
}

struct WidgetView: View {
    var entry: Provider.Entry

    var body: some View {
        VStack {
            Text("Widget")
                .font(.headline)
            Text(entry.message)
                .font(.caption)
        }
    }
}

${mainAttr}struct ${name}: Widget {
    // ⚠️ IMPORTANT: This "kind" must match the "name" field in expo-target.config.json exactly
    let kind: String = "${name}"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: ${intentName}.self, provider: Provider()) { entry in
            WidgetView(entry: entry)
        }
        .configurationDisplayName("${name}")
        .description("A configurable widget")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}`;
}

export function getWidgetTemplate(
  name: string,
  options?: WidgetTemplateOptions
): string {
  const appGroup = options?.appGroup ?? 'group.com.example.app';
  const mainAttr = options?.useBundle ? '' : '@main\n';
  if (options?.configurable) {
    return getConfigurableWidgetTemplate(name, appGroup, mainAttr);
  }
  return getStaticWidgetTemplate(name, appGroup, mainAttr);
}

export const CLIP_TEMPLATE = `import SwiftUI

@main
struct AppClipApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

struct ContentView: View {
    var body: some View {
        VStack {
            Text("App Clip")
                .font(.largeTitle)
            Text("Welcome to App Clip")
                .font(.body)
        }
        .padding()
    }
}`;

export const IMESSAGE_TEMPLATE = `// iMessage sticker pack
// Add sticker images to Stickers.xcstickers folder`;

export const MESSAGES_TEMPLATE = `import UIKit
import Messages

class MessagesViewController: MSMessagesAppViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        setupUI()
    }

    private func setupUI() {
        view.backgroundColor = .systemBackground

        let titleLabel = UILabel()
        titleLabel.text = "iMessage App"
        titleLabel.font = .boldSystemFont(ofSize: 24)
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        let subtitleLabel = UILabel()
        subtitleLabel.text = "Your interactive iMessage app"
        subtitleLabel.font = .systemFont(ofSize: 16)
        subtitleLabel.textColor = .secondaryLabel
        subtitleLabel.textAlignment = .center
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(titleLabel)
        view.addSubview(subtitleLabel)

        NSLayoutConstraint.activate([
            titleLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            titleLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -20),
            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            subtitleLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor)
        ])
    }

    // MARK: - Conversation Handling

    override func didBecomeActive(with conversation: MSConversation) {
        super.didBecomeActive(with: conversation)

        // Called when the extension is about to move from the inactive to active state.
        // Use this method to configure your extension and restore previously stored state.

        if let selectedMessage = conversation.selectedMessage {
            // Handle a selected message
            print("Selected message: \\(selectedMessage)")
        }
    }

    override func willResignActive(with conversation: MSConversation) {
        super.willResignActive(with: conversation)

        // Called when the extension is about to move from the active to inactive state.
        // This will happen when the user dismisses the extension, changes to a different
        // conversation or selects a different input method.
    }

    override func didReceive(_ message: MSMessage, conversation: MSConversation) {
        super.didReceive(message, conversation: conversation)

        // Called when a message arrives that was generated by another instance of this
        // extension on a remote device.
    }

    override func didStartSending(_ message: MSMessage, conversation: MSConversation) {
        super.didStartSending(message, conversation: conversation)

        // Called when the user taps the send button.
    }

    override func didCancelSending(_ message: MSMessage, conversation: MSConversation) {
        super.didCancelSending(message, conversation: conversation)

        // Called when the user deletes the message without sending it.
    }

    override func willTransition(to presentationStyle: MSMessagesAppPresentationStyle) {
        super.willTransition(to: presentationStyle)

        // Called before the extension transitions to a new presentation style.
        // Use this method to prepare for the change in presentation style.
    }

    override func didTransition(to presentationStyle: MSMessagesAppPresentationStyle) {
        super.didTransition(to: presentationStyle)

        // Called after the extension transitions to a new presentation style.
        // Use this method to finalize any behaviors associated with the change in presentation style.
    }
}`;

export const SHARE_TEMPLATE = `import UIKit
import Social

class ShareViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        let label = UILabel()
        label.text = "Share Extension"
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(label)

        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }
}`;

export const ACTION_TEMPLATE = `import UIKit

class ActionViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        let label = UILabel()
        label.text = "Action Extension"
        label.textAlignment = .center
        label.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(label)

        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }
}`;

export const WALLET_TEMPLATE = `import PassKit
import UIKit

class PassProvider: PKIssuerProvisioningExtensionHandler {

    override func status() async -> PKIssuerProvisioningExtensionStatus {
        let status = PKIssuerProvisioningExtensionStatus()
        status.requiresAuthentication = true
        status.passEntriesAvailable = true
        status.remotePassEntriesAvailable = true
        return status
    }

    override func passEntries() async -> [PKIssuerProvisioningExtensionPassEntry] {
        guard let cardArt = UIImage(named: "CardArt")?.cgImage,
              let config = createAddRequestConfiguration() else {
            return []
        }

        guard let entry = PKIssuerProvisioningExtensionPaymentPassEntry(
            identifier: "your-card-identifier",
            title: "Your Card",
            art: cardArt,
            addRequestConfiguration: config
        ) else {
            return []
        }

        return [entry]
    }

    override func remotePassEntries() async -> [PKIssuerProvisioningExtensionPassEntry] {
        return await passEntries()
    }

    override func generateAddPaymentPassRequestForPassEntryWithIdentifier(
        _ identifier: String,
        configuration: PKAddPaymentPassRequestConfiguration,
        certificateChain certificates: [Data],
        nonce: Data,
        nonceSignature: Data
    ) async -> PKAddPaymentPassRequest? {
        // In production: send certificates/nonce to server, get encrypted pass data back
        let request = PKAddPaymentPassRequest()
        // request.encryptedPassData = dataFromServer
        // request.activationData = activationDataFromServer
        return request
    }

    private func createAddRequestConfiguration() -> PKAddPaymentPassRequestConfiguration? {
        guard let config = PKAddPaymentPassRequestConfiguration(encryptionScheme: .ECC_V2) else {
            return nil
        }
        config.cardholderName = "Cardholder Name"
        config.primaryAccountSuffix = "1234"
        config.localizedDescription = "Your Card Description"
        config.primaryAccountIdentifier = ""
        config.paymentNetwork = .visa
        return config
    }
}`;

export const WALLET_UI_TEMPLATE = `import UIKit
import PassKit

class AuthorizationViewController: UIViewController, PKIssuerProvisioningExtensionAuthorizationProviding {

    var completionHandler: ((PKIssuerProvisioningExtensionAuthorizationResult) -> Void)?

    override func viewDidLoad() {
        super.viewDidLoad()
        setupUI()
    }

    private func setupUI() {
        view.backgroundColor = .systemBackground

        let titleLabel = UILabel()
        titleLabel.text = "Authenticate"
        titleLabel.font = .boldSystemFont(ofSize: 24)
        titleLabel.textAlignment = .center
        titleLabel.translatesAutoresizingMaskIntoConstraints = false

        let subtitleLabel = UILabel()
        subtitleLabel.text = "Verify your identity to add this card"
        subtitleLabel.font = .systemFont(ofSize: 16)
        subtitleLabel.textColor = .secondaryLabel
        subtitleLabel.textAlignment = .center
        subtitleLabel.translatesAutoresizingMaskIntoConstraints = false

        let authenticateButton = UIButton(type: .system)
        authenticateButton.setTitle("Authenticate", for: .normal)
        authenticateButton.titleLabel?.font = .boldSystemFont(ofSize: 18)
        authenticateButton.addTarget(self, action: #selector(authenticateTapped), for: .touchUpInside)
        authenticateButton.translatesAutoresizingMaskIntoConstraints = false

        let cancelButton = UIButton(type: .system)
        cancelButton.setTitle("Cancel", for: .normal)
        cancelButton.addTarget(self, action: #selector(cancelTapped), for: .touchUpInside)
        cancelButton.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(titleLabel)
        view.addSubview(subtitleLabel)
        view.addSubview(authenticateButton)
        view.addSubview(cancelButton)

        NSLayoutConstraint.activate([
            titleLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            titleLabel.centerYAnchor.constraint(equalTo: view.centerYAnchor, constant: -60),
            subtitleLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            subtitleLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            authenticateButton.topAnchor.constraint(equalTo: subtitleLabel.bottomAnchor, constant: 32),
            authenticateButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            cancelButton.topAnchor.constraint(equalTo: authenticateButton.bottomAnchor, constant: 16),
            cancelButton.centerXAnchor.constraint(equalTo: view.centerXAnchor)
        ])
    }

    @objc private func authenticateTapped() {
        completionHandler?(.authorized)
    }

    @objc private func cancelTapped() {
        completionHandler?(.canceled)
    }
}`;

export const INTENT_TEMPLATE = `import Intents

class IntentHandler: INExtension {

    override func handler(for intent: INIntent) -> Any {
        // Return self or specific handler based on intent type
        return self
    }
}

// MARK: - Example Intent Handling
// Uncomment and customize for your specific intents

// extension IntentHandler: INStartWorkoutIntentHandling {
//     func handle(intent: INStartWorkoutIntent, completion: @escaping (INStartWorkoutIntentResponse) -> Void) {
//         let response = INStartWorkoutIntentResponse(code: .continueInApp, userActivity: nil)
//         completion(response)
//     }
// }`;

export const INTENT_UI_TEMPLATE = `import IntentsUI

class IntentViewController: UIViewController, INUIHostedViewControlling {

    override func viewDidLoad() {
        super.viewDidLoad()
    }

    func configureView(
        for parameters: Set<INParameter>,
        of interaction: INInteraction,
        interactiveBehavior: INUIInteractiveBehavior,
        context: INUIHostedViewContext,
        completion: @escaping (Bool, Set<INParameter>, CGSize) -> Void
    ) {
        // Customize the UI based on the intent
        let desiredSize = CGSize(width: view.bounds.width, height: 100)
        completion(true, parameters, desiredSize)
    }
}`;

export const IOS_TEMPLATES: Record<
  string,
  string | ((name: string, options?: WidgetTemplateOptions) => string)
> = {
  widget: getWidgetTemplate,
  clip: CLIP_TEMPLATE,
  imessage: IMESSAGE_TEMPLATE,
  messages: MESSAGES_TEMPLATE,
  share: SHARE_TEMPLATE,
  action: ACTION_TEMPLATE,
  wallet: WALLET_TEMPLATE,
  intent: INTENT_TEMPLATE,
};

export const TEMPLATE_FILENAMES: Record<string, string> = {
  widget: 'Widget.swift',
  messages: 'MessagesViewController.swift',
  wallet: 'PassProvider.swift',
  intent: 'IntentHandler.swift',
};
