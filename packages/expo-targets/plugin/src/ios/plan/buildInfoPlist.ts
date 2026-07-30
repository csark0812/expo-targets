import plist from '@expo/plist';

import type { ExtensionType } from '../../config';
import { TYPE_CHARACTERISTICS } from '../../domain/characteristics';

/**
 * Build the Info.plist XML string for a given extension type.
 * Pure: no filesystem I/O. Called by `planInfoPlist`.
 */

function deepMerge(target: any, source: any): any {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    // biome-ignore lint/complexity/noForEach: pre-existing; prefer for-of tracked
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (key in target) {
          output[key] = deepMerge(target[key], source[key]);
        } else {
          output[key] = source[key];
        }
      } else {
        output[key] = source[key];
      }
    });
  }

  return output;
}

function isObject(item: any): boolean {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: pre-existing complexity; tracked for refactor
// biome-ignore lint/complexity/useMaxParams: pre-existing complexity; tracked for refactor
// biome-ignore lint/complexity/noExcessiveLinesPerFunction: pre-existing complexity; tracked for refactor
export function getTargetInfoPlistForType(
  type: ExtensionType,
  customProperties?: Record<string, any>,
  shareExtensionConfig?: {
    activationRules?: { type: string; maxCount?: number }[];
    preprocessingFile?: string;
  },
  entry?: string,
  mainAppSchemes?: string[],
  targetsConfig?: any[],
  targetIcon?: string,
  intentsConfig?: {
    intentsSupported?: string[];
    intentsRestrictedWhileLocked?: string[];
  }
): string {
  const typeCharacteristics = TYPE_CHARACTERISTICS[type];
  if (!typeCharacteristics) {
    throw new Error(`Unknown extension type: ${type}`);
  }

  let basePlist: Record<string, any> = {
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

  // Merge type-specific basePlist properties
  basePlist = deepMerge(basePlist, typeCharacteristics.basePlist);

  // Automatically add NSExtensionPointIdentifier if specified
  if (typeCharacteristics.extensionPointIdentifier) {
    basePlist.NSExtension = {
      NSExtensionPointIdentifier: typeCharacteristics.extensionPointIdentifier,
      ...(basePlist.NSExtension || {}),
    };
  }

  // Handle activation rules for types that support them
  if (typeCharacteristics.supportsActivationRules) {
    const activationRules = shareExtensionConfig
      ? buildShareExtensionActivationRules(
          shareExtensionConfig.activationRules,
          shareExtensionConfig.preprocessingFile
        )
      : typeCharacteristics.activationRulesLocation === 'direct'
        ? { TRUEPREDICATE: true } // Default for action extensions
        : {
            // Default for share extensions
            NSExtensionActivationSupportsText: true,
            NSExtensionActivationSupportsWebURLWithMaxCount: 1,
          };

    if (typeCharacteristics.activationRulesLocation === 'attributes') {
      // Share extensions use NSExtensionAttributes
      basePlist.NSExtension = {
        ...basePlist.NSExtension,
        NSExtensionAttributes: {
          NSExtensionActivationRule: activationRules,
          ...(shareExtensionConfig?.preprocessingFile && {
            NSExtensionJavaScriptPreprocessingFile:
              shareExtensionConfig.preprocessingFile.replace(/\.[^/.]+$/, ''), // Remove extension
          }),
        },
      };
    } else if (typeCharacteristics.activationRulesLocation === 'direct') {
      // Action extensions use NSExtensionActivationRule directly
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

  // Handle IntentsSupported for intent and intent-ui types
  if ((type === 'intent' || type === 'intent-ui') && intentsConfig) {
    const nsExtension = basePlist.NSExtension || {};
    const nsExtensionAttributes = nsExtension.NSExtensionAttributes || {};

    if (
      intentsConfig.intentsSupported &&
      intentsConfig.intentsSupported.length > 0
    ) {
      nsExtensionAttributes.IntentsSupported = intentsConfig.intentsSupported;
    }

    if (
      type === 'intent' &&
      intentsConfig.intentsRestrictedWhileLocked &&
      intentsConfig.intentsRestrictedWhileLocked.length > 0
    ) {
      nsExtensionAttributes.IntentsRestrictedWhileLocked =
        intentsConfig.intentsRestrictedWhileLocked;
    }

    basePlist.NSExtension = {
      ...nsExtension,
      NSExtensionAttributes: nsExtensionAttributes,
    };
  }

  // Override NSExtensionPrincipalClass for React Native extensions
  // Note: Messages extensions keep MessagesViewController as it MUST extend MSMessagesAppViewController
  if (entry && (type === 'share' || type === 'action' || type === 'clip')) {
    const nsExtension = { ...basePlist.NSExtension };

    // Remove NSExtensionMainStoryboard for action extensions using React Native
    if (
      typeCharacteristics.activationRulesLocation === 'direct' &&
      nsExtension.NSExtensionMainStoryboard
    ) {
      nsExtension.NSExtensionMainStoryboard = undefined;
    }

    // For action extensions, ensure NSExtensionActivationRule stays directly under NSExtension
    // but preserve NSExtensionAttributes if it contains other keys like NSExtensionIcon
    if (typeCharacteristics.activationRulesLocation === 'direct') {
      const activationRule = nsExtension.NSExtensionActivationRule;
      const existingAttributes = nsExtension.NSExtensionAttributes || {};

      // Build NSExtensionAttributes with icon if provided, preserving other attributes
      const finalAttributes: Record<string, any> = { ...existingAttributes };

      // Remove NSExtensionActivationRule from attributes if it exists (should be direct)
      if (finalAttributes.NSExtensionActivationRule) {
        finalAttributes.NSExtensionActivationRule = undefined;
      }

      // Add NSExtensionIcon if targetIcon is provided (for action extensions)
      if (targetIcon && type === 'action') {
        finalAttributes.NSExtensionIcon = {
          // NSExtensionIconName can be an SF Symbol name (e.g., "photo.fill")
          // or an image asset name. iOS automatically detects SF Symbols vs image assets.
          NSExtensionIconName: targetIcon,
        };
      }

      // Only include NSExtensionAttributes if there are remaining attributes
      const extensionDict: Record<string, any> = {
        ...nsExtension,
        NSExtensionActivationRule: activationRule,
        NSExtensionPrincipalClass:
          '$(PRODUCT_MODULE_NAME).ReactNativeViewController',
      };

      if (Object.keys(finalAttributes).length > 0) {
        extensionDict.NSExtensionAttributes = finalAttributes;
      }

      basePlist.NSExtension = extensionDict;
    } else {
      basePlist.NSExtension = {
        ...nsExtension,
        NSExtensionPrincipalClass:
          '$(PRODUCT_MODULE_NAME).ReactNativeViewController',
      };
    }
  } else if (
    typeCharacteristics.activationRulesLocation === 'direct' &&
    !entry
  ) {
    // Native action extension needs NSExtensionMainStoryboard
    basePlist.NSExtension = {
      ...basePlist.NSExtension,
      NSExtensionMainStoryboard: 'MainInterface',
    };
  }

  // Auto-inject LSApplicationQueriesSchemes from main app's URL schemes
  // This allows extensions to query/open the main app via URL schemes
  if (mainAppSchemes && mainAppSchemes.length > 0) {
    const existingSchemes = customProperties?.LSApplicationQueriesSchemes || [];
    const allSchemes = [...new Set([...mainAppSchemes, ...existingSchemes])];

    basePlist.LSApplicationQueriesSchemes = allSchemes;
    // Note: Logged at caller level in withXcodeChanges for better context
  }

  // Embed targets config for runtime access via expo-constants
  // This makes Constants.expoConfig.extra.targets available in extensions
  if (targetsConfig && targetsConfig.length > 0) {
    basePlist.ExpoTargetsConfig = targetsConfig;
    // Note: Logged at caller level in withXcodeChanges for better context
  }

  if (customProperties) {
    basePlist = deepMerge(basePlist, customProperties);

    // Ensure NSExtensionPrincipalClass has $(PRODUCT_MODULE_NAME). prefix for Swift classes
    // This is required for iOS to find the Swift class at runtime
    if (basePlist.NSExtension?.NSExtensionPrincipalClass) {
      const principalClass = basePlist.NSExtension.NSExtensionPrincipalClass;
      // Add prefix if not already present and not using a storyboard
      if (
        typeof principalClass === 'string' &&
        !principalClass.startsWith('$(PRODUCT_MODULE_NAME).') &&
        !principalClass.includes('.')
      ) {
        basePlist.NSExtension.NSExtensionPrincipalClass = `$(PRODUCT_MODULE_NAME).${principalClass}`;
      }
    }

    // For action extensions, ensure NSExtensionActivationRule structure is correct
    // Custom properties might have added NSExtensionAttributes with NSExtensionActivationRule
    // Move it to direct level, but preserve other attributes like NSExtensionIcon
    if (
      typeCharacteristics.activationRulesLocation === 'direct' &&
      basePlist.NSExtension?.NSExtensionAttributes?.NSExtensionActivationRule
    ) {
      // Move NSExtensionActivationRule from NSExtensionAttributes to directly under NSExtension
      const activationRule =
        basePlist.NSExtension.NSExtensionAttributes.NSExtensionActivationRule;
      basePlist.NSExtension.NSExtensionAttributes.NSExtensionActivationRule =
        undefined;

      // Only remove NSExtensionAttributes if it's now empty (preserve other attributes like NSExtensionIcon)
      if (
        Object.keys(basePlist.NSExtension.NSExtensionAttributes).length === 0
      ) {
        basePlist.NSExtension.NSExtensionAttributes = undefined;
      }

      basePlist.NSExtension.NSExtensionActivationRule = activationRule;
    }

    // Merge actionIcon from customProperties if provided (allows override via infoPlist)
    if (
      typeCharacteristics.activationRulesLocation === 'direct' &&
      customProperties.NSExtension?.NSExtensionAttributes?.NSExtensionIcon
    ) {
      // Custom icon already set via infoPlist, use it
      if (!basePlist.NSExtension.NSExtensionAttributes) {
        basePlist.NSExtension.NSExtensionAttributes = {};
      }
      basePlist.NSExtension.NSExtensionAttributes.NSExtensionIcon =
        customProperties.NSExtension.NSExtensionAttributes.NSExtensionIcon;
    }
  }

  return plist.build(basePlist);
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
