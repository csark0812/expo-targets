import type { ExpoConfig, TargetConfig } from 'expo-targets/plugin';

export default function (config: ExpoConfig): TargetConfig {
  const bundleId =
    config.ios?.bundleIdentifier || 'com.test.nativeextensionsshowcase';

  return {
    type: 'share',
    name: 'NativeShare',
    displayName: 'Native Share',
    platforms: ['ios'],
    appGroup: 'group.com.test.nativeextensionsshowcase',
    ios: {
      bundleIdentifier: `${bundleId}.native-share`,
      displayName: 'Native Share',
      colors: {
        AccentColor: { light: '#007AFF', dark: '#0A84FF' },
        BackgroundColor: { light: '#FFFFFF', dark: '#1C1C1E' },
      },
      activationRules: [
        { type: 'text' },
        { type: 'url' },
        { type: 'image', maxCount: 5 },
      ],
    },
  };
}
