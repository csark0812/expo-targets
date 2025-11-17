import {
  ConfigPlugin,
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withStringsXml,
  withAppBuildGradle,
} from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

import type { TargetConfig, AndroidTargetConfig, Color } from '../config';

interface WidgetProps {
  name: string;
  displayName?: string;
  type: string;
  platforms: string[];
  android?: AndroidTargetConfig;
  directory: string;
}

export const withAndroidWidget: ConfigPlugin<WidgetProps> = (config, props) => {
  const androidConfig = props.android || {};

  // 1. Register ExpoTargetsReceiver in manifest (for refresh functionality)
  config = withAndroidManifest(config, (manifestConfig) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      manifestConfig.modResults
    );
    addExpoTargetsReceiver(mainApplication, config);
    addWidgetReceiver(mainApplication, config, props);
    return manifestConfig;
  });

  // 2. Add description string if provided
  if (androidConfig?.description) {
    const description = androidConfig.description;
    config = withStringsXml(config, (stringsConfig) => {
      stringsConfig.modResults = AndroidConfig.Strings.setStringItem(
        [
          {
            $: {
              name: `widget_${props.name.toLowerCase()}_description`,
              translatable: 'false',
            },
            _: description.replace(/'/g, "\\'"),
          },
        ],
        stringsConfig.modResults
      );
      return stringsConfig;
    });
  }

  // 3. Add Glance dependencies and reference widget code/resources in place
  config = withAppBuildGradle(config, (buildGradleConfig) => {
    addGlanceDependencies(buildGradleConfig);
    addWidgetSourceSets(buildGradleConfig, config, props);
    return buildGradleConfig;
  });

  // 4. Generate widget resources (XML, colors, default layout if needed)
  config = withDangerousMod(config, [
    'android',
    (dangerousConfig) => {
      const platformRoot = dangerousConfig.modRequest.platformProjectRoot;
      generateWidgetResources(platformRoot, config, props);
      generateDefaultLayoutIfNeeded(platformRoot, props, androidConfig);
      if (androidConfig.colors) {
        generateColorResources(platformRoot, props, androidConfig.colors);
      }
      return dangerousConfig;
    },
  ]);

  return config;
};

function addExpoTargetsReceiver(mainApplication: any, config: any) {
  const packageName = config.android?.package;
  if (!packageName)
    throw new Error('Android package name not found in app.json');

  mainApplication.receiver = mainApplication.receiver || [];

  const receiverName = 'expo.modules.targets.ExpoTargetsReceiver';
  const alreadyAdded = mainApplication.receiver.some(
    (r: any) => r.$['android:name'] === receiverName
  );

  if (alreadyAdded) return;

  mainApplication.receiver.push({
    $: {
      'android:name': receiverName,
      'android:exported': 'false',
    },
    'intent-filter': [
      {
        action: [
          { $: { 'android:name': 'expo.modules.targets.WIDGET_EVENT' } },
        ],
      },
    ],
  });
}

function addGlanceDependencies(buildGradleConfig: any) {
  const { modResults } = buildGradleConfig;
  let contents = modResults.contents;

  // Check if Glance dependencies already added
  if (contents.includes('androidx.glance:glance-appwidget')) {
    return;
  }

  // Find dependencies block and add Glance + Compose dependencies
  const dependenciesMatch = contents.match(/dependencies\s*\{/);
  if (dependenciesMatch) {
    const glanceDeps = `
    // Glance + Compose dependencies for widgets (added by expo-targets)
    implementation("androidx.glance:glance-appwidget:1.1.1")
    implementation("androidx.glance:glance-material3:1.1.1")
    implementation("androidx.compose.ui:ui:1.6.8")
    implementation("androidx.compose.runtime:runtime:1.6.8")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")`;

    contents = contents.replace(/(dependencies\s*\{)/, `$1${glanceDeps}`);

    modResults.contents = contents;
  }
}

function addWidgetReceiver(
  mainApplication: any,
  config: any,
  props: WidgetProps
) {
  const packageName = config.android?.package;
  if (!packageName)
    throw new Error('Android package name not found in app.json');

  mainApplication.receiver = mainApplication.receiver || [];

  // Widget receiver class name pattern: {package}.widget.{widgetname}.{WidgetName}Receiver
  // Users should follow the convention: package {package}.widget.{widgetname}
  // with class {WidgetName}Receiver extending ExpoTargetsWidgetProvider or GlanceAppWidgetReceiver
  // For now, we'll construct the expected class name based on convention
  const widgetNameLower = props.name.toLowerCase();
  const widgetNamePascal =
    props.name.charAt(0).toUpperCase() +
    props.name
      .slice(1)
      .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
  const widgetClassName = `${packageName}.widget.${widgetNameLower}.${widgetNamePascal}WidgetReceiver`;

  const alreadyAdded = mainApplication.receiver.some(
    (r: any) => r.$['android:name'] === widgetClassName
  );

  if (alreadyAdded) return;

  mainApplication.receiver.push({
    $: {
      'android:name': widgetClassName,
      'android:exported': 'true',
      'android:label': props.displayName || props.name,
    },
    'intent-filter': [
      {
        action: [
          {
            $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' },
          },
        ],
      },
    ],
    'meta-data': [
      {
        $: {
          'android:name': 'android.appwidget.provider',
          'android:resource': `@xml/widgetprovider_${widgetNameLower}`,
        },
      },
    ],
  });
}

function addWidgetSourceSets(
  buildGradleConfig: any,
  config: any,
  props: WidgetProps
) {
  const projectRoot = config._internal?.projectRoot || process.cwd();
  const widgetAndroidDir = path.join(projectRoot, props.directory, 'android');

  // Only add sourceSets if widget android directory exists
  if (!fs.existsSync(widgetAndroidDir)) {
    return;
  }

  const { modResults } = buildGradleConfig;
  let contents = modResults.contents;

  // Calculate relative path from app/build.gradle to widget directory
  // app/build.gradle is at android/app/build.gradle
  // widget is at targets/{name}/android
  // Relative path: ../../targets/{name}/android
  // platformProjectRoot is typically {projectRoot}/android
  const platformProjectRoot = path.join(projectRoot, 'android');
  const relativePath = path
    .relative(path.join(platformProjectRoot, 'app'), widgetAndroidDir)
    .replace(/\\/g, '/');

  // Check if sourceSets already exists
  const sourceSetsRegex = /android\s*\{[^}]*sourceSets\s*\{/s;
  const hasSourceSets = sourceSetsRegex.test(contents);

  // Check if this widget's sourceSet is already added
  const widgetSourceSetPattern = new RegExp(
    `java\\.srcDirs\\s*\\+=\\s*\\['${relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'\\]`,
    's'
  );

  if (widgetSourceSetPattern.test(contents)) {
    return; // Already added
  }

  if (hasSourceSets) {
    // Add to existing sourceSets block
    const sourceSetsMatch = contents.match(
      /sourceSets\s*\{[^}]*main\s*\{[^}]*\}/s
    );
    if (sourceSetsMatch) {
      // Find the main block and add our sourceSets
      const mainBlockMatch = contents.match(
        /sourceSets\s*\{[^}]*main\s*\{([^}]*)\}/s
      );
      if (mainBlockMatch) {
        const mainBlockContent = mainBlockMatch[1];
        // Check if java.srcDirs already exists
        if (mainBlockContent.includes('java.srcDirs')) {
          // Append to existing java.srcDirs
          contents = contents.replace(
            /(sourceSets\s*\{[^}]*main\s*\{[^}]*java\.srcDirs\s*\+=\s*\[)([^\]]*)(\])/s,
            (
              match: string,
              prefix: string,
              existingDirs: string,
              suffix: string
            ) => {
              // Check if our path is already in the array
              if (existingDirs.includes(`'${relativePath}'`)) {
                return match;
              }
              return `${prefix}${existingDirs}, '${relativePath}'${suffix}`;
            }
          );
        } else {
          // Add java.srcDirs block
          contents = contents.replace(
            /(sourceSets\s*\{[^}]*main\s*\{)([^}]*)(\})/s,
            `$1$2            java.srcDirs += ['${relativePath}']\n            res.srcDirs += ['${relativePath}/res']\n$3`
          );
        }

        // Handle res.srcDirs similarly
        if (mainBlockContent.includes('res.srcDirs')) {
          contents = contents.replace(
            /(sourceSets\s*\{[^}]*main\s*\{[^}]*res\.srcDirs\s*\+=\s*\[)([^\]]*)(\])/s,
            (
              match: string,
              prefix: string,
              existingDirs: string,
              suffix: string
            ) => {
              if (existingDirs.includes(`'${relativePath}/res'`)) {
                return match;
              }
              return `${prefix}${existingDirs}, '${relativePath}/res'${suffix}`;
            }
          );
        } else if (!mainBlockContent.includes('res.srcDirs')) {
          // Add res.srcDirs if java.srcDirs was just added
          contents = contents.replace(
            /(java\.srcDirs\s*\+=\s*\[[^\]]*\])/,
            `$1\n            res.srcDirs += ['${relativePath}/res']`
          );
        }
      }
    }
  } else {
    // Create new sourceSets block
    const androidBlockMatch = contents.match(/(android\s*\{)/);
    if (androidBlockMatch) {
      contents = contents.replace(
        /(android\s*\{)/,
        `$1\n    sourceSets {\n        main {\n            java.srcDirs += ['${relativePath}']\n            res.srcDirs += ['${relativePath}/res']\n        }\n    }`
      );
    }
  }

  modResults.contents = contents;
}

function generateWidgetResources(
  platformRoot: string,
  config: any,
  props: WidgetProps
) {
  const androidConfig = props.android || {};
  // Generate in target's android/res directory (referenced via sourceSets)
  const projectRoot = platformRoot.replace(/\/android$/, '');
  const xmlDir = path.join(projectRoot, props.directory, 'android/res/xml');
  fs.mkdirSync(xmlDir, { recursive: true });

  // Extract configuration with defaults
  const minWidth = androidConfig.minWidth || '180dp';
  const minHeight = androidConfig.minHeight || '110dp';
  const resizeMode = androidConfig.resizeMode || 'horizontal|vertical';
  const updatePeriodMillis = androidConfig.updatePeriodMillis || 0;
  const widgetCategory = androidConfig.widgetCategory || 'home_screen';
  const layoutName =
    androidConfig.initialLayout || `widget_${props.name.toLowerCase()}`;

  // Build XML with required attributes
  let widgetInfo = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="${minWidth}"
    android:minHeight="${minHeight}"
    android:resizeMode="${resizeMode}"
    android:updatePeriodMillis="${updatePeriodMillis}"
    android:widgetCategory="${widgetCategory}"
    android:initialLayout="@layout/${layoutName}"`;

  // Add optional attributes if provided
  if (androidConfig.previewImage) {
    widgetInfo += `\n    android:previewImage="@drawable/${props.name.toLowerCase()}_preview"`;
  }

  if (androidConfig.description) {
    widgetInfo += `\n    android:description="@string/widget_${props.name.toLowerCase()}_description"`;
  }

  if (androidConfig.maxResizeWidth) {
    widgetInfo += `\n    android:maxResizeWidth="${androidConfig.maxResizeWidth}"`;
  }

  if (androidConfig.maxResizeHeight) {
    widgetInfo += `\n    android:maxResizeHeight="${androidConfig.maxResizeHeight}"`;
  }

  if (androidConfig.targetCellWidth) {
    widgetInfo += `\n    android:targetCellWidth="${androidConfig.targetCellWidth}"`;
  }

  if (androidConfig.targetCellHeight) {
    widgetInfo += `\n    android:targetCellHeight="${androidConfig.targetCellHeight}"`;
  }

  widgetInfo += `>\n</appwidget-provider>`;

  fs.writeFileSync(
    path.join(xmlDir, `widgetprovider_${props.name.toLowerCase()}.xml`),
    widgetInfo
  );
}

function generateDefaultLayoutIfNeeded(
  platformRoot: string,
  props: WidgetProps,
  androidConfig: AndroidTargetConfig
) {
  // Only generate default layout if initialLayout is not specified
  // (meaning user hasn't provided their own layout)
  if (androidConfig.initialLayout) {
    return; // User provided their own layout
  }

  // Generate in target's android/res directory (referenced via sourceSets)
  const projectRoot = platformRoot.replace(/\/android$/, '');
  const targetLayoutDir = path.join(
    projectRoot,
    props.directory,
    'android/res/layout'
  );
  fs.mkdirSync(targetLayoutDir, { recursive: true });

  const layoutName = `widget_${props.name.toLowerCase()}`;
  const layoutPath = path.join(targetLayoutDir, `${layoutName}.xml`);

  // Only create if it doesn't exist (user might have their own)
  if (!fs.existsSync(layoutPath)) {
    // Minimal layout required by Android for widget initialization
    // This is just a placeholder - Glance widgets will replace it with Compose UI
    const layoutContent = `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@android:color/transparent">
</FrameLayout>`;

    fs.writeFileSync(layoutPath, layoutContent);
  }
}

function generateColorResources(
  platformRoot: string,
  props: WidgetProps,
  colors: Record<string, string | Color>
) {
  // Generate in target's android/res directory (referenced via sourceSets)
  const projectRoot = platformRoot.replace(/\/android$/, '');
  const targetResDir = path.join(projectRoot, props.directory, 'android/res');
  const valuesDir = path.join(targetResDir, 'values');
  const valuesNightDir = path.join(targetResDir, 'values-night');

  fs.mkdirSync(valuesDir, { recursive: true });
  fs.mkdirSync(valuesNightDir, { recursive: true });

  const lightColors: string[] = [];
  const darkColors: string[] = [];
  const widgetPrefix = `${props.name.toLowerCase()}_`;

  // Prefix color names with widget name to avoid conflicts between widgets
  Object.entries(colors).forEach(([name, value]) => {
    const prefixedName = `${widgetPrefix}${name}`;
    if (typeof value === 'string') {
      lightColors.push(`    <color name="${prefixedName}">${value}</color>`);
      darkColors.push(`    <color name="${prefixedName}">${value}</color>`);
    } else if (value.light || value.dark) {
      lightColors.push(
        `    <color name="${prefixedName}">${value.light || '#000000'}</color>`
      );
      darkColors.push(
        `    <color name="${prefixedName}">${value.dark || value.light || '#FFFFFF'}</color>`
      );
    }
  });

  const lightXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
${lightColors.join('\n')}
</resources>`;

  const darkXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
${darkColors.join('\n')}
</resources>`;

  fs.writeFileSync(
    path.join(valuesDir, `colors_${props.name.toLowerCase()}.xml`),
    lightXml
  );
  fs.writeFileSync(
    path.join(valuesNightDir, `colors_${props.name.toLowerCase()}.xml`),
    darkXml
  );
}
