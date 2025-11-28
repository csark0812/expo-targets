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
        { title: 'Live Activity', value: 'live-activity' },
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

  const pascalName = kebabToPascal(response.name);
  const config = generateConfig(
    response.type,
    response.name,
    pascalName,
    response.platforms,
    response.useReactNative
  );
  fs.writeFileSync(path.join(targetDir, 'expo-target.config.json'), config);

  if (response.platforms.includes('ios')) {
    copyTemplate(response.type, 'ios', targetDir, pascalName);

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

  // Post-creation warnings
  console.log('\n⚠️  Remember to:');
  console.log(
    '   1. Update "appGroup" in expo-target.config.json to match your app.json'
  );
  if (response.type === 'widget') {
    console.log('   2. Update the App Group ID in ios/Widget.swift to match');
  }
  if (response.type === 'live-activity') {
    console.log('   2. Enable "Supports Live Activities" in your main app\'s Info.plist');
    console.log('   3. Add Push Notifications capability for remote Live Activity updates');
  }
  console.log('\nRun `npx expo prebuild` to generate Xcode project\n');
}

function getDeploymentTarget(type: string): string {
  const targets: Record<string, string> = {
    widget: '14.0',
    'live-activity': '16.1',
    clip: '14.0',
    stickers: '10.0',
    messages: '14.0',
    share: '13.0',
    action: '13.0',
  };
  return targets[type] || '14.0';
}

function generateConfig(
  type: string,
  kebabName: string,
  pascalName: string,
  platforms: string[],
  useReactNative?: boolean
): string {
  const config: any = {
    type,
    name: pascalName,
    displayName: kebabName
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' '),
    platforms: platforms,
    appGroup: 'group.com.yourcompany.yourapp',
  };

  if (platforms.includes('ios')) {
    config.ios = {
      deploymentTarget: getDeploymentTarget(type),
    };

    if (useReactNative) {
      config.entry = `./targets/${kebabName}/index.tsx`;
      config.excludedPackages = ['expo-updates', 'expo-dev-client'];
    }
  }

  return JSON.stringify(config, null, 2);
}

function copyTemplate(
  type: string,
  platform: string,
  targetDir: string,
  pascalName: string
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

  function getLiveActivityTemplate(name: string): string {
    return `import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Activity Attributes
// Define your Live Activity's static and dynamic data

struct ${name}Attributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic data that changes during the Live Activity
        var value: Int
        var status: String
    }
    
    // Static data that doesn't change
    var name: String
}

// MARK: - Live Activity Widget

@main
struct ${name}: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ${name}Attributes.self) { context in
            // Lock screen/banner UI
            LiveActivityView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded UI
                DynamicIslandExpandedRegion(.leading) {
                    Image(systemName: "star.fill")
                        .foregroundColor(.yellow)
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    Text("\\(context.state.value)")
                        .font(.title2)
                        .fontWeight(.semibold)
                }
                
                DynamicIslandExpandedRegion(.center) {
                    Text(context.state.status)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    HStack {
                        Text(context.attributes.name)
                            .font(.caption)
                        Spacer()
                    }
                }
            } compactLeading: {
                // Compact leading (left side of Dynamic Island)
                Image(systemName: "star.fill")
                    .foregroundColor(.yellow)
            } compactTrailing: {
                // Compact trailing (right side of Dynamic Island)
                Text("\\(context.state.value)")
                    .font(.caption2)
                    .fontWeight(.semibold)
            } minimal: {
                // Minimal presentation (when multiple Live Activities are active)
                Image(systemName: "star.fill")
                    .foregroundColor(.yellow)
            }
        }
    }
}

// MARK: - Views

struct LiveActivityView: View {
    let context: ActivityViewContext<${name}Attributes>
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "star.fill")
                    .foregroundColor(.yellow)
                    .font(.title2)
                
                Text(context.attributes.name)
                    .font(.headline)
                
                Spacer()
                
                Text("\\(context.state.value)")
                    .font(.title2)
                    .fontWeight(.bold)
            }
            
            Text(context.state.status)
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
        .activityBackgroundTint(Color.black.opacity(0.25))
        .activitySystemActionForegroundColor(Color.white)
    }
}

// MARK: - Preview

#Preview("Live Activity", as: .content, using: ${name}Attributes(name: "Preview")) {
    ${name}()
} contentStates: {
    ${name}Attributes.ContentState(value: 42, status: "Active")
    ${name}Attributes.ContentState(value: 100, status: "Complete")
}
`;
  }

  const templates: Record<string, string | Function> = {
    widget: getWidgetTemplate,
    'live-activity': getLiveActivityTemplate,
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

  const templateFn = templates[type] || templates.widget;
  const template =
    typeof templateFn === 'function' ? templateFn(pascalName) : templateFn;
  let filename = 'Main.swift';
  if (type === 'widget') {
    filename = 'Widget.swift';
  } else if (type === 'live-activity') {
    filename = 'LiveActivity.swift';
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
