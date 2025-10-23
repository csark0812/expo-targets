import { ConfigPlugin } from '@expo/config-plugins';

import { withTargetEntitlements } from './withEntitlements';
import { withIosColorset } from './withIosColorset';
import { withTargetPodfile } from './withPodfile';
import { withXcodeChanges } from './withXcodeChanges';
import type { ExtensionType, IOSTargetConfig, Color } from '../config';

interface IOSTargetProps extends IOSTargetConfig {
  type: ExtensionType;
  name: string;
  directory: string;
  configPath: string;
}

export const withIOSTarget: ConfigPlugin<IOSTargetProps> = (config, props) => {
  const targetName = props.displayName || props.name;
  const deploymentTarget = props.deploymentTarget || '18.0';
  // Sanitize target name for Xcode (matches withXcodeChanges logic)
  const targetProductName = targetName.replace(/[^a-zA-Z0-9]/g, '');

  config = withXcodeChanges(config, props);

  // TODO: Podfile integration needs work - CocoaPods requirements for extensions
  // config = withTargetPodfile(config, {
  //   targetName: targetProductName, // Use sanitized name to match Xcode target
  //   deploymentTarget,
  //   useReactNative: props.useReactNative,
  //   excludedPackages: props.excludedPackages,
  // });

  config = withTargetEntitlements(config, {
    targetName,
    targetDirectory: props.directory,
    type: props.type,
    entitlements: props.entitlements,
  });

  if (props.colors) {
    Object.entries(props.colors).forEach(([colorName, colorValue]) => {
      if (typeof colorValue === 'string') {
        config = withIosColorset(config, {
          name: colorName,
          color: colorValue,
          targetDirectory: props.directory,
        });
      } else {
        const colorObj = colorValue as Color;
        const lightColor = colorObj.light || colorObj.color;
        const darkColor = colorObj.dark || colorObj.darkColor;

        if (lightColor) {
          config = withIosColorset(config, {
            name: colorName,
            color: lightColor,
            darkColor,
            targetDirectory: props.directory,
          });
        }
      }
    });
  }

  return config;
};
