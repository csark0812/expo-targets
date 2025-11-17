import { ConfigPlugin, withDangerousMod } from '@expo/config-plugins';
import fs from 'fs';
import path from 'path';

import { AndroidTargetOptions } from './withAndroidTarget';

/**
 * Generates build.gradle for the target module
 */
export const withGradleModule: ConfigPlugin<AndroidTargetOptions> = (
  config,
  options
) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const { platformProjectRoot } = config.modRequest;
      const {
        name,
        packageName,
        minSdkVersion = 26,
        targetSdkVersion = 34,
        useGlance = true,
        type,
      } = options;

      const modulePath = path.join(platformProjectRoot, name);
      const buildGradlePath = path.join(modulePath, 'build.gradle');

      // Ensure module directory exists
      fs.mkdirSync(modulePath, { recursive: true });

      const buildGradleContent = generateBuildGradle({
        packageName,
        minSdkVersion,
        targetSdkVersion,
        useGlance,
        type,
      });

      fs.writeFileSync(buildGradlePath, buildGradleContent, 'utf-8');

      return config;
    },
  ]);
};

function generateBuildGradle(options: {
  packageName: string;
  minSdkVersion: number;
  targetSdkVersion: number;
  useGlance: boolean;
  type: string;
}): string {
  const { packageName, minSdkVersion, targetSdkVersion, useGlance, type } =
    options;

  const isWidget = type === 'widget';
  const needsCompose = isWidget && useGlance;

  return `plugins {
    id 'com.android.library'
    id 'org.jetbrains.kotlin.android'
    ${needsCompose ? "id 'org.jetbrains.kotlin.plugin.serialization' version '1.9.20'" : ''}
}

android {
    namespace '${packageName}'
    compileSdk ${targetSdkVersion}

    defaultConfig {
        minSdk ${minSdkVersion}
        targetSdk ${targetSdkVersion}
    }
${
  needsCompose
    ? `
    buildFeatures {
        compose true
    }

    composeOptions {
        kotlinCompilerExtensionVersion '1.5.3'
    }
`
    : ''
}
    kotlinOptions {
        jvmTarget = '1.8'
    }
}

dependencies {
    implementation project(':app')
    ${
      isWidget && useGlance
        ? `
    // Glance for modern widgets
    implementation 'androidx.glance:glance-appwidget:1.0.0'
    implementation 'androidx.compose.runtime:runtime:1.5.4'
    implementation 'androidx.compose.ui:ui:1.5.4'

    // Kotlin serialization for JSON parsing
    implementation 'org.jetbrains.kotlinx:kotlinx-serialization-json:1.6.0'
    `
        : ''
    }
}
`;
}

