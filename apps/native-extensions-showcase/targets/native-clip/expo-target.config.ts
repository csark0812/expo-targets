import type { ExpoConfig, TargetConfig } from 'expo-targets/plugin';

export default function (config: ExpoConfig): TargetConfig {
  const bundleId =
    config.ios?.bundleIdentifier || 'com.test.nativeextensionsshowcase';

  return {
    type: 'clip',
    name: 'NativeClip',
    displayName: 'Native Clip',
    platforms: ['ios'],
    appGroup: 'group.com.test.nativeextensionsshowcase',
    ios: {
      bundleIdentifier: `${bundleId}.clip`,
      displayName: 'Native Clip',
      colors: {
        AccentColor: { light: '#007AFF', dark: '#0A84FF' },
        BackgroundColor: { light: '#FFFFFF', dark: '#000000' },
        PrimaryText: { light: '#000000', dark: '#FFFFFF' },
      },
      entitlements: {
        'com.apple.developer.associated-domains': [
          'appclips:nativeextensionsshowcase.example.com',
        ],
      },
    },
  };
}
