#!/usr/bin/env bun
/**
 * Scaffold production example hosts + register REQUIRED_V2 / catalog / journeys.
 * Idempotent for existing paths.
 *
 * Usage: bun scripts/scaffold-examples.ts
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dir, "..");
const SHARE_ASSETS = path.join(ROOT, "examples/share/assets");

type RnTrack = "dual" | "native-only" | "rn-only";

type Spec = {
  id: string;
  type: string;
  phase: 4 | 5;
  track: RnTrack;
  displayName: string;
  /** Principal / handler class hint for Swift stub */
  principal: string;
  frameworks?: string[];
  extensionPoint: string;
  productType?: string;
  osLimitReason?: string;
  /** Extra target config JSON fields */
  extraTargetConfig?: Record<string, unknown>;
  walletUi?: boolean;
};

/** M1–M3 specs (types already in ExtensionType or added by this epic). */
const SPECS: Spec[] = [
  // T1
  {
    id: "notification-service",
    type: "notification-service",
    phase: 4,
    track: "native-only",
    displayName: "ET NSE",
    principal: "NotificationService",
    extensionPoint: "com.apple.usernotifications.service",
    frameworks: [],
  },
  {
    id: "notification-content",
    type: "notification-content",
    phase: 4,
    track: "dual",
    displayName: "ET NCE",
    principal: "NotificationViewController",
    extensionPoint: "com.apple.usernotifications.content-extension",
    frameworks: ["UserNotifications", "UserNotificationsUI"],
  },
  // T2
  {
    id: "wallet",
    type: "wallet",
    phase: 4,
    track: "native-only",
    displayName: "ET Wallet",
    principal: "PassProvider",
    extensionPoint: "com.apple.PassKit.issuer-provisioning",
    frameworks: ["PassKit"],
    walletUi: true,
    osLimitReason:
      "PassKit issuer provisioning requires Apple entitlement allow-list",
  },
  {
    id: "native-clip",
    type: "clip",
    phase: 4,
    track: "rn-only",
    displayName: "ET N Clip",
    principal: "ClipApp",
    extensionPoint: "",
    productType: "com.apple.product-type.application.on-demand-install-capable",
    // existing example — promote only
  },
  // T3
  {
    id: "safari",
    type: "safari",
    phase: 4,
    track: "dual",
    displayName: "ET Safari",
    principal: "SafariWebExtensionHandler",
    extensionPoint: "com.apple.Safari.web-extension",
  },
  {
    id: "content-blocker",
    type: "content-blocker",
    phase: 4,
    track: "native-only",
    displayName: "ET Blocker",
    principal: "ContentBlockerRequestHandler",
    extensionPoint: "com.apple.Safari.content-blocker",
  },
  // T4
  {
    id: "app-intent",
    type: "app-intent",
    phase: 5,
    track: "native-only",
    displayName: "ET AppIntent",
    principal: "AppIntentExtension",
    extensionPoint: "com.apple.appintents-extension",
    productType: "com.apple.product-type.extensionkit-extension",
    frameworks: ["AppIntents"],
  },
  {
    id: "intent",
    type: "intent",
    phase: 5,
    track: "native-only",
    displayName: "ET Intent",
    principal: "IntentHandler",
    extensionPoint: "com.apple.intents-service",
    frameworks: ["Intents"],
    walletUi: false,
    extraTargetConfig: { ios: { intents: { ui: true } } },
  },
  // T5
  {
    id: "credentials-provider",
    type: "credentials-provider",
    phase: 5,
    track: "native-only",
    displayName: "ET Creds",
    principal: "CredentialProviderViewController",
    extensionPoint: "com.apple.authentication-services-credential-provider-ui",
    osLimitReason: "AutoFill Settings toggle / ASCredentialProvider UI gated",
  },
  {
    id: "account-auth",
    type: "account-auth",
    phase: 5,
    track: "native-only",
    displayName: "ET AcctAuth",
    principal: "AccountAuthViewController",
    extensionPoint:
      "com.apple.authentication-services-account-authentication-modification-ui",
    osLimitReason: "Account auth modification requires system Settings",
  },
  {
    id: "authentication-services",
    type: "authentication-services",
    phase: 5,
    track: "native-only",
    displayName: "ET AuthSvc",
    principal: "AuthenticationServicesHandler",
    extensionPoint: "com.apple.AppSSO.idp-extension",
    frameworks: ["AuthenticationServices"],
    osLimitReason: "SSO / AppSSO entitlement gated",
  },
  // T6
  {
    id: "photo-editing",
    type: "photo-editing",
    phase: 5,
    track: "native-only",
    displayName: "ET PhotoEdit",
    principal: "PhotoEditingViewController",
    extensionPoint: "com.apple.photo-editing",
    frameworks: ["Photos", "PhotosUI"],
  },
  {
    id: "file-provider",
    type: "file-provider",
    phase: 5,
    track: "native-only",
    displayName: "ET FileProv",
    principal: "FileProviderExtension",
    extensionPoint: "com.apple.fileprovider-nonui",
    frameworks: ["UniformTypeIdentifiers"],
  },
  {
    id: "file-provider-ui",
    type: "file-provider-ui",
    phase: 5,
    track: "native-only",
    displayName: "ET FileProvUI",
    principal: "DocumentActionViewController",
    extensionPoint: "com.apple.fileprovider-actionsui",
    frameworks: ["FileProviderUI"],
  },
  {
    id: "quicklook-thumbnail",
    type: "quicklook-thumbnail",
    phase: 5,
    track: "native-only",
    displayName: "ET QLThumb",
    principal: "ThumbnailProvider",
    extensionPoint: "com.apple.quicklook.thumbnail",
    frameworks: ["QuickLookThumbnailing"],
  },
  {
    id: "quicklook-preview",
    type: "quicklook-preview",
    phase: 5,
    track: "native-only",
    displayName: "ET QLPreview",
    principal: "PreviewViewController",
    extensionPoint: "com.apple.quicklook.preview",
    frameworks: ["QuickLook"],
  },
  // T7
  {
    id: "call-directory",
    type: "call-directory",
    phase: 5,
    track: "native-only",
    displayName: "ET CallDir",
    principal: "CallDirectoryHandler",
    extensionPoint: "com.apple.callkit.call-directory",
    frameworks: ["CallKit"],
    osLimitReason: "Call Directory Settings enablement",
  },
  {
    id: "message-filter",
    type: "message-filter",
    phase: 5,
    track: "native-only",
    displayName: "ET MsgFilter",
    principal: "MessageFilterExtension",
    extensionPoint: "com.apple.identitylookup.message-filter",
    frameworks: ["IdentityLookup"],
  },
  {
    id: "unwanted-communication",
    type: "unwanted-communication",
    phase: 5,
    track: "native-only",
    displayName: "ET Unwanted",
    principal: "UnwantedCommunicationReportingExtension",
    extensionPoint: "com.apple.identitylookup.classification-ui",
    frameworks: ["IdentityLookup", "IdentityLookupUI"],
  },
  {
    id: "keyboard",
    type: "keyboard",
    phase: 5,
    track: "native-only",
    displayName: "ET Keyboard",
    principal: "KeyboardViewController",
    extensionPoint: "com.apple.keyboard-service",
  },
  // T8
  {
    id: "broadcast-upload",
    type: "broadcast-upload",
    phase: 5,
    track: "native-only",
    displayName: "ET Broadcast",
    principal: "SampleHandler",
    extensionPoint: "com.apple.broadcast-services-upload",
    frameworks: ["ReplayKit"],
  },
  {
    id: "broadcast-setup-ui",
    type: "broadcast-setup-ui",
    phase: 5,
    track: "native-only",
    displayName: "ET BroadcastUI",
    principal: "BroadcastSetupViewController",
    extensionPoint: "com.apple.broadcast-services-setupui",
    frameworks: ["ReplayKit"],
  },
  // T9
  {
    id: "device-activity-monitor",
    type: "device-activity-monitor",
    phase: 5,
    track: "native-only",
    displayName: "ET DevAct",
    principal: "DeviceActivityMonitorExtension",
    extensionPoint: "com.apple.deviceactivity.monitor-extension",
    frameworks: ["DeviceActivity"],
    osLimitReason: "Family Controls / DeviceActivity entitlement",
  },
  {
    id: "shield-action",
    type: "shield-action",
    phase: 5,
    track: "native-only",
    displayName: "ET ShieldAct",
    principal: "ShieldActionExtension",
    extensionPoint: "com.apple.ManagedSettings.shield-action-service",
    frameworks: ["ManagedSettings"],
    osLimitReason: "Family Controls / ManagedSettings entitlement",
  },
  {
    id: "shield-config",
    type: "shield-config",
    phase: 5,
    track: "native-only",
    displayName: "ET ShieldCfg",
    principal: "ShieldConfigurationExtension",
    extensionPoint: "com.apple.ManagedSettingsUI.shield-configuration-service",
    frameworks: ["ManagedSettings", "ManagedSettingsUI"],
    osLimitReason: "Family Controls / ManagedSettings entitlement",
  },
  // T10
  {
    id: "network-packet-tunnel",
    type: "network-packet-tunnel",
    phase: 5,
    track: "native-only",
    displayName: "ET NETunnel",
    principal: "PacketTunnelProvider",
    extensionPoint: "com.apple.networkextension.packet-tunnel",
    frameworks: ["NetworkExtension"],
    osLimitReason: "Network Extension entitlement / VPN personal",
  },
  {
    id: "network-app-proxy",
    type: "network-app-proxy",
    phase: 5,
    track: "native-only",
    displayName: "ET NEProxy",
    principal: "AppProxyProvider",
    extensionPoint: "com.apple.networkextension.app-proxy",
    frameworks: ["NetworkExtension"],
    osLimitReason: "Network Extension entitlement",
  },
  {
    id: "network-dns-proxy",
    type: "network-dns-proxy",
    phase: 5,
    track: "native-only",
    displayName: "ET NEDNS",
    principal: "DNSProxyProvider",
    extensionPoint: "com.apple.networkextension.dns-proxy",
    frameworks: ["NetworkExtension"],
    osLimitReason: "Network Extension entitlement",
  },
  {
    id: "network-filter-data",
    type: "network-filter-data",
    phase: 5,
    track: "native-only",
    displayName: "ET NEFilter",
    principal: "FilterDataProvider",
    extensionPoint: "com.apple.networkextension.filter-data",
    frameworks: ["NetworkExtension"],
    osLimitReason: "Network Extension entitlement",
  },
  // T11
  {
    id: "spotlight",
    type: "spotlight",
    phase: 5,
    track: "native-only",
    displayName: "ET Spotlight",
    principal: "IndexRequestHandler",
    extensionPoint: "com.apple.spotlight.import",
  },
  {
    id: "spotlight-delegate",
    type: "spotlight-delegate",
    phase: 5,
    track: "native-only",
    displayName: "ET SpotDel",
    principal: "SpotlightDelegate",
    extensionPoint: "com.apple.spotlight.index",
    frameworks: ["CoreSpotlight"],
  },
  {
    id: "bg-download",
    type: "bg-download",
    phase: 5,
    track: "native-only",
    displayName: "ET BgDL",
    principal: "BackgroundDownloadHandler",
    extensionPoint: "com.apple.background-asset-downloader-extension",
  },
  {
    id: "location-push",
    type: "location-push",
    phase: 5,
    track: "native-only",
    displayName: "ET LocPush",
    principal: "LocationPushService",
    extensionPoint: "com.apple.location.push.service",
    osLimitReason: "Location push special entitlement",
  },
  {
    id: "matter",
    type: "matter",
    phase: 5,
    track: "native-only",
    displayName: "ET Matter",
    principal: "MatterSupportExtension",
    extensionPoint: "com.apple.matter.support.extension.device-setup",
  },
  {
    id: "classkit-context",
    type: "classkit-context",
    phase: 5,
    track: "native-only",
    displayName: "ET ClassKit",
    principal: "ClassKitContextProvider",
    extensionPoint: "com.apple.classkit.context-provider",
    frameworks: ["ClassKit"],
  },
  {
    id: "print-service",
    type: "print-service",
    phase: 5,
    track: "native-only",
    displayName: "ET Print",
    principal: "PrinterExtension",
    extensionPoint: "com.apple.printing.discovery",
  },
  {
    id: "smart-card",
    type: "smart-card",
    phase: 5,
    track: "native-only",
    displayName: "ET SmartCard",
    principal: "Token",
    extensionPoint: "com.apple.ctk-tokens",
    frameworks: ["CryptoTokenKit"],
  },
  {
    id: "virtual-conference",
    type: "virtual-conference",
    phase: 5,
    track: "native-only",
    displayName: "ET VirtConf",
    principal: "VirtualConferenceProvider",
    extensionPoint: "com.apple.calendar.virtualconference",
  },
  // T12
  {
    id: "watch",
    type: "watch",
    phase: 5,
    track: "native-only",
    displayName: "ET Watch",
    principal: "WatchApp",
    extensionPoint: "",
    productType: "com.apple.product-type.application",
    osLimitReason: "Requires paired watchOS simulator or device for full DoD",
  },
  {
    id: "watch-widget",
    type: "watch-widget",
    phase: 5,
    track: "native-only",
    displayName: "ET WatchW",
    principal: "WatchWidget",
    extensionPoint: "com.apple.widgetkit-extension",
    frameworks: ["WidgetKit", "SwiftUI"],
    osLimitReason: "Requires paired watchOS simulator or device",
  },
];

function kebabToPascal(s: string): string {
  return s
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
}

function writeIfMissing(file: string, contents: string) {
  if (fs.existsSync(file)) return false;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
  return true;
}

function copyAssets(destDir: string) {
  const assets = path.join(destDir, "assets");
  fs.mkdirSync(assets, { recursive: true });
  for (const name of ["icon.png", "adaptive-icon.png", "splash-icon.png"]) {
    const src = path.join(SHARE_ASSETS, name);
    const dst = path.join(assets, name);
    if (fs.existsSync(src) && !fs.existsSync(dst)) {
      fs.copyFileSync(src, dst);
    }
  }
}

function swiftStub(spec: Spec, pascal: string): string {
  if (spec.type === "notification-service") {
    return `import UserNotifications

class ${spec.principal}: UNNotificationServiceExtension {
  var contentHandler: ((UNNotificationContent) -> Void)?
  var bestAttemptContent: UNMutableNotificationContent?

  override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    self.contentHandler = contentHandler
    bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)
    if let bestAttemptContent {
      bestAttemptContent.title = "\\(bestAttemptContent.title) [expo-targets]"
      contentHandler(bestAttemptContent)
    }
  }

  override func serviceExtensionTimeWillExpire() {
    if let contentHandler, let bestAttemptContent {
      contentHandler(bestAttemptContent)
    }
  }
}
`;
  }
  if (spec.type === "content-blocker") {
    return `import Foundation

class ${spec.principal}: NSObject, NSExtensionRequestHandling {
  func beginRequest(with context: NSExtensionContext) {
    let attachment = NSItemProvider(
      contentsOf: Bundle.main.url(forResource: "blockerList", withExtension: "json")
    )!
    let item = NSExtensionItem()
    item.attachments = [attachment]
    context.completeRequest(returningItems: [item], completionHandler: nil)
  }
}
`;
  }
  if (spec.type === "wallet") {
    return `import PassKit

class ${spec.principal}: PKIssuerProvisioningExtensionHandler {
  override func status(completion: @escaping (PKIssuerProvisioningExtensionStatus) -> Void) {
    let status = PKIssuerProvisioningExtensionStatus()
    status.passEntriesAvailable = false
    status.remotePassEntriesAvailable = false
    status.requiresAuthentication = false
    completion(status)
  }
}
`;
  }
  return `import Foundation
import UIKit

/// Minimal ${spec.type} stub for expo-targets example (${pascal}).
@objc(${spec.principal})
class ${spec.principal}: NSObject {
  // Extension principal — replace with full Apple API conformance as needed.
}
`;
}

function hostAppTsx(spec: Spec, bundleSuffix: string): string {
  return `import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>${spec.displayName}</Text>
      <Text testID="status-target-ready">ready</Text>
      <Text testID="text-extension-type">${spec.type}</Text>
      <Text testID="text-bundle-suffix">${bundleSuffix}</Text>
      <Text testID="btn-clear-payload">clear</Text>
      <Text testID="text-last-payload">none</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
});
`;
}

function scaffoldHost(
  relDir: string,
  spec: Spec,
  opts: { native: boolean; targetFolder: string },
) {
  const abs = path.join(ROOT, relDir);
  if (spec.id === "native-clip") {
    // promote existing
    return abs;
  }
  fs.mkdirSync(abs, { recursive: true });
  copyAssets(abs);

  const slug = path.basename(relDir);
  const bundleId = opts.native
    ? `com.expotargets.example.native.${spec.id.replace(/^native-/, "")}`
    : `com.expotargets.example.${spec.id}`;
  const group = `group.${bundleId}`;
  const pkgName = `@expo-targets/example-${opts.native ? "native-" : ""}${spec.id}`;

  writeIfMissing(
    path.join(abs, "package.json"),
    JSON.stringify(
      {
        name: pkgName,
        version: "1.0.0",
        private: true,
        main: "index.ts",
        scripts: {
          start: "expo start",
          ios: "expo run:ios",
          android: "expo run:android",
        },
        dependencies: {
          expo: "~57.0.9",
          "expo-status-bar": "~57.0.1",
          "expo-splash-screen": "~57.0.5",
          "expo-targets": "workspace:*",
          react: "19.2.3",
          "react-native": "0.86.2",
        },
        devDependencies: {
          "@babel/core": "^7.29.0",
          "@types/react": "~19.2.0",
          typescript: "~6.0.3",
        },
      },
      null,
      2,
    ) + "\n",
  );

  const appJson: Record<string, unknown> = {
    expo: {
      name: opts.native ? `${spec.displayName} N` : spec.displayName,
      slug: `example-${slug}`,
      version: "1.0.0",
      orientation: "portrait",
      icon: "./assets/icon.png",
      userInterfaceStyle: "light",
      ios: {
        supportsTablet: true,
        bundleIdentifier: bundleId,
        deploymentTarget: "16.4",
        entitlements: {
          "com.apple.security.application-groups": [group],
        },
        infoPlist: {
          CFBundleDisplayName: opts.native
            ? `${spec.displayName} N`
            : spec.displayName,
        },
      },
      plugins: [
        [
          "expo-splash-screen",
          {
            image: "./assets/splash-icon.png",
            resizeMode: "contain",
            backgroundColor: "#ffffff",
          },
        ],
        ["expo-targets", { debug: true }],
      ],
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/adaptive-icon.png",
          backgroundColor: "#ffffff",
        },
        package: bundleId,
      },
    },
  };
  writeIfMissing(
    path.join(abs, "app.json"),
    JSON.stringify(appJson, null, 2) + "\n",
  );
  writeIfMissing(path.join(abs, "App.tsx"), hostAppTsx(spec, bundleId));
  writeIfMissing(
    path.join(abs, "index.ts"),
    `import { registerRootComponent } from 'expo';\nimport App from './App';\nregisterRootComponent(App);\n`,
  );
  writeIfMissing(
    path.join(abs, "tsconfig.json"),
    JSON.stringify(
      { extends: "expo/tsconfig.base", compilerOptions: { strict: true } },
      null,
      2,
    ) + "\n",
  );
  writeIfMissing(
    path.join(abs, "metro.config.js"),
    `const { getDefaultConfig } = require('expo/metro-config');
const { withTargets } = require('expo-targets/metro');
const path = require('node:path');
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '${opts.native ? "../../.." : "../.."}');
const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
module.exports = withTargets(config, { projectRoot });
`,
  );

  const targetDir = path.join(abs, "targets", opts.targetFolder);
  const pascal = kebabToPascal(opts.targetFolder);
  const targetConfig: Record<string, unknown> = {
    type: spec.type,
    name: pascal,
    displayName: `${spec.displayName} Target`,
    platforms: ["ios"],
    appGroup: group,
    ios: {
      bundleIdentifier: `${bundleId}.${spec.type}`,
      displayName: `${spec.displayName} Target`,
      ...(spec.walletUi ? { wallet: { ui: true } } : {}),
      ...(spec.extraTargetConfig?.ios as object | undefined),
    },
  };
  if (spec.type === "safari" && !opts.native) {
    targetConfig.entry = `./targets/${opts.targetFolder}/index.tsx`;
  }
  writeIfMissing(
    path.join(targetDir, "expo-target.config.json"),
    JSON.stringify(targetConfig, null, 2) + "\n",
  );
  writeIfMissing(
    path.join(targetDir, "ios", `${spec.principal}.swift`),
    swiftStub(spec, pascal),
  );
  if (spec.type === "content-blocker") {
    writeIfMissing(
      path.join(targetDir, "ios", "blockerList.json"),
      JSON.stringify(
        [
          {
            action: { type: "block" },
            trigger: { "url-filter": ".*ads\\.example\\.com.*" },
          },
        ],
        null,
        2,
      ) + "\n",
    );
  }
  if (spec.type === "safari" && !opts.native) {
    writeIfMissing(
      path.join(targetDir, "index.tsx"),
      `import { AppRegistry } from 'react-native';
import React from 'react';
import { Text, View } from 'react-native';
function SafariExt() {
  return (
    <View>
      <Text>Safari RN Web</Text>
    </View>
  );
}
AppRegistry.registerComponent('${pascal}', () => SafariExt);
`,
    );
  }
  writeIfMissing(
    path.join(targetDir, "index.ts"),
    `import { createTarget } from 'expo-targets';\nexport const target = createTarget('${pascal}');\n`,
  );
  return abs;
}

const created: string[] = [];
const rows: { id: string; path: string; phase: number }[] = [];
const claims: { id: string; reason: string }[] = [];
const _catalogEntries: string[] = [];

for (const spec of SPECS) {
  if (spec.id === "native-clip") {
    rows.push({
      id: "native-clip",
      path: "examples/native/clip",
      phase: spec.phase,
    });
    continue;
  }

  if (spec.track === "dual") {
    const rnPath = `examples/${spec.id}`;
    scaffoldHost(rnPath, spec, { native: false, targetFolder: spec.id });
    created.push(rnPath);
    rows.push({ id: spec.id, path: rnPath, phase: spec.phase });

    const nPath = `examples/native/${spec.id}`;
    scaffoldHost(nPath, spec, {
      native: true,
      targetFolder: `native-${spec.id}`,
    });
    created.push(nPath);
    rows.push({
      id: `native-${spec.id}`,
      path: nPath,
      phase: spec.phase,
    });
  } else if (spec.track === "native-only") {
    // Plan: native-only → RN host at examples/<id> embedding the native target.
    const rnPath = `examples/${spec.id}`;
    scaffoldHost(rnPath, spec, { native: false, targetFolder: spec.id });
    created.push(rnPath);
    rows.push({ id: spec.id, path: rnPath, phase: spec.phase });
  } else {
    const rnPath = `examples/${spec.id}`;
    scaffoldHost(rnPath, spec, { native: false, targetFolder: spec.id });
    created.push(rnPath);
    rows.push({ id: spec.id, path: rnPath, phase: spec.phase });
  }

  if (spec.osLimitReason) {
    claims.push({ id: spec.id, reason: spec.osLimitReason });
    if (spec.track === "dual") {
      claims.push({
        id: `native-${spec.id}`,
        reason: spec.osLimitReason,
      });
    }
  }
}

// Write generated registry fragments for merge by follow-up tooling
const outDir = path.join(ROOT, "scripts/generated");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "required-rows.json"),
  JSON.stringify(rows, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(outDir, "claims.json"),
  JSON.stringify(claims, null, 2) + "\n",
);
fs.writeFileSync(
  path.join(outDir, "created.json"),
  JSON.stringify(created, null, 2) + "\n",
);

console.log(
  JSON.stringify(
    { created: created.length, rows: rows.length, claims: claims.length },
    null,
    2,
  ),
);
