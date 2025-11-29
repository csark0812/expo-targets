#!/usr/bin/env node
import prompts from 'prompts';
import fs from 'fs-extra';
import path from 'path';

async function main() {
  console.log('🎯 Create Expo Target\n');

  const response = await prompts([
    {
      type: 'select',
      name: 'type',
      message: 'What type of target?',
      choices: [
        { title: 'Widget', value: 'widget' },
        { title: 'App Clip', value: 'clip' },
        { title: 'iMessage Stickers', value: 'imessage' },
        { title: 'Messages App', value: 'messages' },
        { title: 'Share Extension', value: 'share' },
        { title: 'Action Extension', value: 'action' },
        { title: 'Siri Intent', value: 'intent' },
        { title: 'Wallet Extension (Non-UI)', value: 'wallet' },
        { title: 'Wallet Extension (UI/Auth)', value: 'wallet-ui' },
      ],
    },
    {
      type: 'text',
      name: 'name',
      message: 'Target name (e.g., my-widget):',
      validate: (value) =>
        value.length > 0 ? true : 'Target name is required',
    },
    {
      type: 'multiselect',
      name: 'platforms',
      message: 'Select platforms:',
      choices: [
        { title: 'iOS', value: 'ios', selected: true },
        { title: 'Android (coming soon)', value: 'android', disabled: true },
      ],
    },
    {
      type: (prev, values) =>
        ['share', 'action', 'clip'].includes(values.type) ? 'confirm' : null,
      name: 'useReactNative',
      message: 'Use React Native for UI?',
      initial: false,
    },
    {
      type: (prev, values) => (values.type === 'intent' ? 'confirm' : null),
      name: 'includeIntentUI',
      message: 'Include custom UI extension? (displays custom visuals in Siri)',
      initial: true,
    },
  ]);

  if (!response.type || !response.name) {
    console.log('Cancelled');
    return;
  }

  const targetDir = path.join(process.cwd(), 'targets', response.name);

  if (fs.existsSync(targetDir)) {
    console.error(`❌ Target directory already exists: ${targetDir}`);
    return;
  }

  fs.mkdirSync(targetDir, { recursive: true });

  const pascalName = kebabToPascal(response.name);
  const config = generateConfig(
    response.type,
    response.name,
    pascalName,
    response.platforms,
    response.useReactNative,
    response.includeIntentUI
  );
  fs.writeFileSync(path.join(targetDir, 'expo-target.config.json'), config);

  if (response.platforms.includes('ios')) {
    copyTemplate(
      response.type,
      'ios',
      targetDir,
      pascalName,
      response.includeIntentUI
    );

    if (response.useReactNative) {
      const entryFile = path.join(targetDir, 'index.tsx');
      fs.writeFileSync(
        entryFile,
        getReactNativeTemplate(response.type, pascalName)
      );
      console.log(`✅ Created entry file: targets/${response.name}/index.tsx`);
      console.log('📝 Remember to add Metro config wrapper to metro.config.js');
    }
  }

  // Generate index.ts with pre-configured target instance
  const indexTs = `import { createTarget } from 'expo-targets';

export const ${pascalToCamel(pascalName)} = createTarget('${pascalName}');
`;
  fs.writeFileSync(path.join(targetDir, 'index.ts'), indexTs);

  console.log(`\n✅ Created target at targets/${response.name}`);

  console.log('\nRun `npx expo prebuild` to generate Xcode project\n');
}

function generateConfig(
  type: string,
  kebabName: string,
  pascalName: string,
  platforms: string[],
  useReactNative?: boolean,
  includeIntentUI?: boolean
): string {
  const config: any = {
    type,
    name: pascalName,
    displayName: kebabName
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
    platforms: platforms,
  };

  if (platforms.includes('ios') && useReactNative) {
    config.entry = `./targets/${kebabName}/index.tsx`;
    config.excludedPackages = ['expo-updates', 'expo-dev-client'];
  }

  if (type === 'intent' && platforms.includes('ios')) {
    config.ios = {
      intents: {
        intentsSupported: ['INStartWorkoutIntent'],
        ...(includeIntentUI && { ui: true }),
      },
    };
  }

  return JSON.stringify(config, null, 2);
}

function copyTemplate(
  type: string,
  platform: string,
  targetDir: string,
  pascalName: string,
  includeIntentUI?: boolean
) {
  const platformDir = path.join(targetDir, platform);
  fs.mkdirSync(platformDir, { recursive: true });

  function getWidgetTemplate(name: string): string {
    return `import WidgetKit
import SwiftUI

struct SimpleEntry: TimelineEntry {
    let date: Date
    let message: String
}

struct Provider: TimelineProvider {
    // ⚠️ IMPORTANT: Update this App Group ID to match your app.json entitlements
    // Example: "group.com.yourcompany.yourapp"
    // Must match exactly or data sharing will fail silently
    let appGroup = "YOUR_APP_GROUP_HERE"

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

@main
struct ${name}: Widget {
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

  const templates: Record<string, string | Function> = {
    widget: getWidgetTemplate,
    clip: `import SwiftUI

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
}`,
    imessage: `// iMessage sticker pack
// Add sticker images to Stickers.xcstickers folder`,
    messages: `import UIKit
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
}`,
    share: `import UIKit
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
}`,
    action: `import UIKit

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
}`,
    wallet: `import PassKit

class PassProvider: NSObject, PKIssuerProvisioningExtensionHandler {

    // MARK: - PKIssuerProvisioningExtensionHandler

    func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {
        // Return the status of the extension
        // This method is called to determine if the extension is ready to provision passes
        let status = PKIssuerProvisioningExtensionStatus()
        status.requiresAuthentication = true
        status.passEntriesAvailable = true
        completion(status)
    }

    func passEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]?, Error?) -> Void) {
        // Return available passes that can be provisioned
        // Each entry represents a pass that the user can add to Wallet

        let passEntry = PKIssuerProvisioningExtensionPassEntry()
        // Configure your pass entry here
        // passEntry.identifier = "your-pass-identifier"
        // passEntry.title = "Your Pass Title"
        // passEntry.art = UIImage(named: "PassArt")

        completion([passEntry], nil)
    }

    func remotePassEntries(completion: @escaping ([PKIssuerProvisioningExtensionPassEntry]?, Error?) -> Void) {
        // Return passes available from a remote source
        // This is called when refreshing available passes
        passEntries(completion: completion)
    }

    func generateAddPaymentPassRequestForPassEntryWithIdentifier(
        _ identifier: String,
        configuration: PKAddPaymentPassRequestConfiguration,
        certificateChain: [Data],
        nonce: Data,
        nonceSignature: Data,
        completionHandler: @escaping (PKAddPaymentPassRequest) -> Void
    ) {
        // Generate the encrypted pass data for provisioning
        // This is where you communicate with your server to create the pass

        let request = PKAddPaymentPassRequest()
        // Configure the request with encrypted pass data from your server
        // request.encryptedPassData = ...
        // request.activationData = ...
        // request.ephemeralPublicKey = ...

        completionHandler(request)
    }
}`,
    'wallet-ui': `import UIKit
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
}`,
    intent: `import Intents

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
// }`,
    'intent-ui': `import IntentsUI

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
}`,
  };

  const templateFn = templates[type] || templates.widget;
  const template =
    typeof templateFn === 'function' ? templateFn(pascalName) : templateFn;
  let filename = 'Main.swift';
  if (type === 'widget') {
    filename = 'Widget.swift';
  } else if (type === 'messages') {
    filename = 'MessagesViewController.swift';
  } else if (type === 'wallet') {
    filename = 'PassProvider.swift';
  } else if (type === 'wallet-ui') {
    filename = 'AuthorizationViewController.swift';
  } else if (type === 'intent') {
    filename = 'IntentHandler.swift';
  } else if (type === 'intent-ui') {
    filename = 'IntentViewController.swift';
  }

  fs.writeFileSync(path.join(platformDir, filename), template);

  // For intent type with UI, also create IntentViewController.swift
  if (type === 'intent' && includeIntentUI) {
    const intentUITemplate = templates['intent-ui'];
    fs.writeFileSync(
      path.join(platformDir, 'IntentViewController.swift'),
      intentUITemplate as string
    );
  }

  if (type === 'imessage') {
    const stickersDir = path.join(platformDir, 'Stickers.xcstickers');
    fs.mkdirSync(stickersDir, { recursive: true });
    fs.writeFileSync(
      path.join(stickersDir, 'Contents.json'),
      JSON.stringify(
        {
          info: {
            version: 1,
            author: 'xcode',
          },
        },
        null,
        2
      )
    );
  }
}

function getReactNativeTemplate(type: string, pascalName: string): string {
  return `import { AppRegistry } from 'react-native';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function ${pascalName}() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>${pascalName}</Text>
      <Text style={styles.subtitle}>Built with React Native</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  text: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});

// ⚠️ IMPORTANT: Component name must match the "name" field in expo-target.config.json exactly
AppRegistry.registerComponent('${pascalName}', () => ${pascalName});
`;
}

function kebabToPascal(kebab: string): string {
  return kebab
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

function pascalToCamel(pascal: string): string {
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

main().catch(console.error);
