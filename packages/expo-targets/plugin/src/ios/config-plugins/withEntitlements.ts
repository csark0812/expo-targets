import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import path from 'path';

import type { ExtensionType } from '../../config';
import { Logger } from '../../logger';
import { TYPE_CHARACTERISTICS } from '../target';
import { Plist, Paths } from '../utils';

export const withTargetEntitlements: ConfigPlugin<{
  targetName: string;
  targetDirectory: string;
  type: ExtensionType;
  entitlements?: Record<string, any>;
  logger: Logger;
}> = (config, props) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const typeConfig = TYPE_CHARACTERISTICS[props.type];

      // Asset-only targets don't need entitlements
      if (!typeConfig.requiresEntitlements) {
        props.logger.log(
          `Skipping entitlements for asset-only target ${props.targetName}`
        );
        return config;
      }

      let entitlements = props.entitlements || {};

      // Add App Clip specific entitlements
      if (props.type === 'clip') {
        entitlements = Plist.mergeAppClipEntitlements(
          entitlements,
          config.ios!.bundleIdentifier!
        );
      }

      // Sync App Groups if needed
      if (Plist.shouldUseAppGroups(props.type)) {
        const mainAppGroups = config.ios?.entitlements?.[
          'com.apple.security.application-groups'
        ] as string[] | undefined;

        entitlements = Plist.syncAppGroups({
          targetEntitlements: entitlements,
          mainAppGroups,
        });

        if (mainAppGroups && mainAppGroups.length > 0) {
          props.logger.log(`Syncing app groups to ${props.targetName}`);
        }
      }

      // NEW: Generate entitlements in targets/TARGETNAME/ios/build/
      const entitlementsPath = Paths.getTargetEntitlementsPath({
        projectRoot: config.modRequest.projectRoot,
        targetDirectory: props.targetDirectory,
      });

      Plist.writePlist(entitlementsPath, entitlements);
      props.logger.log(
        `Generated entitlements: ${path.relative(config.modRequest.projectRoot, entitlementsPath)}`
      );

      return config;
    },
  ]);
};
