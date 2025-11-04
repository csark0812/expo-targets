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

  const config = generateConfig(
    response.type,
    response.platforms,
    response.useReactNative
  );
  fs.writeFileSync(path.join(targetDir, 'expo-target.config.js'), config);

  if (response.platforms.includes('ios')) {
    copyTemplate(response.type, 'ios', targetDir);

    if (response.useReactNative) {
      const entryFile = path.join(process.cwd(), `index.${response.name}.js`);
      fs.writeFileSync(entryFile, getReactNativeTemplate(response.type));
      console.log(`✅ Created entry file: index.${response.name}.js`);
      console.log('📝 Remember to add Metro config wrapper to metro.config.js');
    }
  }

  console.log(`\n✅ Created target at targets/${response.name}`);
  console.log(
    'Run `npx expo prebuild -p ios --clean` to generate Xcode project\n'
  );
}

function generateConfig(
  type: string,
  platforms: string[],
  useReactNative?: boolean
): string {
  const iosConfig = platforms.includes('ios')
    ? `
    ios: {
      deploymentTarget: '18.0',${
        useReactNative
          ? `
      useReactNative: true,
      excludedPackages: ['expo-updates', 'expo-dev-client'],`
          : ''
      }
    },`
    : '';

  return `module.exports = {
  type: '${type}',
  platforms: {${iosConfig}
  },
};
`;
}

function copyTemplate(type: string, platform: string, targetDir: string) {
  const platformDir = path.join(targetDir, platform);
  fs.mkdirSync(platformDir, { recursive: true });

  const templates: Record<string, string> = {
    widget: `import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> SimpleEntry {
        SimpleEntry(date: Date(), message: "Placeholder")
    }

    func getSnapshot(in context: Context, completion: @escaping (SimpleEntry) -> ()) {
        let entry = SimpleEntry(date: Date(), message: "Loading...")
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        let entry = SimpleEntry(date: Date(), message: "Hello Widget")
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

struct SimpleEntry: TimelineEntry {
    let date: Date
    let message: String
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
struct MyWidget: Widget {
    let kind: String = "MyWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            WidgetView(entry: entry)
        }
        .configurationDisplayName("My Widget")
        .description("A simple widget")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}`,
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
  };

  const template = templates[type] || templates.widget;
  let filename = 'Main.swift';
  if (type === 'widget') {
    filename = 'Widget.swift';
  } else if (type === 'messages') {
    filename = 'MessagesViewController.swift';
  }

  fs.writeFileSync(path.join(platformDir, filename), template);

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

function getReactNativeTemplate(type: string): string {
  return `import { AppRegistry } from 'react-native';
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

function ${capitalize(type)}Extension() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>${capitalize(type)} Extension</Text>
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

AppRegistry.registerComponent('${type}Extension', () => ${capitalize(
    type
  )}Extension);
`;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

main().catch(console.error);
