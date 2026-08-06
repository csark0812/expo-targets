import path from 'node:path';
import process from 'node:process';
import fs from 'fs-extra';
import prompts from 'prompts';
import { copyTemplate } from './copyTemplate';
import { generateConfig } from './generateConfig';
import { getTargetPromptQuestions } from './prompts';
import {
  getReactNativeTemplate,
  isReactNativeCapableType,
} from './reactNativeTemplate';
import { resolveAndroidPackage } from './resolveAndroidPackage';
import { resolveAppGroup } from './resolveAppGroup';
import {
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
};

function writeHostHelper(targetDir: string, pascalName: string): void {
  const indexTs = `import { createTarget } from 'expo-targets';

export const ${pascalToCamel(pascalName)} = createTarget('${pascalName}');
`;
  fs.writeFileSync(path.join(targetDir, 'index.ts'), indexTs);
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
  });

  if (response.useReactNative) {
    const entryFile = path.join(targetDir, 'index.tsx');
    fs.writeFileSync(
      entryFile,
      getReactNativeTemplate(response.type ?? '', pascalName)
    );
  }
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

  if (type === 'share' || type === 'action') {
    const kind = type === 'action' ? 'Action' : 'Share';
    fs.mkdirSync(deepenDir, { recursive: true });
    fs.writeFileSync(
      path.join(deepenDir, `${pascalName}${kind}Activity.kt`),
      getShareActionActivityTemplate({
        packageName,
        pascalName,
        segment,
        kind,
        useReactNative: Boolean(response.useReactNative),
      })
    );
    return;
  }

  if (type === 'notification-service' || type === 'notification-content') {
    fs.mkdirSync(deepenDir, { recursive: true });
    fs.writeFileSync(
      path.join(deepenDir, `${pascalName}NotificationService.kt`),
      getNotificationServiceDeepenTemplate({
        packageName,
        pascalName,
        segment,
      })
    );
    return;
  }

  const systemDeepen: Record<
    string,
    { fileBaseName: string; libraryClass: string; libraryImport: string }
  > = {
    'file-provider': {
      fileBaseName: `${pascalName}DocumentsProvider`,
      libraryClass: 'ExpoTargetsDocumentsProvider',
      libraryImport:
        'expo.modules.targets.system.ExpoTargetsDocumentsProvider',
    },
    'file-provider-ui': {
      fileBaseName: `${pascalName}FileProviderUiActivity`,
      libraryClass: 'ExpoTargetsFileProviderUiActivity',
      libraryImport:
        'expo.modules.targets.system.ExpoTargetsFileProviderUiActivity',
    },
    'credentials-provider': {
      fileBaseName: `${pascalName}AutofillService`,
      libraryClass: 'ExpoTargetsAutofillService',
      libraryImport: 'expo.modules.targets.system.ExpoTargetsAutofillService',
    },
    keyboard: {
      fileBaseName: `${pascalName}InputMethodService`,
      libraryClass: 'ExpoTargetsInputMethodService',
      libraryImport:
        'expo.modules.targets.system.ExpoTargetsInputMethodService',
    },
    'call-directory': {
      fileBaseName: `${pascalName}CallScreeningService`,
      libraryClass: 'ExpoTargetsCallScreeningService',
      libraryImport:
        'expo.modules.targets.system.ExpoTargetsCallScreeningService',
    },
    'print-service': {
      fileBaseName: `${pascalName}PrintService`,
      libraryClass: 'ExpoTargetsPrintService',
      libraryImport: 'expo.modules.targets.system.ExpoTargetsPrintService',
    },
    'network-packet-tunnel': {
      fileBaseName: `${pascalName}VpnService`,
      libraryClass: 'ExpoTargetsVpnService',
      libraryImport: 'expo.modules.targets.system.ExpoTargetsVpnService',
    },
  };

  const system = systemDeepen[type];
  if (system) {
    fs.mkdirSync(deepenDir, { recursive: true });
    fs.writeFileSync(
      path.join(deepenDir, `${system.fileBaseName}.kt`),
      getSystemServiceDeepenTemplate({
        packageName,
        segment,
        fileBaseName: system.fileBaseName,
        libraryClass: system.libraryClass,
        libraryImport: system.libraryImport,
      })
    );
    return;
  }

  if (type !== 'widget') {
    // Apple-only / not yet dual — leave empty android/ only if platforms includes android by mistake.
    fs.mkdirSync(path.join(targetDir, 'android'), { recursive: true });
    return;
  }

  const widgetSegment = sanitizeAndroidWidgetSegment(pascalName);
  const ktDir = path.join(
    targetDir,
    'android',
    packagePath,
    'widget',
    widgetSegment
  );
  fs.mkdirSync(ktDir, { recursive: true });
  fs.writeFileSync(
    path.join(ktDir, `${pascalName}.kt`),
    getGlanceWidgetTemplate({
      packageName,
      pascalName,
      widgetSegment,
      appGroup,
    })
  );
}

async function resolveResponse(
  options: ScaffoldOptions
): Promise<TargetPromptResponse | null> {
  if (options.nonInteractive || (options.type && options.name)) {
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
    return {
      type,
      name,
      platforms,
      useReactNative,
      includeIntentUI: options.includeIntentUI,
      includeLiveActivity: options.includeLiveActivity,
      configurableWidget: options.configurableWidget,
    };
  }

  return (await prompts(getTargetPromptQuestions(), {
    onCancel: () => process.exit(0),
  })) as TargetPromptResponse;
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

  fs.mkdirSync(targetDir, { recursive: true });

  const pascalName = kebabToPascal(response.name);
  const appGroup = resolveAppGroup(projectRoot);
  const packageName = resolveAndroidPackage(projectRoot);
  const config = generateConfig({
    type: response.type,
    kebabName: response.name,
    pascalName,
    platforms: response.platforms,
    useReactNative: response.useReactNative,
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

  if (!response.useReactNative) {
    writeHostHelper(targetDir, pascalName);
  }

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
