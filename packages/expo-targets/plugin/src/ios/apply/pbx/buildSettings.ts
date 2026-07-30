import type { XcodeProject } from '@expo/config-plugins';

import type { XcodeTarget } from './types';

/**
 * Reading and writing XCBuildConfiguration build settings.
 */

/**
 * Settings worth naming individually in verbose output — they are the two that
 * commonly break an extension build when they drift from the host app.
 */
const VERBOSE_LOGGED_SETTINGS = new Set([
  'SWIFT_VERSION',
  'IPHONEOS_DEPLOYMENT_TARGET',
]);

function writeBuildSettings({
  configSection,
  buildSettings,
  verboseLogger,
}: {
  configSection: any;
  buildSettings: Record<string, string | string[]>;
  verboseLogger?: { log: (message: string) => void };
}): void {
  for (const [key, value] of Object.entries(buildSettings)) {
    configSection.buildSettings[key] = value;
    if (VERBOSE_LOGGED_SETTINGS.has(key)) {
      verboseLogger?.log(`    Set ${key}=${value} to ${configSection.name}`);
    }
  }
}

/**
 * Apply build settings to all configurations of a target.
 */
export function applyBuildSettings({
  project,
  target,
  buildSettings,
  verbose = false,
  logger,
}: {
  project: XcodeProject;
  target: XcodeTarget;
  buildSettings: Record<string, string | string[]>;
  verbose?: boolean;
  logger?: { log: (message: string) => void };
}): void {
  const xcodeProject = project as any;

  const targetBuildConfigId =
    target.pbxNativeTarget?.buildConfigurationList ||
    target.target?.buildConfigurationList;

  const buildConfigList =
    xcodeProject.pbxXCConfigurationList()[targetBuildConfigId];

  if (!buildConfigList?.buildConfigurations) {
    logger?.log('No build configurations found for target');
    return;
  }

  const verboseLogger = verbose ? logger : undefined;

  for (const config of buildConfigList.buildConfigurations) {
    const configSection =
      xcodeProject.pbxXCBuildConfigurationSection()[config.value];

    verboseLogger?.log(`  Configuring ${configSection?.name} build settings`);

    if (configSection?.buildSettings) {
      writeBuildSettings({ configSection, buildSettings, verboseLogger });
    }
  }
}

/**
 * Remove a build setting from all configurations of a target.
 */
export function removeBuildSetting({
  project,
  target,
  settingKey,
  verbose = false,
  logger,
}: {
  project: XcodeProject;
  target: XcodeTarget;
  settingKey: string;
  verbose?: boolean;
  logger?: { log: (message: string) => void };
}): void {
  const xcodeProject = project as any;

  const targetBuildConfigId =
    target.pbxNativeTarget?.buildConfigurationList ||
    target.target?.buildConfigurationList;

  const buildConfigList =
    xcodeProject.pbxXCConfigurationList()[targetBuildConfigId];

  if (!buildConfigList?.buildConfigurations) {
    return;
  }

  const verboseLogger = verbose ? logger : undefined;

  for (const config of buildConfigList.buildConfigurations) {
    const configSection =
      xcodeProject.pbxXCBuildConfigurationSection()[config.value];

    if (configSection?.buildSettings?.[settingKey]) {
      delete configSection.buildSettings[settingKey];
      verboseLogger?.log(
        `    Removed ${settingKey} from ${configSection.name}`
      );
    }
  }
}

/**
 * Get build settings from the main app target.
 */
export function getMainAppBuildSettings({
  project,
  mainTarget,
}: {
  project: XcodeProject;
  mainTarget: { uuid: string; target: any };
}): Record<string, any> {
  const xcodeProject = project as any;

  const mainTargetBuildConfigId = mainTarget.target?.buildConfigurationList;
  const mainBuildConfigList =
    xcodeProject.pbxXCConfigurationList()[mainTargetBuildConfigId];
  const mainBuildConfig = mainBuildConfigList?.buildConfigurations?.[0]?.value;

  return mainBuildConfig
    ? xcodeProject.pbxXCBuildConfigurationSection()[mainBuildConfig]
        ?.buildSettings || {}
    : {};
}
