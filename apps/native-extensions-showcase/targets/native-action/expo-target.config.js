module.exports = function (config) {
  const bundleId =
    config.ios?.bundleIdentifier || 'com.test.nativeextensionsshowcase';

  return {
    type: 'action',
    name: 'NativeAction',
    displayName: 'Native Action',
    platforms: ['ios'],
    appGroup: 'group.com.test.nativeextensionsshowcase',
    ios: {
      bundleIdentifier: `${bundleId}.native-action`,
      displayName: 'Native Action',
      colors: {
        AccentColor: { light: '#007AFF', dark: '#0A84FF' },
        BackgroundColor: { light: '#FFFFFF', dark: '#1C1C1E' },
      },
      activationRules: [{ type: 'image', maxCount: 1 }],
    },
  };
};
