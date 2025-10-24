import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import plist from '@expo/plist';
import fs from 'fs';
import path from 'path';

import type { ExtensionType } from '../config';
import { SHOULD_USE_APP_GROUPS_BY_DEFAULT } from './target';

export const withTargetEntitlements: ConfigPlugin<{
  targetName: string;
  targetDirectory: string;
  type: ExtensionType;
  entitlements?: Record<string, any>;
}> = (config, props) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const entitlements = props.entitlements || {};

      if (props.type === 'clip') {
        entitlements['com.apple.developer.parent-application-identifiers'] = [
          `$(AppIdentifierPrefix)${config.ios!.bundleIdentifier!}`,
        ];
      }

      const APP_GROUP_KEY = 'com.apple.security.application-groups';
      if (
        !entitlements[APP_GROUP_KEY] &&
        SHOULD_USE_APP_GROUPS_BY_DEFAULT[props.type]
      ) {
        const mainAppGroups = config.ios?.entitlements?.[APP_GROUP_KEY];
        if (Array.isArray(mainAppGroups) && mainAppGroups.length > 0) {
          entitlements[APP_GROUP_KEY] = mainAppGroups;
          console.log(
            `[expo-targets] Syncing app groups to ${props.targetName}`
          );
        }
      }

      const entitlementsPath = path.join(
        config.modRequest.projectRoot,
        props.targetDirectory,
        'ios',
        'build',
        'generated.entitlements'
      );

      fs.mkdirSync(path.dirname(entitlementsPath), { recursive: true });
      fs.writeFileSync(entitlementsPath, plist.build(entitlements));

      return config;
    },
  ]);
};
