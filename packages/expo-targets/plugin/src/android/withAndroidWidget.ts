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
import {
  appendGradleImplementations,
  resolveAndroidExtraImplementations,
} from './extraImplementations';
import {
  buildAppWidgetProviderXml,
  mergeAppWidgetProviderXml,
  type ResolvedAndroidWidgetProvider,
  resolveAndroidWidgetProviders,
  sanitizeWidgetResourceName,
  toWidgetNamePascal,
  xmlFieldsFromProvider,
} from './resolveAndroidWidgetProviders';
import { addWidgetSourceSets } from './widgetSourceSets';

function sanitizeResourceName(name: string): string {
  return sanitizeWidgetResourceName(name);
}

interface WidgetProps {
  name: string;
  displayName?: string;
  type: string;
  platforms: string[];
  android?: AndroidTargetConfig;
  directory: string;
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
  providers: ResolvedAndroidWidgetProvider[]
) {
  const items = providers
    .filter(
      (provider) => provider.description && provider.descriptionStringName
    )
    .map((provider) => ({
      $: {
        name: provider.descriptionStringName as string,
        translatable: 'false' as const,
      },
      _: (provider.description as string).replace(/'/g, "\\'"),
    }));

  if (items.length === 0) {
    return config;
  }

  return withStringsXml(config, (stringsConfig) => {
    stringsConfig.modResults = AndroidConfig.Strings.setStringItem(
      items,
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
  const packageName = config.android?.package;
  const providers = packageName
    ? resolveAndroidWidgetProviders({
        packageName,
        targetName: props.name,
        displayName: props.displayName,
        android: androidConfig,
      })
    : [];

  if (widgetType === 'glance') {
    config = configureGlanceBuild(config, props);
  } else {
    config = configureRemoteViewsBuild(config, props);
  }

  config = withAppBuildGradle(config, (buildGradleConfig) => {
    const extras = resolveAndroidExtraImplementations(androidConfig);
    buildGradleConfig.modResults.contents = appendGradleImplementations(
      buildGradleConfig.modResults.contents,
      extras
    );
    return buildGradleConfig;
  });

  config = configureWidgetManifest(config, props);

  config = configureWidgetDescription(config, providers);

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

const EXPO_TARGETS_RECEIVER = 'expo.modules.targets.ExpoTargetsReceiver';
const WIDGET_EVENT_ACTION = 'expo.modules.targets.WIDGET_EVENT';
const WIDGET_BUMP_ACTION = 'expo.modules.targets.WIDGET_BUMP';

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (Array.isArray(value)) return value;
  return value ? [value] : [];
}

function collectIntentActionNames(receiver: any): Set<string> {
  const actions = new Set<string>();
  for (const f of asArray(receiver['intent-filter'])) {
    for (const a of asArray(f.action)) {
      const name = a?.$?.['android:name'];
      if (name) actions.add(name);
    }
  }
  return actions;
}

function setReceiverActions(receiver: any, actionNames: string[]) {
  receiver['intent-filter'] = [
    {
      action: actionNames.map((name) => ({
        $: { 'android:name': name },
      })),
    },
  ];
}

function addExpoTargetsReceiver(mainApplication: any, config: any) {
  if (!config.android?.package) {
    throw new Error('Android package name not found in app.json');
  }

  mainApplication.receiver = mainApplication.receiver || [];
  const existing = mainApplication.receiver.find(
    (r: any) => r.$['android:name'] === EXPO_TARGETS_RECEIVER
  );

  if (existing) {
    const actions = collectIntentActionNames(existing);
    actions.add(WIDGET_EVENT_ACTION);
    actions.add(WIDGET_BUMP_ACTION);
    setReceiverActions(existing, [...actions]);
    return;
  }

  mainApplication.receiver.push({
    $: {
      'android:name': EXPO_TARGETS_RECEIVER,
      'android:exported': 'false',
    },
  });
  setReceiverActions(mainApplication.receiver.at(-1), [
    WIDGET_EVENT_ACTION,
    WIDGET_BUMP_ACTION,
  ]);
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
  const providers = resolveAndroidWidgetProviders({
    packageName,
    targetName: props.name,
    displayName: props.displayName,
    android: props.android,
  });

  if (widgetType === 'remoteviews') {
    for (const provider of providers) {
      registerAppWidgetProvider(mainApplication, provider);
    }
    return;
  }

  for (const provider of providers) {
    registerGlanceReceiver(mainApplication, provider);
  }
  registerUpdateReceiver(mainApplication, packageName, props);
}

function registerGlanceReceiver(
  mainApplication: any,
  provider: ResolvedAndroidWidgetProvider
) {
  mainApplication.receiver = mainApplication.receiver || [];

  const alreadyAdded = mainApplication.receiver.some(
    (r: any) => r.$['android:name'] === provider.className
  );

  if (alreadyAdded) {
    return;
  }

  mainApplication.receiver.push({
    $: {
      'android:name': provider.className,
      'android:exported': 'true',
      'android:label': provider.displayName,
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
          'android:resource': `@xml/${provider.xmlName}`,
        },
      },
    ],
  });
}

function registerUpdateReceiver(
  mainApplication: any,
  packageName: string,
  props: WidgetProps
) {
  mainApplication.receiver = mainApplication.receiver || [];

  const widgetNameLower = sanitizeResourceName(props.name);
  const widgetNamePascal = toWidgetNamePascal(props.name);
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
  provider: ResolvedAndroidWidgetProvider
) {
  mainApplication.receiver = mainApplication.receiver || [];

  const alreadyAdded = mainApplication.receiver.some(
    (r: any) => r.$['android:name'] === provider.className
  );

  if (alreadyAdded) {
    return;
  }

  mainApplication.receiver.push({
    $: {
      'android:name': provider.className,
      'android:exported': 'true',
      'android:label': provider.displayName,
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
          'android:resource': `@xml/${provider.xmlName}`,
        },
      },
    ],
  });
}

function generateWidgetResources(platformRoot: string, props: WidgetProps) {
  const projectRoot = platformRoot.replace(/\/android$/, '');
  const xmlDir = path.join(projectRoot, props.directory, 'android/res/xml');
  fs.mkdirSync(xmlDir, { recursive: true });

  const providers = resolveAndroidWidgetProviders({
    packageName: 'placeholder',
    targetName: props.name,
    displayName: props.displayName,
    android: props.android,
  });

  for (const provider of providers) {
    const xmlPath = path.join(xmlDir, `${provider.xmlName}.xml`);
    const existing = fs.existsSync(xmlPath)
      ? fs.readFileSync(xmlPath, 'utf8')
      : null;
    const xml = mergeAppWidgetProviderXml(
      existing,
      buildAppWidgetProviderXml(xmlFieldsFromProvider(provider))
    );
    fs.writeFileSync(xmlPath, xml);
  }
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
  const projectRoot = platformRoot.replace(/\/android$/, '');
  const providers = resolveAndroidWidgetProviders({
    packageName: 'placeholder',
    targetName: props.name,
    displayName: props.displayName,
    android: androidConfig,
  });

  for (const provider of providers) {
    if (provider.hasExplicitLayout) {
      continue;
    }

    const layoutName = provider.initialLayout;
    const userLayoutPath = path.join(
      projectRoot,
      props.directory,
      'android/layouts/layout',
      `${layoutName}.xml`
    );

    if (fs.existsSync(userLayoutPath)) {
      removeConflictingLayout(projectRoot, props, layoutName);
      continue;
    }

    writeDefaultLayout(projectRoot, props, layoutName);
  }
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
