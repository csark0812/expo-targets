import {
  ConfigPlugin,
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withStringsXml,
  withAppBuildGradle,
  withProjectBuildGradle,
} from '@expo/config-plugins';
import * as fs from 'fs';
import * as path from 'path';

import type { TargetConfig, AndroidTargetConfig, Color } from '../config';

/**
 * Sanitize widget name for Android resource names.
 * Android resource names can only contain lowercase a-z, 0-9, or underscore.
 */
function sanitizeResourceName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

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
  const widgetType = androidConfig.widgetType || 'glance';

  if (widgetType === 'glance') {
    // 1. Add Compose Compiler Plugin to root build.gradle (required for Kotlin 2.0+)
    config = withProjectBuildGradle(config, (buildGradleConfig) => {
      addComposeCompilerPlugin(buildGradleConfig);
      return buildGradleConfig;
    });

    // 2. Apply Compose plugin and configure in app build.gradle
    config = withAppBuildGradle(config, (buildGradleConfig) => {
      applyComposePlugin(buildGradleConfig);
      enableComposeFeatures(buildGradleConfig);
      addGlanceDependencies(buildGradleConfig);
      addWidgetSourceSets(buildGradleConfig, config, props);
      return buildGradleConfig;
    });
  } else {
    // RemoteViews: Skip Compose, add minimal deps
    config = withAppBuildGradle(config, (buildGradleConfig) => {
      addRemoteViewsDependencies(buildGradleConfig);
      addWidgetSourceSets(buildGradleConfig, config, props);
      return buildGradleConfig;
    });
  }

  // 3. Register ExpoTargetsReceiver in manifest (for refresh functionality)
  config = withAndroidManifest(config, (manifestConfig) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      manifestConfig.modResults
    );
    addExpoTargetsReceiver(mainApplication, config);
    addWidgetReceiver(mainApplication, config, props);
    return manifestConfig;
  });

  // 4. Add description string if provided
  if (androidConfig?.description) {
    const description = androidConfig.description;
    config = withStringsXml(config, (stringsConfig) => {
      stringsConfig.modResults = AndroidConfig.Strings.setStringItem(
        [
          {
            $: {
              name: `widget_${sanitizeResourceName(props.name)}_description`,
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

  // 5. Generate widget resources (XML, colors, default layout if needed)
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

function addComposeCompilerPlugin(buildGradleConfig: any) {
  const { modResults } = buildGradleConfig;
  let contents = modResults.contents;

  // Check if Compose Compiler Plugin already added
  if (contents.includes('compose-compiler-gradle-plugin')) {
    return;
  }

  // Find buildscript dependencies block and add Compose Compiler Plugin
  const dependenciesMatch = contents.match(
    /(dependencies\s*\{[^}]*classpath\([^)]*kotlin-gradle-plugin[^)]*\))/
  );
  if (dependenciesMatch) {
    const composePlugin = `\n    classpath('org.jetbrains.kotlin:compose-compiler-gradle-plugin')`;
    contents = contents.replace(
      dependenciesMatch[1],
      dependenciesMatch[1] + composePlugin
    );
    modResults.contents = contents;
  }
}

function applyComposePlugin(buildGradleConfig: any) {
  const { modResults } = buildGradleConfig;
  let contents = modResults.contents;

  // Check if Compose plugin already applied
  if (contents.includes('org.jetbrains.kotlin.plugin.compose')) {
    return;
  }

  // Find the kotlin.android plugin line and add compose plugin after it
  const kotlinPluginMatch = contents.match(
    /(apply plugin:\s*["']org\.jetbrains\.kotlin\.android["'])/
  );
  if (kotlinPluginMatch) {
    contents = contents.replace(
      kotlinPluginMatch[1],
      `${kotlinPluginMatch[1]}\napply plugin: "org.jetbrains.kotlin.plugin.compose"`
    );
    modResults.contents = contents;
  }
}

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

function enableComposeFeatures(buildGradleConfig: any) {
  const { modResults } = buildGradleConfig;
  let contents = modResults.contents;

  // Check if Compose already enabled
  if (contents.includes('buildFeatures') && contents.includes('compose')) {
    return;
  }

  // Find android block and add buildFeatures
  // With Kotlin 2.0+, we use the Compose Compiler Plugin, so no composeOptions needed
  const androidBlockMatch = contents.match(/(android\s*\{[\s\S]*?)(^\})/m);
  if (androidBlockMatch) {
    const buildFeaturesBlock = `
    buildFeatures {
        compose true
    }

    kotlin {
        jvmToolchain(17)
    }
`;
    // Insert before the closing brace of android block
    contents = contents.replace(
      androidBlockMatch[0],
      androidBlockMatch[1] + buildFeaturesBlock + '\n}'
    );
    modResults.contents = contents;
  }
}

function addGlanceDependencies(buildGradleConfig: any) {
  const { modResults } = buildGradleConfig;
  let contents = modResults.contents;

  // Check if Glance dependencies already added
  if (contents.includes('androidx.glance:glance-appwidget')) {
    return;
  }

  // Find dependencies block and add Compose BOM + Glance dependencies
  const dependenciesMatch = contents.match(/dependencies\s*\{/);
  if (dependenciesMatch) {
    const glanceDeps = `
    // Compose BOM - ensures all Compose libraries are compatible
    // Using latest stable BOM which is tested with Kotlin 2.1.x
    def composeBom = platform('androidx.compose:compose-bom:2025.01.00')
    implementation composeBom
    androidTestImplementation composeBom

    // Compose dependencies (versions managed by BOM)
    implementation 'androidx.compose.ui:ui'
    implementation 'androidx.compose.runtime:runtime'
    implementation 'androidx.compose.foundation:foundation'
    implementation 'androidx.compose.material3:material3'

    // Glance dependencies for widgets (added by expo-targets)
    // Using latest stable 1.1.1 which works with Compose BOM
    implementation 'androidx.glance:glance-appwidget:1.1.1'
    implementation 'androidx.glance:glance-material3:1.1.1'

    // Kotlinx serialization
    implementation 'org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3'`;

    contents = contents.replace(/(dependencies\s*\{)/, `$1${glanceDeps}`);

    modResults.contents = contents;
  }
}

function addRemoteViewsDependencies(buildGradleConfig: any) {
  const { modResults } = buildGradleConfig;
  let contents = modResults.contents;

  // Check if RemoteViews dependencies already added
  if (contents.includes('expo-targets-remoteviews')) {
    return;
  }

  // Find dependencies block and add minimal dependencies for RemoteViews widgets
  const dependenciesMatch = contents.match(/dependencies\s*\{/);
  if (dependenciesMatch) {
    const remoteViewsDeps = `
    // RemoteViews widget support (added by expo-targets)
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3'
    // expo-targets-remoteviews marker`;

    contents = contents.replace(/(dependencies\s*\{)/, `$1${remoteViewsDeps}`);

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

  const widgetType = props.android?.widgetType || 'glance';
  const widgetNameLower = sanitizeResourceName(props.name);
  const widgetNamePascal =
    props.name.charAt(0).toUpperCase() +
    props.name
      .slice(1)
      .replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase());

  if (widgetType === 'remoteviews') {
    // Register AppWidgetProvider (user's class)
    const providerClassName = `${packageName}.widget.${widgetNameLower}.${widgetNamePascal}Provider`;
    registerAppWidgetProvider(mainApplication, providerClassName, props);
  } else {
    // Existing Glance registration
    registerGlanceReceiver(
      mainApplication,
      packageName,
      props,
      widgetNameLower,
      widgetNamePascal
    );
    registerUpdateReceiver(
      mainApplication,
      packageName,
      props,
      widgetNameLower,
      widgetNamePascal
    );
  }
}

function registerGlanceReceiver(
  mainApplication: any,
  packageName: string,
  props: WidgetProps,
  widgetNameLower: string,
  widgetNamePascal: string
) {
  mainApplication.receiver = mainApplication.receiver || [];

  // Widget receiver class name pattern: {package}.widget.{widgetname}.{WidgetName}WidgetReceiver
  // Users should follow the convention: package {package}.widget.{widgetname}
  // with class {WidgetName}WidgetReceiver extending GlanceAppWidgetReceiver
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

function registerUpdateReceiver(
  mainApplication: any,
  packageName: string,
  props: WidgetProps,
  widgetNameLower: string,
  widgetNamePascal: string
) {
  mainApplication.receiver = mainApplication.receiver || [];

  // Also register the UpdateReceiver for direct Glance updates
  // Pattern: {package}.widget.{widgetname}.{WidgetName}UpdateReceiver
  const updateReceiverClassName = `${packageName}.widget.${widgetNameLower}.${widgetNamePascal}UpdateReceiver`;

  const updateReceiverAdded = mainApplication.receiver.some(
    (r: any) => r.$['android:name'] === updateReceiverClassName
  );

  if (!updateReceiverAdded) {
    mainApplication.receiver.push({
      $: {
        'android:name': updateReceiverClassName,
        'android:exported': 'false',
      },
      'intent-filter': [
        {
          action: [
            {
              $: { 'android:name': 'expo.modules.targets.UPDATE_WIDGET' },
            },
          ],
        },
      ],
    });
  }
}

function registerAppWidgetProvider(
  mainApplication: any,
  providerClassName: string,
  props: WidgetProps
) {
  mainApplication.receiver = mainApplication.receiver || [];

  const widgetNameLower = sanitizeResourceName(props.name);
  const alreadyAdded = mainApplication.receiver.some(
    (r: any) => r.$['android:name'] === providerClassName
  );

  if (alreadyAdded) return;

  mainApplication.receiver.push({
    $: {
      'android:name': providerClassName,
      'android:exported': 'true',
      'android:label': props.displayName || props.name,
    },
    'intent-filter': [
      {
        action: [
          {
            $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' },
          },
          // Add expo-targets refresh action so provider can receive update broadcasts
          {
            $: { 'android:name': 'expo.modules.targets.WIDGET_EVENT' },
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
        // Add both res/ (for generated resources) and layouts/ (for user-provided layouts)
        const layoutsPath = `${relativePath}/layouts`;
        const resPath = `${relativePath}/res`;
        const layoutsDir = path.join(
          projectRoot,
          props.directory,
          'android/layouts'
        );
        const hasUserLayouts = fs.existsSync(layoutsDir);

        if (mainBlockContent.includes('res.srcDirs')) {
          contents = contents.replace(
            /(sourceSets\s*\{[^}]*main\s*\{[^}]*res\.srcDirs\s*\+=\s*\[)([^\]]*)(\])/s,
            (
              match: string,
              prefix: string,
              existingDirs: string,
              suffix: string
            ) => {
              let updated = existingDirs;
              // Add res/ if not present
              if (!existingDirs.includes(`'${resPath}'`)) {
                updated = updated ? `${updated}, '${resPath}'` : `'${resPath}'`;
              }
              // Add layouts/ if it exists and not already present
              if (
                hasUserLayouts &&
                !existingDirs.includes(`'${layoutsPath}'`)
              ) {
                updated = updated
                  ? `${updated}, '${layoutsPath}'`
                  : `'${layoutsPath}'`;
              }
              if (updated === existingDirs) {
                return match;
              }
              return `${prefix}${updated}${suffix}`;
            }
          );
        } else if (!mainBlockContent.includes('res.srcDirs')) {
          // Add res.srcDirs if java.srcDirs was just added
          const resDirs = hasUserLayouts
            ? `['${resPath}', '${layoutsPath}']`
            : `['${resPath}']`;
          contents = contents.replace(
            /(java\.srcDirs\s*\+=\s*\[[^\]]*\])/,
            `$1\n            res.srcDirs += ${resDirs}`
          );
        }
      }
    }
  } else {
    // Create new sourceSets block
    const androidBlockMatch = contents.match(/(android\s*\{)/);
    if (androidBlockMatch) {
      const layoutsDir = path.join(
        projectRoot,
        props.directory,
        'android/layouts'
      );
      const resDirs = fs.existsSync(layoutsDir)
        ? `['${relativePath}/res', '${relativePath}/layouts']`
        : `['${relativePath}/res']`;
      contents = contents.replace(
        /(android\s*\{)/,
        `$1\n    sourceSets {\n        main {\n            java.srcDirs += ['${relativePath}']\n            res.srcDirs += ${resDirs}\n        }\n    }`
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
    androidConfig.initialLayout || `widget_${sanitizeResourceName(props.name)}`;

  // Build XML with required attributes
  let widgetInfo = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="${minWidth}"
    android:minHeight="${minHeight}"
    android:resizeMode="${resizeMode}"
    android:updatePeriodMillis="${updatePeriodMillis}"
    android:widgetCategory="${widgetCategory}"
    android:initialLayout="@layout/${layoutName}"`;

  // Add preview image if configured
  // Note: Glance widgets need static preview images since previewLayout doesn't work with Compose
  if (androidConfig.previewImage) {
    const previewImageName =
      typeof androidConfig.previewImage === 'string'
        ? androidConfig.previewImage
        : `${sanitizeResourceName(props.name)}_preview`;
    widgetInfo += `\n    android:previewImage="@drawable/${previewImageName}"`;
  }

  if (androidConfig.description) {
    widgetInfo += `\n    android:description="@string/widget_${sanitizeResourceName(props.name)}_description"`;
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
    path.join(xmlDir, `widgetprovider_${sanitizeResourceName(props.name)}.xml`),
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

  const projectRoot = platformRoot.replace(/\/android$/, '');
  const layoutName = `widget_${sanitizeResourceName(props.name)}`;

  // Check if user has provided layout in layouts/ directory
  const userLayoutsDir = path.join(
    projectRoot,
    props.directory,
    'android/layouts/layout'
  );
  const userLayoutPath = path.join(userLayoutsDir, `${layoutName}.xml`);

  // If user has layout in layouts/, don't generate one in res/ and remove any existing one
  if (fs.existsSync(userLayoutPath)) {
    // User has layout in layouts/, remove any conflicting file in res/ to avoid duplicates
    const targetLayoutDir = path.join(
      projectRoot,
      props.directory,
      'android/res/layout'
    );
    const conflictingLayoutPath = path.join(
      targetLayoutDir,
      `${layoutName}.xml`
    );
    if (fs.existsSync(conflictingLayoutPath)) {
      fs.unlinkSync(conflictingLayoutPath);
    }
    return; // User has layout in layouts/, skip generating in res/
  }

  // Generate in target's android/res directory (referenced via sourceSets)
  const targetLayoutDir = path.join(
    projectRoot,
    props.directory,
    'android/res/layout'
  );
  fs.mkdirSync(targetLayoutDir, { recursive: true });

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
  const widgetPrefix = `${sanitizeResourceName(props.name)}_`;

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
    path.join(valuesDir, `colors_${sanitizeResourceName(props.name)}.xml`),
    lightXml
  );
  fs.writeFileSync(
    path.join(valuesNightDir, `colors_${sanitizeResourceName(props.name)}.xml`),
    darkXml
  );
}
