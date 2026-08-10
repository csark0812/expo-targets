import path from 'node:path';
import {
  type ConfigPlugin,
  IOSConfig,
  withDangerousMod,
} from '@expo/config-plugins';

import type { ExtensionType } from '../../config';
import type { Logger } from '../../logger';
import { applyPodfilePlan } from '../apply/podfile';
import { readPodsRb } from '../observe/podsRb';
import { planPodfile } from '../plan/podfile';
import { File } from '../utils/index';

const { getProjectName } = IOSConfig.XcodeUtils;

/**
 * Add a target block to the app's Podfile: read the Podfile, plan the target
 * entry, apply it, write it back.
 */
export const withTargetPodfile: ConfigPlugin<{
  targetName: string;
  deploymentTarget: string;
  extensionType: ExtensionType;
  excludedPackages?: string[];
  standalone?: boolean;
  expoUiWidget?: boolean;
  targetDirectory?: string;
  logger: Logger;
}> = (config, props) =>
  withDangerousMod(config, [
    'ios',
    async (config) => {
      const { projectRoot, platformProjectRoot } = config.modRequest;
      const podfilePath = path.join(platformProjectRoot, 'Podfile');
      const podfile = File.readFileIfExists(podfilePath);

      if (!podfile) {
        throw new Error(`Podfile not found at ${podfilePath}`);
      }

      const plan = planPodfile({
        targetName: props.targetName,
        deploymentTarget: props.deploymentTarget,
        extensionType: props.extensionType,
        standalone: Boolean(props.standalone),
        expoUiWidget: Boolean(props.expoUiWidget),
        excludedPackages: props.excludedPackages,
        podsRbContent: readPodsRb({
          projectRoot,
          targetDirectory: props.targetDirectory,
        }),
      });

      if (plan.podsRbContent) {
        props.logger.log(`Found pods.rb for ${plan.targetName}`);
      }

      File.writeFileSafe(
        podfilePath,
        applyPodfilePlan(podfile, plan, {
          mainTargetName: getProjectName(projectRoot),
          logger: props.logger,
        })
      );

      return config;
    },
  ]);
