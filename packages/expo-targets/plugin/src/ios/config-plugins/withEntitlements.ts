import path from 'node:path';
import { type ConfigPlugin, withDangerousMod } from '@expo/config-plugins';

import type { ExtensionType } from '../../config';
import { APP_GROUP_ENTITLEMENT_KEY } from '../../domain';
import type { Logger } from '../../logger';
import { writeEntitlements } from '../apply/fs';
import { planEntitlements } from '../plan/entitlements';

/**
 * Generate `generated.entitlements` for a target in its build directory.
 */
export const withTargetEntitlements: ConfigPlugin<{
  targetName: string;
  targetDirectory: string;
  type: ExtensionType;
  entitlements?: Record<string, any>;
  logger: Logger;
  buildSubdirectory?: string;
}> = (config, props) =>
  withDangerousMod(config, [
    'ios',
    async (config) => {
      const { projectRoot } = config.modRequest;

      const plan = planEntitlements({
        type: props.type,
        entitlements: props.entitlements,
        mainBundleIdentifier: config.ios?.bundleIdentifier,
        mainAppGroups: config.ios?.entitlements?.[APP_GROUP_ENTITLEMENT_KEY] as
          | string[]
          | undefined,
        paths: {
          projectRoot,
          targetDirectory: props.targetDirectory,
          buildSubdirectory: props.buildSubdirectory,
        },
      });

      if (!writeEntitlements(plan)) {
        props.logger.log(
          `Skipping entitlements for asset-only target ${props.targetName}`
        );
        return config;
      }

      if (plan.syncedAppGroups) {
        props.logger.log(`Syncing app groups to ${props.targetName}`);
      }
      props.logger.log(
        `Generated entitlements: ${path.relative(projectRoot, plan.path)}`
      );

      return config;
    },
  ]);
