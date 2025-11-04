import plist from '@expo/plist';

import type { ExtensionType } from '../config';

function deepMerge(target: any, source: any): any {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          output[key] = source[key];
        } else {
          output[key] = deepMerge(target[key], source[key]);
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

/**
 * Centralized type characteristics for all extension types.
 * Use this map to avoid scattered type checks throughout the codebase.
 */
interface TypeCharacteristics {
  requiresCode: boolean; // Needs Swift files, code signing, build settings
  targetType: 'application' | 'app_extension'; // Xcode target creation type
  embedType: 'foundation-extension' | 'app-clip' | 'none'; // How to embed in parent app
  frameworks: string[]; // Frameworks to link
  productType: string; // Xcode product type
  extensionPointIdentifier: string; // Extension point (empty for standalone)
  defaultUsesAppGroups: boolean; // Should use app groups by default
  requiresEntitlements: boolean; // Needs entitlements file
  basePlist: Record<string, any>; // Base Info.plist structure for this type
  supportsActivationRules: boolean; // Can use activationRules config
  activationRulesLocation: 'direct' | 'attributes' | 'none'; // Where to place NSExtensionActivationRule
}

export const TYPE_CHARACTERISTICS: Record<ExtensionType, TypeCharacteristics> =
  {
    widget: {
      requiresCode: true,
      targetType: 'app_extension',
      embedType: 'foundation-extension',
      frameworks: ['WidgetKit', 'SwiftUI', 'ActivityKit', 'AppIntents'],
      productType: 'com.apple.product-type.app-extension',
      extensionPointIdentifier: 'com.apple.widgetkit-extension',
      defaultUsesAppGroups: true,
      requiresEntitlements: true,
      basePlist: {},
      supportsActivationRules: false,
      activationRulesLocation: 'none',
    },
    clip: {
      requiresCode: true,
      targetType: 'application',
      embedType: 'app-clip',
      frameworks: [], // SwiftUI auto-linked
      productType:
        'com.apple.product-type.application.on-demand-install-capable',
      extensionPointIdentifier: '',
      defaultUsesAppGroups: true,
      requiresEntitlements: true,
      basePlist: {
        CFBundleShortVersionString: '$(MARKETING_VERSION)',
        UIApplicationSupportsIndirectInputEvents: true,
        NSAppClip: {
          NSAppClipRequestEphemeralUserNotification: false,
          NSAppClipRequestLocationConfirmation: false,
        },
        UILaunchStoryboardName: 'SplashScreen',
        UIUserInterfaceStyle: 'Automatic',
      },
      supportsActivationRules: false,
      activationRulesLocation: 'none',
    },
    stickers: {
      requiresCode: false, // Asset-only
      targetType: 'app_extension',
      embedType: 'foundation-extension',
      frameworks: [],
      productType: 'com.apple.product-type.app-extension.messages-sticker-pack',
      extensionPointIdentifier: 'com.apple.message-payload-provider',
      defaultUsesAppGroups: false,
      requiresEntitlements: false,
      basePlist: {
        NSStickerSharingLevel: 'OS',
        NSExtension: {
          NSExtensionPrincipalClass: 'StickerBrowserViewController',
        },
      },
      supportsActivationRules: false,
      activationRulesLocation: 'none',
    },
    messages: {
      requiresCode: true,
      targetType: 'app_extension',
      embedType: 'foundation-extension',
      frameworks: ['Messages'],
      productType: 'com.apple.product-type.app-extension',
      extensionPointIdentifier: 'com.apple.message-payload-provider',
      defaultUsesAppGroups: true,
      requiresEntitlements: true,
      basePlist: {
        NSExtension: {
          NSExtensionPrincipalClass:
            '$(PRODUCT_MODULE_NAME).MessagesViewController',
        },
      },
      supportsActivationRules: false,
      activationRulesLocation: 'none',
    },
    share: {
      requiresCode: true,
      targetType: 'app_extension',
      embedType: 'foundation-extension',
      frameworks: ['Social', 'MobileCoreServices'],
      productType: 'com.apple.product-type.app-extension',
      extensionPointIdentifier: 'com.apple.share-services',
      defaultUsesAppGroups: true,
      requiresEntitlements: true,
      basePlist: {
        NSExtension: {
          NSExtensionPrincipalClass:
            '$(PRODUCT_MODULE_NAME).ShareViewController',
          NSExtensionAttributes: {
            NSExtensionActivationRule: {
              NSExtensionActivationSupportsText: true,
              NSExtensionActivationSupportsWebURLWithMaxCount: 1,
            },
          },
        },
      },
      supportsActivationRules: true,
      activationRulesLocation: 'attributes',
    },
    action: {
      requiresCode: true,
      targetType: 'app_extension',
      embedType: 'foundation-extension',
      frameworks: [],
      productType: 'com.apple.product-type.app-extension',
      extensionPointIdentifier: 'com.apple.ui-services',
      defaultUsesAppGroups: false,
      requiresEntitlements: true,
      basePlist: {
        NSExtension: {
          // NSExtensionMainStoryboard or NSExtensionPrincipalClass set conditionally
          // NSExtensionActivationRule set from activationRules config
        },
      },
      supportsActivationRules: true,
      activationRulesLocation: 'direct',
    },
    safari: {
      requiresCode: true,
      targetType: 'app_extension',
      embedType: 'foundation-extension',
      frameworks: [],
      productType: 'com.apple.product-type.app-extension',
      extensionPointIdentifier: 'com.apple.Safari.web-extension',
      defaultUsesAppGroups: false,
      requiresEntitlements: true,
      basePlist: {},
      supportsActivationRules: false,
      activationRulesLocation: 'none',
    },
    'notification-content': {
      requiresCode: true,
      targetType: 'app_extension',
      embedType: 'foundation-extension',
      frameworks: [],
      productType: 'com.apple.product-type.app-extension',
      extensionPointIdentifier: 'com.apple.usernotifications.content-extension',
      defaultUsesAppGroups: false,
      requiresEntitlements: true,
      basePlist: {},
      supportsActivationRules: false,
      activationRulesLocation: 'none',
    },
    'notification-service': {
      requiresCode: true,
      targetType: 'app_extension',
      embedType: 'foundation-extension',
      frameworks: [],
      productType: 'com.apple.product-type.app-extension',
      extensionPointIdentifier: 'com.apple.usernotifications.service',
      defaultUsesAppGroups: false,
      requiresEntitlements: true,
      basePlist: {},
      supportsActivationRules: false,
      activationRulesLocation: 'none',
    },
    intent: {
      requiresCode: true,
      targetType: 'app_extension',
      embedType: 'foundation-extension',
      frameworks: [],
      productType: 'com.apple.product-type.app-extension',
      extensionPointIdentifier: 'com.apple.intents-service',
      defaultUsesAppGroups: false,
      requiresEntitlements: true,
      basePlist: {},
      supportsActivationRules: false,
      activationRulesLocation: 'none',
    },
    'intent-ui': {
      requiresCode: true,
      targetType: 'app_extension',
      embedType: 'foundation-extension',
      frameworks: [],
      productType: 'com.apple.product-type.app-extension',
      extensionPointIdentifier: 'com.apple.intents-ui-service',
      defaultUsesAppGroups: false,
      requiresEntitlements: true,
      basePlist: {},
      supportsActivationRules: false,
      activationRulesLocation: 'none',
    },
    spotlight: {
      requiresCode: true,
      targetType: 'app_extension',
      embedType: 'foundation-extension',
      frameworks: [],
      productType: 'com.apple.product-type.app-extension',
      extensionPointIdentifier: 'com.apple.spotlight.import',
      defaultUsesAppGroups: false,
      requiresEntitlements: true,
      basePlist: {},
      supportsActivationRules: false,
      activationRulesLocation: 'none',
    },
    'bg-download': {
      requiresCode: true,
      targetType: 'app_extension',
      embedType: 'foundation-extension',
      frameworks: [],
      productType: 'com.apple.product-type.app-extension',
      extensionPointIdentifier:
        'com.apple.background-asset-downloader-extension',
      defaultUsesAppGroups: true,
      requiresEntitlements: true,
      basePlist: {},
      supportsActivationRules: false,
      activationRulesLocation: 'none',
    },
    'quicklook-thumbnail': {
      requiresCode: true,
      targetType: 'app_extension',
      embedType: 'foundation-extension',
      frameworks: [],
      productType: 'com.apple.product-type.app-extension',
      extensionPointIdentifier: 'com.apple.quicklook.thumbnail',
      defaultUsesAppGroups: false,
      requiresEntitlements: true,
      basePlist: {},
      supportsActivationRules: false,
      activationRulesLocation: 'none',
    },
    'location-push': {
      requiresCode: true,
      targetType: 'app_extension',
      embedType: 'foundation-extension',
      frameworks: [],
      productType: 'com.apple.product-type.app-extension',
      extensionPointIdentifier: 'com.apple.location.push.service',
      defaultUsesAppGroups: false,
      requiresEntitlements: true,
      basePlist: {},
      supportsActivationRules: false,
      activationRulesLocation: 'none',
    },
    'credentials-provider': {
      requiresCode: true,
      targetType: 'app_extension',
      embedType: 'foundation-extension',
      frameworks: [],
      productType: 'com.apple.product-type.app-extension',
      extensionPointIdentifier:
        'com.apple.authentication-services-credential-provider-ui',
      defaultUsesAppGroups: false,
      requiresEntitlements: true,
      basePlist: {},
      supportsActivationRules: false,
      activationRulesLocation: 'none',
    },
    'account-auth': {
      requiresCode: true,
      targetType: 'app_extension',
      embedType: 'foundation-extension',
      frameworks: [],
      productType: 'com.apple.product-type.app-extension',
      extensionPointIdentifier:
        'com.apple.authentication-services-account-authentication-modification-ui',
      defaultUsesAppGroups: false,
      requiresEntitlements: true,
      basePlist: {},
      supportsActivationRules: false,
      activationRulesLocation: 'none',
    },
    'app-intent': {
      requiresCode: true,
      targetType: 'app_extension',
      embedType: 'foundation-extension',
      frameworks: [],
      productType: 'com.apple.product-type.extensionkit-extension',
      extensionPointIdentifier: 'com.apple.appintents-extension',
      defaultUsesAppGroups: false,
      requiresEntitlements: true,
      basePlist: {},
      supportsActivationRules: false,
      activationRulesLocation: 'none',
    },
    'device-activity-monitor': {
      requiresCode: true,
      targetType: 'app_extension',
      embedType: 'foundation-extension',
      frameworks: [],
      productType: 'com.apple.product-type.app-extension',
      extensionPointIdentifier: 'com.apple.deviceactivity.monitor-extension',
      defaultUsesAppGroups: false,
      requiresEntitlements: true,
      basePlist: {},
      supportsActivationRules: false,
      activationRulesLocation: 'none',
    },
    matter: {
      requiresCode: true,
      targetType: 'app_extension',
      embedType: 'foundation-extension',
      frameworks: [],
      productType: 'com.apple.product-type.app-extension',
      extensionPointIdentifier:
        'com.apple.matter.support.extension.device-setup',
      defaultUsesAppGroups: false,
      requiresEntitlements: true,
      basePlist: {},
      supportsActivationRules: false,
      activationRulesLocation: 'none',
    },
    watch: {
      requiresCode: true,
      targetType: 'application',
      embedType: 'none',
      frameworks: [],
      productType: 'com.apple.product-type.application',
      extensionPointIdentifier: '',
      defaultUsesAppGroups: false,
      requiresEntitlements: true,
      basePlist: {},
      supportsActivationRules: false,
      activationRulesLocation: 'none',
    },
  };

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
  targetIcon?: string
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
    CFBundleShortVersionString: '1.0',
    CFBundleInfoDictionaryVersion: '6.0',
    CFBundleVersion: '1',
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

  // Override NSExtensionPrincipalClass for React Native extensions
  if (
    entry &&
    (type === 'share' ||
      type === 'action' ||
      type === 'clip' ||
      type === 'messages')
  ) {
    const nsExtension = { ...basePlist.NSExtension };

    // Remove NSExtensionMainStoryboard for action extensions using React Native
    if (
      typeCharacteristics.activationRulesLocation === 'direct' &&
      nsExtension.NSExtensionMainStoryboard
    ) {
      delete nsExtension.NSExtensionMainStoryboard;
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
        delete finalAttributes.NSExtensionActivationRule;
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
      delete basePlist.NSExtension.NSExtensionAttributes
        .NSExtensionActivationRule;

      // Only remove NSExtensionAttributes if it's now empty (preserve other attributes like NSExtensionIcon)
      if (
        Object.keys(basePlist.NSExtension.NSExtensionAttributes).length === 0
      ) {
        delete basePlist.NSExtension.NSExtensionAttributes;
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

export function getFrameworksForType(type: ExtensionType): string[] {
  return TYPE_CHARACTERISTICS[type].frameworks;
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
          console.warn(
            `[expo-targets] Unknown share/action extension content type: ${rule.type}`
          );
          return acc;
      }
    },
    {} as Record<string, any>
  );
}

export function productTypeForType(type: ExtensionType): string {
  return TYPE_CHARACTERISTICS[type].productType;
}

export const EXTENSION_POINT_IDENTIFIERS: Record<ExtensionType, string> =
  Object.fromEntries(
    Object.entries(TYPE_CHARACTERISTICS).map(([type, config]) => [
      type,
      config.extensionPointIdentifier,
    ])
  ) as Record<ExtensionType, string>;

export const SHOULD_USE_APP_GROUPS_BY_DEFAULT: Record<ExtensionType, boolean> =
  Object.fromEntries(
    Object.entries(TYPE_CHARACTERISTICS).map(([type, config]) => [
      type,
      config.defaultUsesAppGroups,
    ])
  ) as Record<ExtensionType, boolean>;
