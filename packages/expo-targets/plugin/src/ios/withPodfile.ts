import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import fs from 'fs';
import path from 'path';

export const withTargetPodfile: ConfigPlugin<{
  targetName: string;
  deploymentTarget: string;
  useReactNative?: boolean;
  excludedPackages?: string[];
}> = (config, props) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        'Podfile'
      );
      let podfile = fs.readFileSync(podfilePath, 'utf-8');

      const targetBlock = props.useReactNative
        ? `
target '${props.targetName}' do
  platform :ios, '${props.deploymentTarget}'
  use_frameworks! :linkage => :static

  config = use_native_modules!
  use_react_native!(
    :path => config[:reactNativePath],
    :hermes_enabled => podfile_properties['expo.jsEngine'] == nil || podfile_properties['expo.jsEngine'] == 'hermes',
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )
end
`
        : `
target '${props.targetName}' do
  platform :ios, '${props.deploymentTarget}'
  use_frameworks! :linkage => :static
end
`;

      // Find the post_install block and insert before it
      // Extension targets should be nested inside the main target for CocoaPods
      const postInstallIndex = podfile.indexOf('post_install do');

      if (postInstallIndex === -1) {
        // Fallback: insert before the last 'end'
        const lastEndIndex = podfile.lastIndexOf('end');
        podfile =
          podfile.slice(0, lastEndIndex) +
          targetBlock +
          podfile.slice(lastEndIndex);
      } else {
        // Insert before post_install, inside main target
        podfile =
          podfile.slice(0, postInstallIndex) +
          targetBlock +
          '\n  ' +
          podfile.slice(postInstallIndex);
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};
