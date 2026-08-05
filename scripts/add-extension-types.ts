#!/usr/bin/env bun
/**
 * Add gap ExtensionType entries to config.ts + characteristics.ts.
 * Idempotent: skips types already present.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const ROOT = path.resolve(import.meta.dir, "..");

type Def = {
  type: string;
  deployment: string;
  frameworks: string[];
  extensionPoint: string;
  productType?: string;
  appGroups?: boolean;
  requiresCode?: boolean;
  targetType?: "application" | "app_extension";
  embedType?: "foundation-extension" | "app-clip" | "none";
  basePlist?: Record<string, unknown>;
};

const NEW: Def[] = [
  {
    type: "content-blocker",
    deployment: "11.0",
    frameworks: [],
    extensionPoint: "com.apple.Safari.content-blocker",
  },
  {
    type: "keyboard",
    deployment: "8.0",
    frameworks: [],
    extensionPoint: "com.apple.keyboard-service",
    appGroups: true,
  },
  {
    type: "photo-editing",
    deployment: "8.0",
    frameworks: ["Photos", "PhotosUI"],
    extensionPoint: "com.apple.photo-editing",
  },
  {
    type: "file-provider",
    deployment: "11.0",
    frameworks: ["UniformTypeIdentifiers"],
    extensionPoint: "com.apple.fileprovider-nonui",
    appGroups: true,
  },
  {
    type: "file-provider-ui",
    deployment: "11.0",
    frameworks: ["FileProviderUI"],
    extensionPoint: "com.apple.fileprovider-actionsui",
  },
  {
    type: "broadcast-upload",
    deployment: "10.0",
    frameworks: ["ReplayKit"],
    extensionPoint: "com.apple.broadcast-services-upload",
  },
  {
    type: "broadcast-setup-ui",
    deployment: "10.0",
    frameworks: ["ReplayKit"],
    extensionPoint: "com.apple.broadcast-services-setupui",
  },
  {
    type: "call-directory",
    deployment: "10.0",
    frameworks: ["CallKit"],
    extensionPoint: "com.apple.callkit.call-directory",
  },
  {
    type: "message-filter",
    deployment: "11.0",
    frameworks: ["IdentityLookup"],
    extensionPoint: "com.apple.identitylookup.message-filter",
  },
  {
    type: "unwanted-communication",
    deployment: "12.0",
    frameworks: ["IdentityLookup", "IdentityLookupUI"],
    extensionPoint: "com.apple.identitylookup.classification-ui",
  },
  {
    type: "network-packet-tunnel",
    deployment: "9.0",
    frameworks: ["NetworkExtension"],
    extensionPoint: "com.apple.networkextension.packet-tunnel",
  },
  {
    type: "network-app-proxy",
    deployment: "9.0",
    frameworks: ["NetworkExtension"],
    extensionPoint: "com.apple.networkextension.app-proxy",
  },
  {
    type: "network-dns-proxy",
    deployment: "11.0",
    frameworks: ["NetworkExtension"],
    extensionPoint: "com.apple.networkextension.dns-proxy",
  },
  {
    type: "network-filter-data",
    deployment: "9.0",
    frameworks: ["NetworkExtension"],
    extensionPoint: "com.apple.networkextension.filter-data",
  },
  {
    type: "shield-action",
    deployment: "15.0",
    frameworks: ["ManagedSettings"],
    extensionPoint: "com.apple.ManagedSettings.shield-action-service",
  },
  {
    type: "shield-config",
    deployment: "15.0",
    frameworks: ["ManagedSettings", "ManagedSettingsUI"],
    extensionPoint: "com.apple.ManagedSettingsUI.shield-configuration-service",
  },
  {
    type: "classkit-context",
    deployment: "11.4",
    frameworks: ["ClassKit"],
    extensionPoint: "com.apple.classkit.context-provider",
  },
  {
    type: "authentication-services",
    deployment: "13.0",
    frameworks: ["AuthenticationServices"],
    extensionPoint: "com.apple.AppSSO.idp-extension",
  },
  {
    type: "spotlight-delegate",
    deployment: "13.0",
    frameworks: ["CoreSpotlight"],
    extensionPoint: "com.apple.spotlight.index",
  },
  {
    type: "quicklook-preview",
    deployment: "8.0",
    frameworks: ["QuickLook"],
    extensionPoint: "com.apple.quicklook.preview",
  },
  {
    type: "print-service",
    deployment: "14.0",
    frameworks: [],
    extensionPoint: "com.apple.printing.discovery",
  },
  {
    type: "smart-card",
    deployment: "10.0",
    frameworks: ["CryptoTokenKit"],
    extensionPoint: "com.apple.ctk-tokens",
  },
  {
    type: "virtual-conference",
    deployment: "15.0",
    frameworks: [],
    extensionPoint: "com.apple.calendar.virtualconference",
  },
  {
    type: "watch-widget",
    deployment: "9.0",
    frameworks: ["WidgetKit", "SwiftUI"],
    extensionPoint: "com.apple.widgetkit-extension",
    appGroups: true,
  },
];

const configPath = path.join(
  ROOT,
  "packages/expo-targets/plugin/src/config.ts",
);
const charPath = path.join(
  ROOT,
  "packages/expo-targets/plugin/src/domain/characteristics.ts",
);

let config = fs.readFileSync(configPath, "utf8");
let chars = fs.readFileSync(charPath, "utf8");

const existing = new Set(
  [...config.matchAll(/\| '([a-z0-9-]+)'/g)].map((m) => m[1]),
);

const toAdd = NEW.filter((d) => !existing.has(d.type));
if (!toAdd.length) {
  console.log("No new types to add");
  process.exit(0);
}

// Extend ExtensionType union — insert before closing of type
const unionInsert = toAdd.map((d) => `  | '${d.type}'`).join("\n");
config = config.replace(/\| 'watch';\n;/, `| 'watch'\n${unionInsert}\n;`);

// Deployment targets — before closing };
const depInsert = toAdd
  .map((d) => `  '${d.type}': '${d.deployment}',`)
  .join("\n");
config = config.replace(
  / {2}watch: '2\.0',\n\};/,
  `  watch: '2.0',\n${depInsert}\n};`,
);

const sufInsert = toAdd.map((d) => `  '${d.type}': '${d.type}',`).join("\n");
config = config.replace(
  / {2}watch: 'watch',\n\};/,
  `  watch: 'watch',\n${sufInsert}\n};`,
);

const charInsert = toAdd
  .map((d) => {
    const fw = JSON.stringify(d.frameworks);
    const pt = d.productType ?? "com.apple.product-type.app-extension";
    const ep = d.extensionPoint;
    const ag = d.appGroups ?? false;
    return `  '${d.type}': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ${fw},
    productType: '${pt}',
    extensionPointIdentifier: '${ep}',
    defaultUsesAppGroups: ${ag},
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },`;
  })
  .join("\n");

chars = chars.replace(
  / {2}watch: \{[\s\S]*?activationRulesLocation: "none",\n {2}},\n\};/,
  (m) => `${m.slice(0, -2)}\n${charInsert}\n};`,
);

fs.writeFileSync(configPath, config);
fs.writeFileSync(charPath, chars);
console.log(
  `Added ${toAdd.length} types:`,
  toAdd.map((d) => d.type),
);
