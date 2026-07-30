import type { XcodeProject } from '@expo/config-plugins';

import type { XcodeTarget } from './types';

/**
 * Reading and writing XCBuildConfiguration build settings.
 */

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
    if (logger) {
      logger.log('No build configurations found for target');
    } else {
    }
    return;
  }

  // biome-ignore lint/complexity/noForEach: pre-existing; prefer for-of tracked
  buildConfigList.buildConfigurations.forEach((config: any) => {
    const configSection =
      xcodeProject.pbxXCBuildConfigurationSection()[config.value];
    const configName = configSection?.name;

    if (verbose) {
      if (logger) {
        logger.log(`  Configuring ${configName} build settings`);
      } else {
      }
    }

    if (configSection?.buildSettings) {
      // biome-ignore lint/complexity/noForEach: pre-existing; prefer for-of tracked
      Object.entries(buildSettings).forEach(([key, value]) => {
        configSection.buildSettings[key] = value;
        if (
          verbose &&
          (key === 'SWIFT_VERSION' || key === 'IPHONEOS_DEPLOYMENT_TARGET')
        ) {
          if (logger) {
            logger.log(`    Set ${key}=${value} to ${configName}`);
          } else {
          }
        }
      });
    }
  });
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

  // biome-ignore lint/complexity/noForEach: pre-existing; prefer for-of tracked
  buildConfigList.buildConfigurations.forEach((config: any) => {
    const configSection =
      xcodeProject.pbxXCBuildConfigurationSection()[config.value];

    if (configSection?.buildSettings?.[settingKey]) {
      delete configSection.buildSettings[settingKey];
      if (verbose) {
        if (logger) {
          logger.log(`    Removed ${settingKey} from ${configSection.name}`);
        } else {
        }
      }
    }
  });
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
