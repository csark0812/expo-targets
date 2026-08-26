import path from 'node:path';
import process from 'node:process';
import fs from 'fs-extra';
import prompts from 'prompts';
import { copyTemplate } from './copyTemplate';
import { getExpoUiWidgetTemplate } from './expoUiWidgetTemplate';
import { generateConfig } from './generateConfig';
import { getTargetPromptQuestions } from './prompts';
import {
  getReactNativeTemplate,
  isReactNativeCapableType,
} from './reactNativeTemplate';
import { resolveAndroidPackage } from './resolveAndroidPackage';
import { resolveAppGroup } from './resolveAppGroup';
import {
  androidWidgetKtPath,
  getGlanceWidgetTemplate,
  getNotificationServiceDeepenTemplate,
  getShareActionActivityTemplate,
  getSystemServiceDeepenTemplate,
  sanitizeAndroidTargetSegment,
  sanitizeAndroidWidgetSegment,
} from './templates/android';
import { kebabToPascal, pascalToCamel } from './utils';
import {
  printWireFailures,
  printWireSuccess,
  wireHost,
  wireHostFailed,
} from './wireHost';

export type ScaffoldOptions = {
  type?: string;
  name?: string;
  platforms?: string[];
  useReactNative?: boolean;
  includeIntentUI?: boolean;
  includeLiveActivity?: boolean;
  configurableWidget?: boolean;
  /** Widget UI: native (default) or expo-ui Layout sandbox. */
  widgetUi?: 'native' | 'expo-ui';
  noWire?: boolean;
  /** When true, skip prompts and require type + name. */
  nonInteractive?: boolean;
};

type TargetPromptResponse = {
  type?: string;
  name?: string;
  platforms: string[];
  useReactNative?: boolean;
  includeIntentUI?: boolean;
  includeLiveActivity?: boolean;
  configurableWidget?: boolean;
  widgetUi?: 'native' | 'expo-ui';
};

function writeHostHelper(
  targetDir: string,
  pascalName: string,
  options?: { includeLiveActivity?: boolean; attributesName?: string }
): void {
  const camel = pascalToCamel(pascalName);
  const imports = options?.includeLiveActivity
    ? "import { LiveActivity, createTarget } from 'expo-targets';"
    : "import { createTarget } from 'expo-targets';";
  let body = `\nexport const ${camel} = createTarget('${pascalName}');\n`;
  if (options?.includeLiveActivity && options.attributesName) {
    body += `\nexport const ${camel}LiveActivity = LiveActivity.create('${options.attributesName}');\n`;
  }
  fs.writeFileSync(path.join(targetDir, 'index.ts'), `${imports}${body}`);
}

function writeIosFiles(options: {
  targetDir: string;
  response: TargetPromptResponse;
  pascalName: string;
  appGroup: string;
}): void {
  const { targetDir, response, pascalName, appGroup } = options;
  if (!response.platforms.includes('ios')) {
    return;
  }

  const attributesName = `${pascalName}Attributes`;
  const appIntentHookName = `${pascalName}IntentPerform`;
  const expoUiWidget =
    response.type === 'widget' && response.widgetUi === 'expo-ui';

  copyTemplate({
    type: response.type ?? '',
    platform: 'ios',
    targetDir,
    pascalName,
    includeIntentUi: response.includeIntentUI,
    appGroup,
    includeLiveActivity: response.includeLiveActivity,
    liveActivityAttributesName: attributesName,
    appIntentHookName,
    appIntentTitle: pascalName,
    configurableWidget: response.configurableWidget,
    expoUiWidget,
  });

  if (expoUiWidget) {
    fs.writeFileSync(
      path.join(targetDir, 'index.tsx'),
      getExpoUiWidgetTemplate(pascalName)
    );
    return;
  }

  if (response.useReactNative) {
    const entryFile = path.join(targetDir, 'index.tsx');
    fs.writeFileSync(
      entryFile,
      getReactNativeTemplate(response.type ?? '', pascalName)
    );
  }
}

const SYSTEM_DEEPEN: Record<
  string,
  { fileBaseName: string; libraryClass: string; libraryImport: string }
> = {
  'file-provider': {
    fileBaseName: 'DocumentsProvider',
    libraryClass: 'ExpoTargetsDocumentsProvider',
    libraryImport: 'expo.modules.targets.system.ExpoTargetsDocumentsProvider',
  },
  'file-provider-ui': {
    fileBaseName: 'FileProviderUiActivity',
    libraryClass: 'ExpoTargetsFileProviderUiActivity',
    libraryImport:
      'expo.modules.targets.system.ExpoTargetsFileProviderUiActivity',
  },
  'credentials-provider': {
    fileBaseName: 'AutofillService',
    libraryClass: 'ExpoTargetsAutofillService',
    libraryImport: 'expo.modules.targets.system.ExpoTargetsAutofillService',
  },
  keyboard: {
    fileBaseName: 'InputMethodService',
    libraryClass: 'ExpoTargetsInputMethodService',
    libraryImport: 'expo.modules.targets.system.ExpoTargetsInputMethodService',
  },
  'call-directory': {
    fileBaseName: 'CallScreeningService',
    libraryClass: 'ExpoTargetsCallScreeningService',
    libraryImport:
      'expo.modules.targets.system.ExpoTargetsCallScreeningService',
  },
  'print-service': {
    fileBaseName: 'PrintService',
    libraryClass: 'ExpoTargetsPrintService',
    libraryImport: 'expo.modules.targets.system.ExpoTargetsPrintService',
  },
  'network-packet-tunnel': {
    fileBaseName: 'VpnService',
    libraryClass: 'ExpoTargetsVpnService',
    libraryImport: 'expo.modules.targets.system.ExpoTargetsVpnService',
  },
};

function writeShareActionAndroid(
  deepenDir: string,
  opts: {
    type: string;
    pascalName: string;
    packageName: string;
    segment: string;
    useReactNative?: boolean;
  }
): boolean {
  if (opts.type !== 'share' && opts.type !== 'action') {
    return false;
  }
  const kind = opts.type === 'action' ? 'Action' : 'Share';
  fs.mkdirSync(deepenDir, { recursive: true });
  fs.writeFileSync(
    path.join(deepenDir, `${opts.pascalName}${kind}Activity.kt`),
    getShareActionActivityTemplate({
      packageName: opts.packageName,
      pascalName: opts.pascalName,
      segment: opts.segment,
      kind,
      useReactNative: Boolean(opts.useReactNative),
    })
  );
  return true;
}

function writeNotificationAndroid(
  deepenDir: string,
  opts: {
    type: string;
    pascalName: string;
    packageName: string;
    segment: string;
  }
): boolean {
  if (
    opts.type !== 'notification-service' &&
    opts.type !== 'notification-content'
  ) {
    return false;
  }
  fs.mkdirSync(deepenDir, { recursive: true });
  fs.writeFileSync(
    path.join(deepenDir, `${opts.pascalName}NotificationService.kt`),
    getNotificationServiceDeepenTemplate({
      packageName: opts.packageName,
      pascalName: opts.pascalName,
      segment: opts.segment,
    })
  );
  return true;
}

function writeSystemAndroid(
  deepenDir: string,
  opts: {
    type: string;
    pascalName: string;
    packageName: string;
    segment: string;
  }
): boolean {
  const template = SYSTEM_DEEPEN[opts.type];
  if (!template) {
    return false;
  }
  const fileBaseName = `${opts.pascalName}${template.fileBaseName}`;
  fs.mkdirSync(deepenDir, { recursive: true });
  fs.writeFileSync(
    path.join(deepenDir, `${fileBaseName}.kt`),
    getSystemServiceDeepenTemplate({
      packageName: opts.packageName,
      segment: opts.segment,
      fileBaseName,
      libraryClass: template.libraryClass,
      libraryImport: template.libraryImport,
    })
  );
  return true;
}

function writeWidgetAndroid(
  targetDir: string,
  opts: {
    pascalName: string;
    packageName: string;
    appGroup: string;
  }
): void {
  const widgetSegment = sanitizeAndroidWidgetSegment(opts.pascalName);
  const ktPath = androidWidgetKtPath(targetDir, opts.pascalName);
  fs.mkdirSync(path.dirname(ktPath), { recursive: true });
  fs.writeFileSync(
    ktPath,
    getGlanceWidgetTemplate({
      packageName: opts.packageName,
      pascalName: opts.pascalName,
      widgetSegment,
      appGroup: opts.appGroup,
    })
  );
}

/** Emit Android deepen stubs for in-wave types (W0–W3) — real .kt, not README. */
function writeAndroidFiles(options: {
  targetDir: string;
  response: TargetPromptResponse;
  pascalName: string;
  appGroup: string;
  packageName: string;
}): void {
  const { targetDir, response, pascalName, appGroup, packageName } = options;
  if (!response.platforms.includes('android')) {
    return;
  }

  const type = response.type ?? '';
  const segment = sanitizeAndroidTargetSegment(response.name ?? pascalName);
  const packagePath = packageName.replace(/\./g, '/');
  const deepenDir = path.join(
    targetDir,
    'android',
    packagePath,
    'target',
    segment
  );
  const deepenOpts = {
    type,
    pascalName,
    packageName,
    segment,
    useReactNative: response.useReactNative,
  };

  if (writeShareActionAndroid(deepenDir, deepenOpts)) {
    return;
  }
  if (writeNotificationAndroid(deepenDir, deepenOpts)) {
    return;
  }
  if (writeSystemAndroid(deepenDir, deepenOpts)) {
    return;
  }
  if (type !== 'widget') {
    fs.mkdirSync(path.join(targetDir, 'android'), { recursive: true });
    return;
  }
  writeWidgetAndroid(targetDir, { pascalName, packageName, appGroup });
}

function resolveNonInteractive(
  options: ScaffoldOptions
): TargetPromptResponse | null {
  const type = options.type;
  const name = options.name;
  if (!(type && name)) {
    console.error(
      'Usage: npx expo-targets add <type> <name>\n' +
        'Omit args for interactive mode: npx expo-targets add'
    );
    return null;
  }
  const platforms = options.platforms?.length ? options.platforms : ['ios'];
  const useReactNative =
    options.useReactNative ?? isReactNativeCapableType(type);
  const widgetUi =
    type === 'widget' ? (options.widgetUi ?? 'native') : undefined;
  return {
    type,
    name,
    platforms,
    useReactNative,
    includeIntentUI: options.includeIntentUI,
    includeLiveActivity: options.includeLiveActivity,
    configurableWidget: options.configurableWidget,
    widgetUi,
  };
}

async function resolveResponse(
  options: ScaffoldOptions
): Promise<TargetPromptResponse | null> {
  if (options.nonInteractive || (options.type && options.name)) {
    return resolveNonInteractive(options);
  }

  return (await prompts(getTargetPromptQuestions(), {
    onCancel: () => process.exit(0),
  })) as TargetPromptResponse;
}

function writeScaffoldedTarget(
  projectRoot: string,
  response: TargetPromptResponse
): string {
  const targetDir = path.join(projectRoot, 'targets', response.name!);
  fs.mkdirSync(targetDir, { recursive: true });

  const pascalName = kebabToPascal(response.name!);
  const appGroup = resolveAppGroup(projectRoot);
  const packageName = resolveAndroidPackage(projectRoot);
  const config = generateConfig({
    type: response.type!,
    kebabName: response.name!,
    pascalName,
    platforms: response.platforms,
    useReactNative: response.useReactNative,
    widgetUi: response.widgetUi,
    configurableWidget: response.configurableWidget,
    includeIntentUi: response.includeIntentUI,
    appGroup,
    includeLiveActivity: response.includeLiveActivity,
    liveActivityAttributesName: `${pascalName}Attributes`,
  });
  fs.writeFileSync(path.join(targetDir, 'expo-target.config.json'), config);

  writeIosFiles({ targetDir, response, pascalName, appGroup });
  writeAndroidFiles({
    targetDir,
    response,
    pascalName,
    appGroup,
    packageName,
  });

  const expoUiWidget =
    response.type === 'widget' && response.widgetUi === 'expo-ui';
  if (!(response.useReactNative || expoUiWidget)) {
    writeHostHelper(targetDir, pascalName, {
      includeLiveActivity: response.includeLiveActivity,
      attributesName: `${pascalName}Attributes`,
    });
  }

  return targetDir;
}

export async function scaffoldTarget(
  options: ScaffoldOptions = {}
): Promise<number> {
  const noWire = options.noWire ?? process.argv.includes('--no-wire');
  const response = await resolveResponse(options);

  if (!(response?.type && response.name)) {
    return 0;
  }

  const projectRoot = process.cwd();
  const targetDir = path.join(projectRoot, 'targets', response.name);
  if (fs.existsSync(targetDir)) {
    console.error(
      `Target directory already exists: targets/${response.name}/\n` +
        'Choose a different name or remove the existing directory.'
    );
    return 1;
  }

  writeScaffoldedTarget(projectRoot, response);

  if (noWire) {
    console.log(`\n✓ Created target: targets/${response.name}/`);
    console.log('\nHost wiring skipped (--no-wire).');
    return 0;
  }

  return finishHostWire(projectRoot, response.name);
}

function finishHostWire(projectRoot: string, targetName: string): number {
  const wireResult = wireHost(projectRoot);
  if (!wireResult.expo.ok) {
    printWireFailures({ ...wireResult, metro: { ok: true } });
  }
  if (wireHostFailed(wireResult)) {
    printWireFailures(wireResult);
    return 1;
  }
  printWireSuccess(targetName, wireResult);
  return 0;
}
