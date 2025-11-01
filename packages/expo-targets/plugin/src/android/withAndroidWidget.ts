import {
  ConfigPlugin,
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withStringsXml,
} from '@expo/config-plugins';
import * as path from 'path';
import * as fs from 'fs';
import type { TargetConfig, AndroidTargetConfig, Color } from '../config';

interface WidgetProps extends TargetConfig {
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
  if (androidConfig.description) {
    config = withStringsXml(config, (stringsConfig) => {
      stringsConfig.modResults = AndroidConfig.Strings.setStringItem(
        [{
          $: {
            name: `widget_${props.name.toLowerCase()}_description`,
            translatable: 'false',
          },
          _: androidConfig.description.replace(/'/g, "\\'"),
        }],
        stringsConfig.modResults
      );
      return stringsConfig;
    });
  }
  
  // 3. Generate resources and copy user code
  config = withDangerousMod(config, [
    'android',
    (dangerousConfig) => {
      const platformRoot = dangerousConfig.modRequest.platformProjectRoot;
      generateWidgetResources(platformRoot, config, props);
      copyUserCode(platformRoot, config, props);
      copyUserResources(platformRoot, config, props);
      return dangerousConfig;
    },
  ]);
  
  return config;
};

function addExpoTargetsReceiver(mainApplication: any, config: any) {
  const packageName = config.android?.package;
  if (!packageName) throw new Error('Android package name not found in app.json');
  
  mainApplication.receiver = mainApplication.receiver || [];
  
  const receiverName = 'expo.modules.targets.ExpoTargetsReceiver';
  const alreadyAdded = mainApplication.receiver.some(
    (r: any) => r.$['android:name'] === receiverName
  );
  
  if (alreadyAdded) return;
  
  mainApplication.receiver.push({
    '$': {
      'android:name': receiverName,
      'android:exported': 'false',
    },
    'intent-filter': [{
      action: [{ $: { 'android:name': 'expo.modules.targets.WIDGET_EVENT' } }],
    }],
  });
}

function addWidgetReceiver(mainApplication: any, config: any, props: WidgetProps) {
  const packageName = config.android?.package;
  mainApplication.receiver = mainApplication.receiver || [];
  
  const widgetClassName = `${packageName}.widget.${props.name}`;
  const alreadyAdded = mainApplication.receiver.some(
    (r: any) => r.$['android:name'] === widgetClassName
  );
  
  if (alreadyAdded) return;
  
  mainApplication.receiver.push({
    '$': {
      'android:name': widgetClassName,
      'android:exported': 'true',
      'android:label': props.displayName || props.name,
    },
    'intent-filter': [{
      action: [{ $: { 'android:name': 'android.appwidget.action.APPWIDGET_UPDATE' } }],
    }],
    'meta-data': [{
      $: {
        'android:name': 'android.appwidget.provider',
        'android:resource': `@xml/widgetprovider_${props.name.toLowerCase()}`,
      },
    }],
  });
}

function generateWidgetResources(
  platformRoot: string,
  config: any,
  props: WidgetProps
) {
  const androidConfig = props.android || {};
  const xmlDir = path.join(platformRoot, 'app/src/main/res/xml');
  fs.mkdirSync(xmlDir, { recursive: true });
  
  const minWidth = androidConfig.minWidth || '180dp';
  const minHeight = androidConfig.minHeight || '110dp';
  const resizeMode = androidConfig.resizeMode || 'horizontal|vertical';
  const updatePeriodMillis = androidConfig.updatePeriodMillis || 0;
  const widgetCategory = androidConfig.widgetCategory || 'home_screen';
  const layoutName = `widget_${props.name.toLowerCase()}`;
  
  let widgetInfo = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="${minWidth}"
    android:minHeight="${minHeight}"
    android:resizeMode="${resizeMode}"
    android:updatePeriodMillis="${updatePeriodMillis}"
    android:widgetCategory="${widgetCategory}"
    android:initialLayout="@layout/${layoutName}"`;
  
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
  
  widgetInfo += `>
</appwidget-provider>`;
  
  fs.writeFileSync(
    path.join(xmlDir, `widgetprovider_${props.name.toLowerCase()}.xml`),
    widgetInfo
  );
  
  if (androidConfig.colors) {
    generateColorResources(platformRoot, props, androidConfig.colors);
  }
}

function copyUserCode(platformRoot: string, config: any, props: WidgetProps) {
  const userAndroidDir = path.join(props.directory, 'android');
  if (!fs.existsSync(userAndroidDir)) return;
  
  const packageName = config.android?.package;
  const targetDir = path.join(
    platformRoot,
    'app/src/main/java',
    ...packageName.split('.'),
    'widget'
  );
  
  fs.mkdirSync(targetDir, { recursive: true });
  
  const files = fs.readdirSync(userAndroidDir);
  files.forEach(file => {
    if (file.endsWith('.kt') || file.endsWith('.java')) {
      const sourceFile = path.join(userAndroidDir, file);
      const destFile = path.join(targetDir, file);
      
      // Read the file and replace the package name placeholder
      let content = fs.readFileSync(sourceFile, 'utf8');
      content = content.replace(/package\s+YOUR_PACKAGE_NAME/g, `package ${packageName}.widget`);
      
      fs.writeFileSync(destFile, content);
    }
  });
}

function copyUserResources(platformRoot: string, config: any, props: WidgetProps) {
  const userResDir = path.join(props.directory, 'android', 'res');
  if (!fs.existsSync(userResDir)) return;
  
  const targetResDir = path.join(platformRoot, 'app/src/main/res');
  
  // Copy all resource directories (layout, drawable, values, etc.)
  function copyRecursive(src: string, dest: string) {
    if (!fs.existsSync(src)) return;
    
    if (fs.statSync(src).isDirectory()) {
      fs.mkdirSync(dest, { recursive: true });
      fs.readdirSync(src).forEach(item => {
        copyRecursive(path.join(src, item), path.join(dest, item));
      });
    } else {
      fs.copyFileSync(src, dest);
    }
  }
  
  copyRecursive(userResDir, targetResDir);
}

function generateColorResources(
  platformRoot: string,
  props: WidgetProps,
  colors: Record<string, string | Color>
) {
  const valuesDir = path.join(platformRoot, 'app/src/main/res/values');
  const valuesNightDir = path.join(platformRoot, 'app/src/main/res/values-night');
  
  fs.mkdirSync(valuesDir, { recursive: true });
  fs.mkdirSync(valuesNightDir, { recursive: true });
  
  const lightColors: string[] = [];
  const darkColors: string[] = [];
  
  Object.entries(colors).forEach(([name, value]) => {
    if (typeof value === 'string') {
      lightColors.push(`    <color name="${name}">${value}</color>`);
      darkColors.push(`    <color name="${name}">${value}</color>`);
    } else if (value.light || value.dark) {
      lightColors.push(`    <color name="${name}">${value.light || '#000000'}</color>`);
      darkColors.push(`    <color name="${name}">${value.dark || value.light || '#FFFFFF'}</color>`);
    }
  });
  
  if (lightColors.length === 0) return;
  
  const lightXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
${lightColors.join('\n')}
</resources>`;
  
  const darkXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
${darkColors.join('\n')}
</resources>`;
  
  fs.writeFileSync(path.join(valuesDir, `colors_${props.name.toLowerCase()}.xml`), lightXml);
  fs.writeFileSync(path.join(valuesNightDir, `colors_${props.name.toLowerCase()}.xml`), darkXml);
}
