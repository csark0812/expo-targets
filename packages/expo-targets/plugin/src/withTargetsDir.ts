import path from 'node:path';
import process from 'node:process';
import type { ConfigPlugin } from '@expo/config-plugins';
import { globSync } from 'glob';

import { withAndroidTarget } from './android/withAndroidTarget';
import { withAndroidTargetsConfig } from './android/withAndroidTargetsConfig';
import { collectRuntimeConfigs } from './codegen/collectRuntimeConfigs';
import {
  type TargetCodegenConfig,
  writeTargetsTypesFile,
} from './codegen/typedTargets';
import {
  ensureHostAppGroups,
  warnMissingMetroWrapper,
} from './ensureHostAppGroups';
import { withIOSTarget } from './ios/config-plugins/withIOSTarget';
import { Logger } from './logger';
import { resolveExcludedPackages } from './resolveExcludedPackages';

interface EvaluatedTarget {
  config: any;
  targetPath: string;
  targetDirName: string;
}

/** Plain-string `expo.runtimeVersion` (or updates.*) for App Group sideload gates. */
export function resolveRuntimeVersionFromExpoConfig(
  expoConfig: { runtimeVersion?: unknown; updates?: unknown } | null | undefined
): string {
  const top = expoConfig?.runtimeVersion;
  if (typeof top === 'string' && top) {
    return top;
  }
  const updates = expoConfig?.updates as
    | { runtimeVersion?: unknown }
    | undefined;
  if (typeof updates?.runtimeVersion === 'string' && updates.runtimeVersion) {
    return updates.runtimeVersion;
  }
  return '';
}

/**
 * Evaluate every `expo-target.config.*` once, up front, so the validation pass
 * and the processing pass agree on what they are looking at.
 */
function evaluateTargetConfigs(
  targetConfigFiles: string[],
  expoConfig: any
): EvaluatedTarget[] {
  return targetConfigFiles.map((targetPath) => {
    let evaluatedConfig = require(targetPath);

    // Handle ES module default export (export default config)
    if (evaluatedConfig?.default) {
      evaluatedConfig = evaluatedConfig.default;
    }

    // Handle function exports (like app.config.js)
    if (typeof evaluatedConfig === 'function') {
      evaluatedConfig = evaluatedConfig(expoConfig);
    }

    return {
      config: evaluatedConfig,
      targetPath,
      targetDirName: path.basename(path.dirname(targetPath)),
    };
  });
}

/**
 * `messages` and `stickers` both claim com.apple.message-payload-provider, and
 * iOS allows exactly one such extension per app.
 */
function validateMessagePayloadProviders(targets: EvaluatedTarget[]): void {
  const providers = targets
    .filter(({ config }) => config.platforms?.includes('ios') && config.type)
    .map(({ config, targetDirName }) => ({
      type: config.type,
      name: config.name || targetDirName,
    }))
    .filter((t) => t.type === 'messages' || t.type === 'stickers');

  if (providers.length <= 1) {
    return;
  }

  const typeNames = providers.map((t) => `${t.name} (${t.type})`).join(', ');
  throw new Error(
    'iOS limitation: Only one message payload provider extension is allowed per app. ' +
      `Found multiple: ${typeNames}. ` +
      `Both 'messages' and 'stickers' target types use the same extension point ` +
      '(com.apple.message-payload-provider) and cannot coexist. ' +
      'Choose either a messages app OR a stickers pack, but not both. ' +
      'See https://developer.apple.com/documentation/messages for details.'
  );
}

/**
 * Watch WidgetKit must nest under a watchOS companion in the same app.
 */
function validateWatchWidgetCompanion(targets: EvaluatedTarget[]): void {
  const iosTargets = targets.filter(
    ({ config }) => config.platforms?.includes('ios') && config.type
  );
  const hasWatchWidget = iosTargets.some(
    ({ config }) => config.type === 'watch-widget'
  );
  const hasWatch = iosTargets.some(({ config }) => config.type === 'watch');
  if (hasWatchWidget && !hasWatch) {
    throw new Error(
      'watch-widget requires a type: watch companion in the same app ' +
        '(watchOS WidgetKit must nest under a Watch .app, not the iOS host). ' +
        'Add targets/watch/ next to targets/watch-widget/.'
    );
  }
}

/** Ensure watch companions are applied before nested watch-widget extensions.
 * Expo `withXcodeProject` mods are LIFO (last registered runs first), so we
 * register watch-widget before watch.
 */
function sortTargetsForApply(targets: EvaluatedTarget[]): EvaluatedTarget[] {
  const registerOrder: Record<string, number> = {
    'watch-widget': 0,
    watch: 1,
  };
  return [...targets].sort((a, b) => {
    const ao = registerOrder[a.config.type] ?? 50;
    const bo = registerOrder[b.config.type] ?? 50;
    if (ao !== bo) {
      return ao - bo;
    }
    return a.targetDirName.localeCompare(b.targetDirName);
  });
}

/**
 * App Groups are inherited from the main app when a target does not name one.
 */
function resolveAppGroup(
  evaluatedConfig: any,
  expoConfig: any
): string | undefined {
  if (evaluatedConfig.appGroup) {
    return evaluatedConfig.appGroup;
  }

  const mainAppGroups =
    expoConfig.ios?.entitlements?.['com.apple.security.application-groups'];
  return Array.isArray(mainAppGroups) && mainAppGroups.length > 0
    ? mainAppGroups[0]
    : undefined;
}

interface TargetContext {
  target: EvaluatedTarget;
  targetDirectory: string;
  targetName: string;
  appGroup?: string;
  logger: Logger;
}

/**
 * An `intent` target with `ios.intents.ui`, or a `wallet` target with
 * `ios.wallet.ui`, implies a second companion UI target.
 */
const withCompanionUiTarget: ConfigPlugin<{
  context: TargetContext;
  companion: 'intent-ui' | 'wallet-ui';
  runtimeConfigs: any[];
}> = (config, { context, companion, runtimeConfigs }) => {
  const { target, targetDirectory, targetName, appGroup, logger } = context;
  const evaluatedConfig = target.config;
  const parent =
    companion === 'intent-ui'
      ? evaluatedConfig.ios?.intents
      : evaluatedConfig.ios?.wallet;

  if (!parent?.ui) {
    return config;
  }

  const uiConfig = typeof parent.ui === 'object' ? parent.ui : {};
  const uiName = uiConfig.name || `${targetName}UI`;
  const displayName = `${evaluatedConfig.displayName || targetName} UI`;

  logger.log(
    `Auto-generating ${companion === 'intent-ui' ? 'Intent' : 'Wallet'} UI target: ${uiName} (from ${targetName})`
  );

  const next = withIOSTarget(config, {
    type: companion,
    name: uiName,
    displayName,
    appGroup: evaluatedConfig.appGroup,
    bundleIdentifier: uiConfig.bundleIdentifier,
    directory: targetDirectory,
    configPath: target.targetPath,
    logger,
    ...(companion === 'intent-ui'
      ? {
          intents: { intentsSupported: parent.intentsSupported || [] },
          buildSubdirectory: uiName,
        }
      : {}),
  });

  // Store the companion config for runtime access
  runtimeConfigs.push({
    type: companion,
    name: uiName,
    displayName,
    platforms: ['ios'],
    appGroup,
  });

  return next;
};

const RN_SIDeload_TYPES = [
  'share',
  'action',
  'clip',
  'messages',
  'notification-content',
] as const;

function warnMissingRuntimeForSideload(opts: {
  evaluatedConfig: any;
  targetName: string;
  runtimeVersion: string;
  logger: Logger;
}): void {
  if (
    opts.evaluatedConfig.entry &&
    !opts.runtimeVersion &&
    RN_SIDeload_TYPES.includes(opts.evaluatedConfig.type)
  ) {
    opts.logger.warn(
      `expo.runtimeVersion is missing — App Group sideload for "${opts.targetName}" will never load (falls back to embedded). Set a string runtimeVersion in app.json.`
    );
  }
}

function applyIosCompanionTargets(opts: {
  config: any;
  evaluatedConfig: any;
  context: TargetContext;
  runtimeConfigs: any[];
}): any {
  let next = opts.config;
  if (opts.evaluatedConfig.type === 'intent') {
    next = withCompanionUiTarget(next, {
      context: opts.context,
      companion: 'intent-ui',
      runtimeConfigs: opts.runtimeConfigs,
    });
  }
  if (opts.evaluatedConfig.type === 'wallet') {
    next = withCompanionUiTarget(next, {
      context: opts.context,
      companion: 'wallet-ui',
      runtimeConfigs: opts.runtimeConfigs,
    });
  }
  return next;
}

const withTargetIos: ConfigPlugin<{
  context: TargetContext;
  runtimeConfigs: any[];
}> = (config, { context, runtimeConfigs }) => {
  const { target, targetDirectory, targetName, logger } = context;
  const evaluatedConfig = target.config;

  const intentsConfig =
    evaluatedConfig.type === 'intent' && evaluatedConfig.ios?.intents
      ? {
          intentsSupported: evaluatedConfig.ios.intents.intentsSupported || [],
          intentsRestrictedWhileLocked:
            evaluatedConfig.ios.intents.intentsRestrictedWhileLocked,
        }
      : undefined;

  const excludedPackages = resolveExcludedPackages({
    type: evaluatedConfig.type,
    entry: evaluatedConfig.entry,
    excludedPackages: evaluatedConfig.excludedPackages,
  });

  const runtimeVersion = resolveRuntimeVersionFromExpoConfig(config);
  warnMissingRuntimeForSideload({
    evaluatedConfig,
    targetName,
    runtimeVersion,
    logger,
  });

  const iosConfig = withIOSTarget(config, {
    ...(evaluatedConfig.ios || {}),
    type: evaluatedConfig.type,
    name: targetName,
    displayName: evaluatedConfig.displayName,
    appGroup: evaluatedConfig.appGroup,
    entry: evaluatedConfig.entry,
    ui: evaluatedConfig.ui,
    excludedPackages,
    runtimeVersion: runtimeVersion || undefined,
    directory: targetDirectory,
    configPath: target.targetPath,
    intents: intentsConfig,
    logger,
  });

  return applyIosCompanionTargets({
    config: iosConfig,
    evaluatedConfig,
    context,
    runtimeConfigs,
  });
};

const withTarget: ConfigPlugin<{
  target: EvaluatedTarget;
  projectRoot: string;
  runtimeConfigs: any[];
  logger: Logger;
}> = (config, { target, projectRoot, runtimeConfigs, logger }) => {
  const { config: evaluatedConfig, targetPath, targetDirName } = target;

  if (!evaluatedConfig.name) {
    throw new Error(
      `Target in ${targetDirName} must specify 'name' property in expo-target.config`
    );
  }

  const targetName = evaluatedConfig.name;
  logger.log(
    `Processing ${targetDirName}: type=${evaluatedConfig.type}, name=${targetName}`
  );

  const supportsIos = evaluatedConfig.platforms.includes('ios');
  const supportsAndroid = evaluatedConfig.platforms.includes('android');
  logger.log(
    `${targetDirName}: iOS=${supportsIos}, Android=${supportsAndroid}`
  );

  const targetDirectory = path.relative(projectRoot, path.dirname(targetPath));
  const appGroup = resolveAppGroup(evaluatedConfig, config);
  const context: TargetContext = {
    target,
    targetDirectory,
    targetName,
    appGroup,
    logger,
  };

  let next = config;

  if (supportsIos) {
    next = withTargetIos(next, { context, runtimeConfigs });
  }

  if (supportsAndroid) {
    next = withAndroidTarget(next, {
      ...evaluatedConfig,
      directory: targetDirectory,
    });
  }

  // Store full config for runtime access (with resolved appGroup)
  runtimeConfigs.push({ ...evaluatedConfig, appGroup });

  return next;
};

function finalizeTargetsConfig(
  config: any,
  opts: {
    targets: EvaluatedTarget[];
    projectRoot: string | undefined;
    runtimeConfigs: any[];
    expoConfig: any;
  }
): any {
  let next = config;
  next.extra = {
    ...next.extra,
    targets: opts.runtimeConfigs,
  };

  const hasAndroidTarget = opts.targets.some((t) =>
    t.config.platforms?.includes('android')
  );
  if (hasAndroidTarget && opts.runtimeConfigs.length > 0) {
    next = withAndroidTargetsConfig(next, {
      runtimeConfigs: opts.runtimeConfigs,
    });
  }

  if (opts.projectRoot) {
    const codegenConfigs: TargetCodegenConfig[] = collectRuntimeConfigs(
      opts.targets,
      opts.expoConfig
    ).map((cfg) => ({
      name: cfg.name,
      liveActivity: cfg.liveActivity,
    }));
    writeTargetsTypesFile(opts.projectRoot, codegenConfigs);
  }

  return next;
}

function applyAllTargets(
  config: any,
  opts: {
    targets: EvaluatedTarget[];
    projectRoot: string | undefined;
    logger: Logger;
    expoConfig: any;
  }
): any {
  const runtimeConfigs: any[] = [];
  let next = config;
  for (const target of opts.targets) {
    next = withTarget(next, {
      target,
      projectRoot: opts.projectRoot ?? process.cwd(),
      runtimeConfigs,
      logger: opts.logger,
    });
  }
  return finalizeTargetsConfig(next, {
    targets: opts.targets,
    projectRoot: opts.projectRoot,
    runtimeConfigs,
    expoConfig: opts.expoConfig,
  });
}

export const withTargetsDir: ConfigPlugin<{
  targetsRoot?: string;
  debug?: boolean;
}> = (config, options) => {
  const targetsRoot = options?.targetsRoot || './targets';
  const logger = new Logger(options?.debug ?? false);
  const projectRoot = config._internal?.projectRoot;

  const targetConfigFiles = globSync(
    `${targetsRoot}/*/expo-target.config.@(js|ts|json)`,
    {
      cwd: projectRoot,
      absolute: true,
    }
  );

  if (targetConfigFiles.length > 0) {
    logger.logSparse(true, `Found ${targetConfigFiles.length} target(s)`);
  }

  const targets = sortTargetsForApply(
    evaluateTargetConfigs(targetConfigFiles, config)
  );
  validateMessagePayloadProviders(targets);
  validateWatchWidgetCompanion(targets);

  let next = ensureHostAppGroups(config, targets, logger);
  warnMissingMetroWrapper(projectRoot, targets, logger);

  return applyAllTargets(next, {
    targets,
    projectRoot,
    logger,
    expoConfig: config,
  });
};
