import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';

import type { ExtensionType } from '../../config';
import { Plist, Paths } from '../utils';

export const withTargetEntitlements: ConfigPlugin<{
  targetName: string;
  targetDirectory: string;
  type: ExtensionType;
  entitlements?: Record<string, any>;
}> = (config, props) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
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
        projectRoot: config.modRequest.projectRoot,
        targetDirectory: props.targetDirectory,
      });

      Plist.writePlist(entitlementsPath, entitlements);

      return config;
    },
  ]);
};
