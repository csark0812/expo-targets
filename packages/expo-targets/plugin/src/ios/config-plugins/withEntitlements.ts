import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';

import type { ExtensionType } from '../../config';
import { TYPE_CHARACTERISTICS } from '../target';
import { Plist, Paths } from '../utils';

export const withTargetEntitlements: ConfigPlugin<{
  targetName: string;
  type: ExtensionType;
  entitlements?: Record<string, any>;
}> = (config, props) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const typeConfig = TYPE_CHARACTERISTICS[props.type];

      // Asset-only targets don't need entitlements
      if (!typeConfig.requiresEntitlements) {
        console.log(
          `[expo-targets] Skipping entitlements for asset-only target ${props.targetName}`
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
          console.log(
            `[expo-targets] Syncing app groups to ${props.targetName}`
          );
        }
      }

      const entitlementsPath = Paths.getGeneratedEntitlementsPath({
        platformProjectRoot: config.modRequest.platformProjectRoot,
        targetName: props.targetName,
      });

      Plist.writePlist(entitlementsPath, entitlements);

      return config;
    },
  ]);
};
