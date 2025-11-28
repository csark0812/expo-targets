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

import type { TargetConfig, AndroidTargetConfig } from '../config';

interface ShareExtensionProps {
  name: string;
  displayName?: string;
  type: string;
  platforms: string[];
  android?: AndroidTargetConfig;
  directory: string;
  entry?: string;
}

/**
 * Adds Android share extension support via Activity + Intent Filters
 * 
 * On Android, share extensions work differently than iOS:
 * - No separate extension process
 * - Uses Activity with ACTION_SEND/ACTION_SEND_MULTIPLE intent filters
 * - Appears in the system share sheet when matching content types are shared
 */
export const withAndroidShareExtension: ConfigPlugin<ShareExtensionProps> = (
  config,
  props
) => {
  // 1. Add share activity to manifest with intent filters
  config = withAndroidManifest(config, (manifestConfig) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(
      manifestConfig.modResults
    );
    addShareActivity(mainApplication, config, props);
    return manifestConfig;
  });

  // 2. Add display name to strings.xml if provided
  if (props.displayName) {
    config = withStringsXml(config, (stringsConfig) => {
      const sanitizedName = sanitizeResourceName(props.name);
      stringsConfig.modResults = AndroidConfig.Strings.setStringItem(
        [
          {
            $: {
              name: `share_${sanitizedName}_title`,
              translatable: 'false',
            },
            _: props.displayName!.replace(/'/g, "\\'"),
          },
        ],
        stringsConfig.modResults
      );
      return stringsConfig;
    });
  }

  // 3. Add share activity source sets if using React Native
  if (props.entry) {
    config = withAppBuildGradle(config, (buildGradleConfig) => {
      addShareSourceSets(buildGradleConfig, config, props);
      return buildGradleConfig;
    });
  }

  // 4. Generate theme resources and Activity template
  config = withDangerousMod(config, [
    'android',
    (dangerousConfig) => {
      const platformRoot = dangerousConfig.modRequest.platformProjectRoot;
      generateShareTheme(platformRoot, props);
      
      // Only generate Activity template if using React Native
      if (props.entry) {
        generateShareActivityTemplate(platformRoot, config, props);
      }
      
      return dangerousConfig;
    },
  ]);

  return config;
};

function sanitizeResourceName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9_]/g, '_');
}

function addShareActivity(
  mainApplication: any,
  config: any,
  props: ShareExtensionProps
) {
  const packageName = config.android?.package;
  if (!packageName)
    throw new Error('Android package name not found in app.json');

  mainApplication.activity = mainApplication.activity || [];

  const sanitizedName = sanitizeResourceName(props.name);
  const activityName = `.share.${props.name}ShareActivity`;
  const displayName = props.displayName || props.name;

  // Check if already added
  const alreadyAdded = mainApplication.activity.some(
    (a: any) => a.$['android:name'] === activityName
  );

  if (alreadyAdded) return;

  // Determine which MIME types to accept based on activation rules
  // Default to text, images, and URLs if not specified
  const mimeTypes = getMimeTypesForShare(props);

  // Create intent filters for each MIME type
  const intentFilters = mimeTypes.map((mimeType) => ({
    action: [
      { $: { 'android:name': 'android.intent.action.SEND' } },
      { $: { 'android:name': 'android.intent.action.SEND_MULTIPLE' } },
    ],
    category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
    data: [{ $: { 'android:mimeType': mimeType } }],
  }));

  const activity: any = {
    $: {
      'android:name': activityName,
      'android:label': props.displayName
        ? `@string/share_${sanitizedName}_title`
        : displayName,
      'android:theme': `@style/Theme.${props.name}Share`,
      'android:exported': 'true',
      'android:excludeFromRecents': 'true',
      'android:taskAffinity': '',
      'android:launchMode': 'singleTask',
    },
    'intent-filter': intentFilters,
  };

  mainApplication.activity.push(activity);
}

function getMimeTypesForShare(props: ShareExtensionProps): string[] {
  // For Android, we use standard MIME types
  // By default, support text, images, and all types
  // Users can customize this via Android-specific config in the future

  // Default set of MIME types for share extensions
  return [
    'text/plain', // Plain text and URLs
    'image/*', // All image types
    'video/*', // All video types
    '*/*', // All file types (fallback)
  ];
}

function addShareSourceSets(
  buildGradleConfig: any,
  config: any,
  props: ShareExtensionProps
) {
  const projectRoot = config._internal?.projectRoot || process.cwd();
  const shareAndroidDir = path.join(projectRoot, props.directory, 'android');

  // Only add sourceSets if share android directory will exist
  const { modResults } = buildGradleConfig;
  let contents = modResults.contents;

  // Calculate relative path from app/build.gradle to share directory
  const platformProjectRoot = path.join(projectRoot, 'android');
  const relativePath = path
    .relative(path.join(platformProjectRoot, 'app'), shareAndroidDir)
    .replace(/\\/g, '/');

  // Check if this share's sourceSet is already added
  const shareSourceSetPattern = new RegExp(
    `java\\.srcDirs\\s*\\+=\\s*\\['${relativePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'\\]`,
    's'
  );

  if (shareSourceSetPattern.test(contents)) {
    return; // Already added
  }

  // Check if sourceSets exists
  const sourceSetsRegex = /android\s*\{[^}]*sourceSets\s*\{/s;
  const hasSourceSets = sourceSetsRegex.test(contents);

  if (hasSourceSets) {
    // Add to existing sourceSets block
    const sourceSetsMatch = contents.match(
      /sourceSets\s*\{[^}]*main\s*\{[^}]*\}/s
    );
    if (sourceSetsMatch) {
      const mainBlockMatch = contents.match(
        /sourceSets\s*\{[^}]*main\s*\{([^}]*)\}/s
      );
      if (mainBlockMatch) {
        const mainBlockContent = mainBlockMatch[1];
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
            `$1$2            java.srcDirs += ['${relativePath}']\n$3`
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
        `$1\n    sourceSets {\n        main {\n            java.srcDirs += ['${relativePath}']\n        }\n    }`
      );
    }
  }

  modResults.contents = contents;
}

function generateShareTheme(platformRoot: string, props: ShareExtensionProps) {
  const projectRoot = platformRoot.replace(/\/android$/, '');
  
  // Generate theme in main app's res directory
  const valuesDir = path.join(platformRoot, 'app/src/main/res/values');
  fs.mkdirSync(valuesDir, { recursive: true });

  const themeName = `Theme.${props.name}Share`;
  const themeFilePath = path.join(
    valuesDir,
    `styles_share_${sanitizeResourceName(props.name)}.xml`
  );

  // Only create if it doesn't exist (user might have customized)
  if (!fs.existsSync(themeFilePath)) {
    const themeContent = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- Share Extension Theme for ${props.displayName || props.name} -->
    <!-- Inherits from app theme for consistency -->
    <style name="${themeName}" parent="AppTheme">
        <!-- Transparent background for share sheet appearance -->
        <item name="android:windowIsTranslucent">true</item>
        <item name="android:windowBackground">@android:color/transparent</item>
        <item name="android:windowContentOverlay">@null</item>
        <item name="android:windowNoTitle">true</item>
        <item name="android:windowIsFloating">false</item>
        <item name="android:backgroundDimEnabled">true</item>
    </style>
</resources>`;

    fs.writeFileSync(themeFilePath, themeContent);
  }
}

function generateShareActivityTemplate(
  platformRoot: string,
  config: any,
  props: ShareExtensionProps
) {
  const packageName = config.android?.package;
  if (!packageName) {
    throw new Error('Android package name not found in app.json');
  }

  const projectRoot = platformRoot.replace(/\/android$/, '');
  const shareDir = path.join(projectRoot, props.directory, 'android');
  
  // Create package directory structure: {shareDir}/share/
  const packagePath = packageName.replace(/\./g, '/');
  const activityDir = path.join(shareDir, packagePath, 'share');
  fs.mkdirSync(activityDir, { recursive: true });

  const activityFile = path.join(activityDir, `${props.name}ShareActivity.kt`);

  // Only create if it doesn't exist (user might have customized)
  if (!fs.existsSync(activityFile)) {
    // Read template
    const templatePath = path.join(
      __dirname,
      'templates',
      'ShareActivity.kt.template'
    );
    let template = fs.readFileSync(templatePath, 'utf-8');

    // Replace placeholders
    template = template.replace(/\{\{PACKAGE_NAME\}\}/g, packageName);
    template = template.replace(/\{\{TARGET_NAME\}\}/g, props.name);

    fs.writeFileSync(activityFile, template);
  }
}
