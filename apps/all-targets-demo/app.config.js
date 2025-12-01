module.exports = {
  expo: {
    name: 'all-targets-demo',
    slug: 'all-targets-demo',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.csarkissian.alltargetsdemo',
      entitlements: {
        'com.apple.security.application-groups': [
          'group.com.csarkissian.alltargetsdemo',
        ],
        'com.apple.developer.associated-domains': [
          'appclips:alltargetsdemo.example.com',
        ],
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      appleTeamId: process.env.APPLE_TEAM_ID,
    },
    plugins: ['../../packages/expo-targets/app.plugin.js'],
    android: {
      package: 'com.csarkissian.alltargetsdemo',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
    },
    extra: {
      eas: {
        projectId: '0d1609cc-3b39-4fa2-a23f-56b49ec429ac',
      },
    },
  },
};
