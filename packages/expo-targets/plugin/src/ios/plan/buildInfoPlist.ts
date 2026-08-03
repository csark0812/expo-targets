import plist from '@expo/plist';

import type { ExtensionType } from '../../config';
import {
  TYPE_CHARACTERISTICS,
  type TypeCharacteristics,
} from '../../domain/characteristics';

/**
 * Build the Info.plist XML string for a given extension type.
 * Pure: no filesystem I/O. Called by `planInfoPlist`.
 */

export interface TargetInfoPlistOptions {
  customProperties?: Record<string, any>;
  shareExtensionConfig?: {
    activationRules?: { type: string; maxCount?: number }[];
    preprocessingFile?: string;
  };
  entry?: string;
  mainAppSchemes?: string[];
  targetsConfig?: any[];
  targetIcon?: string;
  /** Human-facing extension name (spaces OK). Written into CFBundleDisplayName. */
  displayName?: string;
  intentsConfig?: {
    intentsSupported?: string[];
    intentsRestrictedWhileLocked?: string[];
  };
}

/**
 * Everything the `apply*` helpers below need. `basePlist` is mutated in place;
 * only `applyCustomProperties` returns a new dictionary because it merges.
 */
interface PlistContext {
  basePlist: Record<string, any>;
  characteristics: TypeCharacteristics;
  type: ExtensionType;
  options: TargetInfoPlistOptions;
}

const REACT_NATIVE_PRINCIPAL_CLASS =
  '$(PRODUCT_MODULE_NAME).ReactNativeViewController';

/**
 * Types whose React Native entry is hosted by `ReactNativeViewController` as
 * an NSExtension principal class. Messages is excluded (MSMessagesAppViewController).
 * Clip is excluded: App Clips are applications and use `@main` + RN VC, not NSExtension.
 */
const REACT_NATIVE_ENTRY_TYPES = new Set<ExtensionType>(['share', 'action']);

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

function deepMerge(target: any, source: any): any {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    for (const key of Object.keys(source)) {
      output[key] =
        isObject(source[key]) && key in target
          ? deepMerge(target[key], source[key])
          : source[key];
    }
  }

  return output;
}

function createBasePlist(): Record<string, any> {
  return {
    CFBundleDisplayName: '$(PRODUCT_NAME)',
    CFBundleName: '$(PRODUCT_NAME)',
    CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
    CFBundlePackageType: '$(PRODUCT_BUNDLE_PACKAGE_TYPE)',
    CFBundleDevelopmentRegion: '$(DEVELOPMENT_LANGUAGE)',
    CFBundleShortVersionString: '$(MARKETING_VERSION)',
    CFBundleInfoDictionaryVersion: '6.0',
    CFBundleVersion: '$(CURRENT_PROJECT_VERSION)',
    CFBundleExecutable: '$(EXECUTABLE_NAME)',
  };
}

function applyExtensionPointIdentifier({
  basePlist,
  characteristics,
}: PlistContext): void {
  if (!characteristics.extensionPointIdentifier) {
    return;
  }

  // ExtensionKit (app-intent): EXAppExtensionAttributes, not NSExtension —
  // matches bacon / Apple packaging for com.apple.appintents-extension.
  if (
    characteristics.productType ===
    'com.apple.product-type.extensionkit-extension'
  ) {
    basePlist.EXAppExtensionAttributes = {
      EXExtensionPointIdentifier: characteristics.extensionPointIdentifier,
      ...(basePlist.EXAppExtensionAttributes || {}),
    };
    return;
  }

  basePlist.NSExtension = {
    NSExtensionPointIdentifier: characteristics.extensionPointIdentifier,
    ...(basePlist.NSExtension || {}),
  };
}

function resolveActivationRules({
  characteristics,
  options,
}: PlistContext): Record<string, any> {
  if (options.shareExtensionConfig) {
    return buildShareExtensionActivationRules(
      options.shareExtensionConfig.activationRules,
      options.shareExtensionConfig.preprocessingFile
    );
  }

  if (characteristics.activationRulesLocation === 'direct') {
    return { TRUEPREDICATE: true };
  }

  return {
    NSExtensionActivationSupportsText: true,
    NSExtensionActivationSupportsWebURLWithMaxCount: 1,
  };
}

function applyActivationRules(context: PlistContext): void {
  const { basePlist, characteristics, options } = context;
  if (!characteristics.supportsActivationRules) {
    return;
  }

  const activationRules = resolveActivationRules(context);
  const preprocessingFile = options.shareExtensionConfig?.preprocessingFile;

  if (characteristics.activationRulesLocation === 'attributes') {
    basePlist.NSExtension = {
      ...basePlist.NSExtension,
      NSExtensionAttributes: {
        NSExtensionActivationRule: activationRules,
        ...(preprocessingFile && {
          NSExtensionJavaScriptPreprocessingFile: preprocessingFile.replace(
            /\.[^/.]+$/,
            ''
          ),
        }),
      },
    };
    return;
  }

  if (characteristics.activationRulesLocation === 'direct') {
    basePlist.NSExtension = {
      ...basePlist.NSExtension,
      NSExtensionActivationRule:
        Object.keys(activationRules).length === 1 &&
        'TRUEPREDICATE' in activationRules
          ? 'TRUEPREDICATE'
          : activationRules,
    };
  }
}

function applyIntentsConfig({ basePlist, type, options }: PlistContext): void {
  const intentsConfig = options.intentsConfig;
  if (!intentsConfig || (type !== 'intent' && type !== 'intent-ui')) {
    return;
  }

  const nsExtension = basePlist.NSExtension || {};
  const nsExtensionAttributes = nsExtension.NSExtensionAttributes || {};

  if (intentsConfig.intentsSupported?.length) {
    nsExtensionAttributes.IntentsSupported = intentsConfig.intentsSupported;
  }

  if (type === 'intent' && intentsConfig.intentsRestrictedWhileLocked?.length) {
    nsExtensionAttributes.IntentsRestrictedWhileLocked =
      intentsConfig.intentsRestrictedWhileLocked;
  }

  basePlist.NSExtension = {
    ...nsExtension,
    NSExtensionAttributes: nsExtensionAttributes,
  };
}

/**
 * Attributes for an action extension: the activation rule has to sit directly
 * under NSExtension, but other attributes (like the icon) must survive.
 */
function buildDirectAttributes(
  { type, options }: PlistContext,
  nsExtension: Record<string, any>
): Record<string, any> {
  const attributes: Record<string, any> = {
    ...(nsExtension.NSExtensionAttributes || {}),
  };

  if (attributes.NSExtensionActivationRule) {
    attributes.NSExtensionActivationRule = undefined;
  }

  if (options.targetIcon && type === 'action') {
    attributes.NSExtensionIcon = {
      // NSExtensionIconName can be an SF Symbol name (e.g., "photo.fill")
      // or an image asset name. iOS automatically detects which it is.
      NSExtensionIconName: options.targetIcon,
    };
  }

  return attributes;
}

function applyNativeStoryboard({
  basePlist,
  characteristics,
  options,
}: PlistContext): void {
  if (characteristics.activationRulesLocation !== 'direct' || options.entry) {
    return;
  }

  basePlist.NSExtension = {
    ...basePlist.NSExtension,
    NSExtensionMainStoryboard: 'MainInterface',
  };
}

function applyPrincipalClass(context: PlistContext): void {
  const { basePlist, characteristics, type, options } = context;

  if (!(options.entry && REACT_NATIVE_ENTRY_TYPES.has(type))) {
    applyNativeStoryboard(context);
    return;
  }

  const nsExtension = { ...basePlist.NSExtension };

  if (characteristics.activationRulesLocation !== 'direct') {
    basePlist.NSExtension = {
      ...nsExtension,
      NSExtensionPrincipalClass: REACT_NATIVE_PRINCIPAL_CLASS,
    };
    return;
  }

  if (nsExtension.NSExtensionMainStoryboard) {
    nsExtension.NSExtensionMainStoryboard = undefined;
  }

  const activationRule = nsExtension.NSExtensionActivationRule;
  const attributes = buildDirectAttributes(context, nsExtension);

  const extensionDict: Record<string, any> = {
    ...nsExtension,
    NSExtensionActivationRule: activationRule,
    NSExtensionPrincipalClass: REACT_NATIVE_PRINCIPAL_CLASS,
  };

  if (Object.keys(attributes).length > 0) {
    extensionDict.NSExtensionAttributes = attributes;
  }

  basePlist.NSExtension = extensionDict;
}

/**
 * iOS only finds a Swift principal class when it is module-qualified.
 */
function qualifyPrincipalClass(basePlist: Record<string, any>): void {
  const principalClass = basePlist.NSExtension?.NSExtensionPrincipalClass;
  if (
    typeof principalClass === 'string' &&
    !principalClass.startsWith('$(PRODUCT_MODULE_NAME).') &&
    !principalClass.includes('.')
  ) {
    basePlist.NSExtension.NSExtensionPrincipalClass = `$(PRODUCT_MODULE_NAME).${principalClass}`;
  }
}

/**
 * Custom properties may nest NSExtensionActivationRule under
 * NSExtensionAttributes; action extensions need it one level up.
 */
function hoistActivationRule(basePlist: Record<string, any>): void {
  const attributes = basePlist.NSExtension?.NSExtensionAttributes;
  if (!attributes?.NSExtensionActivationRule) {
    return;
  }

  const activationRule = attributes.NSExtensionActivationRule;
  attributes.NSExtensionActivationRule = undefined;

  if (Object.keys(attributes).length === 0) {
    basePlist.NSExtension.NSExtensionAttributes = undefined;
  }

  basePlist.NSExtension.NSExtensionActivationRule = activationRule;
}

function applyCustomIcon(
  basePlist: Record<string, any>,
  customProperties: Record<string, any>
): void {
  const icon =
    customProperties.NSExtension?.NSExtensionAttributes?.NSExtensionIcon;
  if (!icon) {
    return;
  }

  if (!basePlist.NSExtension.NSExtensionAttributes) {
    basePlist.NSExtension.NSExtensionAttributes = {};
  }
  basePlist.NSExtension.NSExtensionAttributes.NSExtensionIcon = icon;
}

function applyCustomProperties({
  basePlist,
  characteristics,
  options,
}: PlistContext): Record<string, any> {
  const customProperties = options.customProperties;
  if (!customProperties) {
    return basePlist;
  }

  const merged = deepMerge(basePlist, customProperties);
  qualifyPrincipalClass(merged);

  if (characteristics.activationRulesLocation === 'direct') {
    hoistActivationRule(merged);
    applyCustomIcon(merged, customProperties);
  }

  return merged;
}

export function getTargetInfoPlistForType(
  type: ExtensionType,
  options: TargetInfoPlistOptions = {}
): string {
  const characteristics = TYPE_CHARACTERISTICS[type];
  if (!characteristics) {
    throw new Error(`Unknown extension type: ${type}`);
  }

  const basePlist = deepMerge(createBasePlist(), characteristics.basePlist);
  // Literal displayName wins over $(PRODUCT_NAME). INFOPLIST_KEY_* does not
  // override an existing Info.plist key, so write it here.
  if (options.displayName?.trim()) {
    basePlist.CFBundleDisplayName = options.displayName.trim();
  }
  const context: PlistContext = { basePlist, characteristics, type, options };

  applyExtensionPointIdentifier(context);
  applyActivationRules(context);
  applyIntentsConfig(context);
  applyPrincipalClass(context);

  // Extensions query/open the host app through its URL schemes.
  if (options.mainAppSchemes?.length) {
    const existing =
      options.customProperties?.LSApplicationQueriesSchemes || [];
    basePlist.LSApplicationQueriesSchemes = [
      ...new Set([...options.mainAppSchemes, ...existing]),
    ];
  }

  // Makes Constants.expoConfig.extra.targets available inside extensions.
  if (options.targetsConfig?.length) {
    basePlist.ExpoTargetsConfig = options.targetsConfig;
  }

  return plist.build(applyCustomProperties(context));
}

/**
 * Build NSExtensionActivationRule from share/action extension config
 * Used for both share extensions (with NSExtensionAttributes) and action extensions
 * @see https://developer.apple.com/library/archive/documentation/General/Conceptual/ExtensibilityPG/ExtensionScenarios.html
 */
export function buildShareExtensionActivationRules(
  activationRules?: {
    type: string;
    maxCount?: number;
  }[],
  preprocessingFile?: string
): Record<string, any> {
  if (!activationRules || activationRules.length === 0) {
    // Default: text and url
    return {
      NSExtensionActivationSupportsText: true,
      NSExtensionActivationSupportsWebURLWithMaxCount: 1,
    };
  }

  return activationRules.reduce(
    (acc, rule) => {
      const maxCount = rule.maxCount ?? 1;

      switch (rule.type) {
        case 'text':
          return {
            ...acc,
            NSExtensionActivationSupportsText: true,
          };
        case 'url':
          // If preprocessing file exists, enable webpage support
          if (preprocessingFile) {
            return {
              ...acc,
              NSExtensionActivationSupportsWebPageWithMaxCount: maxCount,
              NSExtensionActivationSupportsWebURLWithMaxCount: maxCount,
            };
          }
          return {
            ...acc,
            NSExtensionActivationSupportsWebURLWithMaxCount: maxCount,
          };
        case 'webpage':
          // Explicit webpage support (requires preprocessing file)
          return {
            ...acc,
            NSExtensionActivationSupportsWebPageWithMaxCount: maxCount,
          };
        case 'image':
          return {
            ...acc,
            NSExtensionActivationSupportsImageWithMaxCount: maxCount,
          };
        case 'video':
          return {
            ...acc,
            NSExtensionActivationSupportsMovieWithMaxCount: maxCount,
          };
        case 'file':
          return {
            ...acc,
            NSExtensionActivationSupportsFileWithMaxCount: maxCount,
          };
        default:
          return acc;
      }
    },
    {} as Record<string, any>
  );
}
