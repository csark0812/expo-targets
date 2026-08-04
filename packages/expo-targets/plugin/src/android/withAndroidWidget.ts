import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  AndroidConfig,
  type ConfigPlugin,
  withAndroidManifest,
  withAppBuildGradle,
  withDangerousMod,
  withProjectBuildGradle,
  withStringsXml,
} from '@expo/config-plugins';
import type { AndroidTargetConfig, Color } from '../config';
import { addWidgetSourceSets } from './widgetSourceSets';

/**
 * Sanitize widget name for Android resource names.
 * Android resource names can only contain lowercase a-z, 0-9, or underscore.
 */
function sanitizeResourceName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

function toWidgetNamePascal(name: string): string {
  return (
    name.charAt(0).toUpperCase() +
    name.slice(1).replace(/[-_]([a-z])/g, (_, letter) => letter.toUpperCase())
  );
}

interface WidgetProps {
  name: string;
  displayName?: string;
  type: string;
  platforms: string[];
  android?: AndroidTargetConfig;
  directory: string;
}

interface WidgetReceiverContext {
  mainApplication: any;
  packageName: string;
  props: WidgetProps;
  widgetNameLower: string;
  widgetNamePascal: string;
}

function configureGlanceBuild(config: any, props: WidgetProps) {
  let next = withProjectBuildGradle(config, (buildGradleConfig) => {
    addComposeCompilerPlugin(buildGradleConfig);
    return buildGradleConfig;
  });

  next = withAppBuildGradle(next, (buildGradleConfig) => {
    applyComposePlugin(buildGradleConfig);
    enableComposeFeatures(buildGradleConfig);
    addGlanceDependencies(buildGradleConfig);
    addWidgetSourceSets(buildGradleConfig, next, props);
    return buildGradleConfig;
  });

  return next;
}

function configureRemoteViewsBuild(config: any, props: WidgetProps) {
  return withAppBuildGradle(config, (buildGradleConfig) => {
    addRemoteViewsDependencies(buildGradleConfig);
    addWidgetSourceSets(buildGradleConfig, config, props);
    return buildGradleConfig;
  });
}

function configureWidgetManifest(config: any, props: WidgetProps) {
  return withAndroidManifest(config, (manifestConfig) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      manifestConfig.modResults
    );
    addExpoTargetsReceiver(mainApplication, config);
    addWidgetReceiver(mainApplication, config, props);
    return manifestConfig;
  });
}

function configureWidgetDescription(
  config: any,
  props: WidgetProps,
  description: string
) {
  return withStringsXml(config, (stringsConfig) => {
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

function configureWidgetResources(
  config: any,
  props: WidgetProps,
  androidConfig: AndroidTargetConfig
) {
  return withDangerousMod(config, [
    'android',
    (dangerousConfig) => {
      const platformRoot = dangerousConfig.modRequest.platformProjectRoot;
      generateWidgetResources(platformRoot, props);
      generateDefaultLayoutIfNeeded(platformRoot, props, androidConfig);
      if (androidConfig.colors) {
        generateColorResources(platformRoot, props, androidConfig.colors);
      }
      return dangerousConfig;
    },
  ]);
}

export const withAndroidWidget: ConfigPlugin<WidgetProps> = (config, props) => {
  const androidConfig = props.android || {};
  const widgetType = androidConfig.widgetType || 'glance';

  if (widgetType === 'glance') {
    config = configureGlanceBuild(config, props);
  } else {
    config = configureRemoteViewsBuild(config, props);
  }

  config = configureWidgetManifest(config, props);

  if (androidConfig?.description) {
    config = configureWidgetDescription(
      config,
      props,
      androidConfig.description
    );
  }

  config = configureWidgetResources(config, props, androidConfig);

  return config;
};

function addComposeCompilerPlugin(buildGradleConfig: any) {
  const { modResults } = buildGradleConfig;
  let contents = modResults.contents;

  if (contents.includes('compose-compiler-gradle-plugin')) {
    return;
  }

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

  if (contents.includes('org.jetbrains.kotlin.plugin.compose')) {
    return;
  }

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
  if (!packageName) {
    throw new Error('Android package name not found in app.json');
  }

  mainApplication.receiver = mainApplication.receiver || [];

  const receiverName = 'expo.modules.targets.ExpoTargetsReceiver';
  const alreadyAdded = mainApplication.receiver.some(
    (r: any) => r.$['android:name'] === receiverName
  );

  if (alreadyAdded) {
    return;
  }

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

  if (contents.includes('buildFeatures') && contents.includes('compose')) {
    return;
  }

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
    contents = contents.replace(
      androidBlockMatch[0],
      `${androidBlockMatch[1] + buildFeaturesBlock}\n}`
    );
    modResults.contents = contents;
  }
}

function addGlanceDependencies(buildGradleConfig: any) {
  const { modResults } = buildGradleConfig;
  let contents = modResults.contents;

  if (contents.includes('androidx.glance:glance-appwidget')) {
    return;
  }

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

  if (contents.includes('expo-targets-remoteviews')) {
    return;
  }

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
  if (!packageName) {
    throw new Error('Android package name not found in app.json');
  }

  const widgetType = props.android?.widgetType || 'glance';
  const widgetNameLower = sanitizeResourceName(props.name);
  const widgetNamePascal = toWidgetNamePascal(props.name);
  const receiverContext: WidgetReceiverContext = {
    mainApplication,
    packageName,
    props,
    widgetNameLower,
    widgetNamePascal,
  };

  if (widgetType === 'remoteviews') {
    const providerClassName = `${packageName}.widget.${widgetNameLower}.${widgetNamePascal}Provider`;
    registerAppWidgetProvider(mainApplication, providerClassName, props);
    return;
  }

  registerGlanceReceiver(receiverContext);
  registerUpdateReceiver(receiverContext);
}

function registerGlanceReceiver(context: WidgetReceiverContext) {
  const {
    mainApplication,
    packageName,
    props,
    widgetNameLower,
    widgetNamePascal,
  } = context;
  mainApplication.receiver = mainApplication.receiver || [];

  const widgetClassName = `${packageName}.widget.${widgetNameLower}.${widgetNamePascal}WidgetReceiver`;

  const alreadyAdded = mainApplication.receiver.some(
    (r: any) => r.$['android:name'] === widgetClassName
  );

  if (alreadyAdded) {
    return;
  }

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

function registerUpdateReceiver(context: WidgetReceiverContext) {
  const { mainApplication, packageName, widgetNameLower, widgetNamePascal } =
    context;
  mainApplication.receiver = mainApplication.receiver || [];

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

  if (alreadyAdded) {
    return;
  }

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

function getPreviewImageAttribute(
  androidConfig: AndroidTargetConfig,
  props: WidgetProps
): string {
  if (!androidConfig.previewImage) {
    return '';
  }
  const previewImageName =
    typeof androidConfig.previewImage === 'string'
      ? androidConfig.previewImage
      : `${sanitizeResourceName(props.name)}_preview`;
  return `\n    android:previewImage="@drawable/${previewImageName}"`;
}

function getDescriptionAttribute(
  androidConfig: AndroidTargetConfig,
  props: WidgetProps
): string {
  if (!androidConfig.description) {
    return '';
  }
  return `\n    android:description="@string/widget_${sanitizeResourceName(props.name)}_description"`;
}

function getResizeAttribute(
  androidConfig: AndroidTargetConfig,
  attribute: 'maxResizeWidth' | 'maxResizeHeight'
): string {
  const value = androidConfig[attribute];
  if (!value) {
    return '';
  }
  return `\n    android:${attribute}="${value}"`;
}

function getCellAttribute(
  androidConfig: AndroidTargetConfig,
  attribute: 'targetCellWidth' | 'targetCellHeight'
): string {
  const value = androidConfig[attribute];
  if (!value) {
    return '';
  }
  return `\n    android:${attribute}="${value}"`;
}

function buildWidgetInfoXml(
  androidConfig: AndroidTargetConfig,
  props: WidgetProps
): string {
  const minWidth = androidConfig.minWidth || '180dp';
  const minHeight = androidConfig.minHeight || '110dp';
  const resizeMode = androidConfig.resizeMode || 'horizontal|vertical';
  const updatePeriodMillis = androidConfig.updatePeriodMillis || 0;
  const widgetCategory = androidConfig.widgetCategory || 'home_screen';
  const layoutName =
    androidConfig.initialLayout || `widget_${sanitizeResourceName(props.name)}`;

  const header = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="${minWidth}"
    android:minHeight="${minHeight}"
    android:resizeMode="${resizeMode}"
    android:updatePeriodMillis="${updatePeriodMillis}"
    android:widgetCategory="${widgetCategory}"
    android:initialLayout="@layout/${layoutName}"`;

  const optionalAttributes = [
    getPreviewImageAttribute(androidConfig, props),
    getDescriptionAttribute(androidConfig, props),
    getResizeAttribute(androidConfig, 'maxResizeWidth'),
    getResizeAttribute(androidConfig, 'maxResizeHeight'),
    getCellAttribute(androidConfig, 'targetCellWidth'),
    getCellAttribute(androidConfig, 'targetCellHeight'),
  ].join('');

  return `${header}${optionalAttributes}>\n</appwidget-provider>`;
}

function generateWidgetResources(platformRoot: string, props: WidgetProps) {
  const androidConfig = props.android || {};
  const projectRoot = platformRoot.replace(/\/android$/, '');
  const xmlDir = path.join(projectRoot, props.directory, 'android/res/xml');
  fs.mkdirSync(xmlDir, { recursive: true });

  const widgetInfo = buildWidgetInfoXml(androidConfig, props);

  fs.writeFileSync(
    path.join(xmlDir, `widgetprovider_${sanitizeResourceName(props.name)}.xml`),
    widgetInfo
  );
}

function removeConflictingLayout(
  projectRoot: string,
  props: WidgetProps,
  layoutName: string
): void {
  const targetLayoutDir = path.join(
    projectRoot,
    props.directory,
    'android/res/layout'
  );
  const conflictingLayoutPath = path.join(targetLayoutDir, `${layoutName}.xml`);
  if (fs.existsSync(conflictingLayoutPath)) {
    fs.unlinkSync(conflictingLayoutPath);
  }
}

function writeDefaultLayout(
  projectRoot: string,
  props: WidgetProps,
  layoutName: string
): void {
  const targetLayoutDir = path.join(
    projectRoot,
    props.directory,
    'android/res/layout'
  );
  fs.mkdirSync(targetLayoutDir, { recursive: true });

  const layoutPath = path.join(targetLayoutDir, `${layoutName}.xml`);
  if (fs.existsSync(layoutPath)) {
    return;
  }

  const layoutContent = `<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@android:color/transparent">
</FrameLayout>`;

  fs.writeFileSync(layoutPath, layoutContent);
}

function generateDefaultLayoutIfNeeded(
  platformRoot: string,
  props: WidgetProps,
  androidConfig: AndroidTargetConfig
) {
  if (androidConfig.initialLayout) {
    return;
  }

  const projectRoot = platformRoot.replace(/\/android$/, '');
  const layoutName = `widget_${sanitizeResourceName(props.name)}`;
  const userLayoutPath = path.join(
    projectRoot,
    props.directory,
    'android/layouts/layout',
    `${layoutName}.xml`
  );

  if (fs.existsSync(userLayoutPath)) {
    removeConflictingLayout(projectRoot, props, layoutName);
    return;
  }

  writeDefaultLayout(projectRoot, props, layoutName);
}

interface ColorEntryResult {
  light: string;
  dark: string;
}

function buildColorEntry(
  prefixedName: string,
  value: string | Color
): ColorEntryResult | null {
  if (typeof value === 'string') {
    const entry = `    <color name="${prefixedName}">${value}</color>`;
    return { light: entry, dark: entry };
  }
  if (value.light || value.dark) {
    return {
      light: `    <color name="${prefixedName}">${value.light || '#000000'}</color>`,
      dark: `    <color name="${prefixedName}">${value.dark || value.light || '#FFFFFF'}</color>`,
    };
  }
  return null;
}

function generateColorResources(
  platformRoot: string,
  props: WidgetProps,
  colors: Record<string, string | Color>
) {
  const projectRoot = platformRoot.replace(/\/android$/, '');
  const targetResDir = path.join(projectRoot, props.directory, 'android/res');
  const valuesDir = path.join(targetResDir, 'values');
  const valuesNightDir = path.join(targetResDir, 'values-night');

  fs.mkdirSync(valuesDir, { recursive: true });
  fs.mkdirSync(valuesNightDir, { recursive: true });

  const lightColors: string[] = [];
  const darkColors: string[] = [];
  const widgetPrefix = `${sanitizeResourceName(props.name)}_`;

  for (const [name, value] of Object.entries(colors)) {
    const prefixedName = `${widgetPrefix}${name}`;
    const entry = buildColorEntry(prefixedName, value);
    if (entry) {
      lightColors.push(entry.light);
      darkColors.push(entry.dark);
    }
  }

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
