import {
  APP_GROUP_ENTITLEMENT_KEY,
  ensureAppGroupOnExpo,
  ensurePluginOnExpo,
  findJsonExpoConfig,
  hasJsExpoConfig,
  readBundleIdentifier,
  writeJsonExpoConfig,
} from './expoConfigIO';

const PLUGIN_SNIPPET = `Add to your app config plugins array:
  "plugins": ["expo-targets"]`;

const APP_GROUP_SNIPPET = `Add App Groups to ios.entitlements in your app config:
  "ios": {
    "entitlements": {
      "com.apple.security.application-groups": ["group.<bundleIdentifier>"]
    }
  }`;

export type ExpoWireResult =
  | { ok: true; pluginAdded?: boolean; appGroupAdded?: boolean }
  | { ok: false; reason: 'js-config'; snippet: string };

function inventAppGroup(bundleId: string): string {
  return `group.${bundleId}`;
}

export function wireExpoConfig(projectRoot: string): ExpoWireResult {
  if (hasJsExpoConfig(projectRoot)) {
    return {
      ok: false,
      reason: 'js-config',
      snippet: `${PLUGIN_SNIPPET}\n\n${APP_GROUP_SNIPPET}`,
    };
  }

  const jsonConfig = findJsonExpoConfig(projectRoot);
  if (!jsonConfig) {
    return {
      ok: false,
      reason: 'js-config',
      snippet: `Create app.json with expo.plugins and ios.entitlements.\n\n${PLUGIN_SNIPPET}\n\n${APP_GROUP_SNIPPET}`,
    };
  }

  const { path: configPath, expo } = jsonConfig;
  const pluginAdded = ensurePluginOnExpo(expo);

  let appGroupAdded = false;
  const bundleId = readBundleIdentifier(expo);
  if (bundleId) {
    appGroupAdded = ensureAppGroupOnExpo(expo, inventAppGroup(bundleId));
  }

  if (pluginAdded || appGroupAdded) {
    writeJsonExpoConfig(configPath, expo);
  }

  return { ok: true, pluginAdded, appGroupAdded };
}

export function formatAppGroupSnippet(bundleId: string): string {
  return `  "${APP_GROUP_ENTITLEMENT_KEY}": ["group.${bundleId}"]`;
}
