import type { TargetConfig } from 'expo-targets';

const config: TargetConfig = {
  type: 'clip',
  name: 'CheckoutClip',
  displayName: 'Quick Checkout',
  platforms: ['ios'],
  appGroup: 'group.com.test.clipadvanced',
  ios: {
    colors: {
      AccentColor: { light: '#007AFF', dark: '#0A84FF' },
      BackgroundColor: { light: '#FFFFFF', dark: '#000000' },
      PrimaryText: { light: '#000000', dark: '#FFFFFF' },
    },
    entitlements: {
      'com.apple.developer.associated-domains': [
        'appclips:clipadvanced.example.com',
      ],
    },
  },
};

export default config;
