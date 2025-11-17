import { ConfigPlugin, withAppBuildGradle } from '@expo/config-plugins';

/**
 * Ensures the Android app's build.gradle namespace matches the package name
 * from app.json to prevent R and BuildConfig resolution errors.
 */
export const withAndroidAppBuildGradle: ConfigPlugin = (config) => {
  const packageName = config.android?.package;

  if (!packageName) {
    return config;
  }

  return withAppBuildGradle(config, (config) => {
    const { modResults } = config;
    let contents = modResults.contents;

    // Ensure namespace matches package name
    // This handles cases where prebuild might not have set it correctly
    const namespaceRegex = /namespace\s+["']([^"']+)["']/;
    const match = contents.match(namespaceRegex);

    if (match && match[1] !== packageName) {
      // Replace incorrect namespace with correct package name
      contents = contents.replace(namespaceRegex, `namespace "${packageName}"`);
      console.log(
        `[expo-targets] Fixed Android namespace: ${match[1]} -> ${packageName}`
      );
    }

    modResults.contents = contents;
    return config;
  });
};
