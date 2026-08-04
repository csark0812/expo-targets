/**
 * Inject App Shortcuts into the *main app* target.
 *
 * AppIntentHost (Expo pod) emits autoShortcuts in its sidecar Metadata, but
 * Xcode does not merge those into ETAppIntent.app/Metadata.appintents — only
 * actions merge. Shortcuts Library needs autoShortcuts on the app bundle.
 */
const {
  createRunOncePlugin,
  withDangerousMod,
  withXcodeProject,
} = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const SWIFT = `import AppIntents
import Foundation

private let appGroupId = "group.com.expotargets.example.app-intent"

/// Host-target App Shortcut — must live in the main app binary for Shortcuts
/// Library listing + run (appex-only → Unable to run; pod-only → no autoShortcuts).
struct ETHostGreetIntent: AppIntent {
  static var title: LocalizedStringResource = "ET Greet"
  static var description = IntentDescription(
    "Returns a greeting from the expo-targets app-intent example."
  )
  static var openAppWhenRun: Bool = true

  func perform() async throws -> some IntentResult & ReturnsValue<String> {
    let defaults = UserDefaults(suiteName: appGroupId)
    defaults?.set("ET AppIntent", forKey: "ai:marker")
    defaults?.set("Hello from ET AppIntent", forKey: "ai:result")
    defaults?.set(Date().timeIntervalSince1970, forKey: "ai:lastAt")
    defaults?.synchronize()
    return .result(value: "Hello from ET AppIntent")
  }
}

struct ETHostAppShortcuts: AppShortcutsProvider {
  static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: ETHostGreetIntent(),
      phrases: [
        "Say hello in \\(.applicationName)",
        "Greet me in \\(.applicationName)",
        "Hello in \\(.applicationName)",
      ],
      shortTitle: "ET Greet",
      systemImageName: "hand.wave"
    )
  }
}
`;

function withHostAppShortcuts(config) {
  config = withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const projectRoot = cfg.modRequest.platformProjectRoot;
      const projectName = cfg.modRequest.projectName;
      if (!projectName) return cfg;
      const dest = path.join(projectRoot, projectName, 'ETAppShortcuts.swift');
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, SWIFT);
      return cfg;
    },
  ]);

  config = withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const projectName = cfg.modRequest.projectName;
    if (!projectName) return cfg;
    const filePath = `${projectName}/ETAppShortcuts.swift`;
    if (!project.hasFile(filePath)) {
      const groupKey =
        project.findPBXGroupKey({ name: projectName }) ||
        project.findPBXGroupKey({ path: projectName });
      project.addSourceFile(filePath, null, groupKey);
    }
    return cfg;
  });

  return config;
}

module.exports = createRunOncePlugin(
  withHostAppShortcuts,
  'with-host-app-shortcuts',
  '1.0.0',
);
