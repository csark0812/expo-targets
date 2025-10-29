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
          NSExtensionMainStoryboard: 'MainInterface',
          NSExtensionActivationRule: 'TRUEPREDICATE',
        },
      },
    },
    action: {
      requiresCode: true,
      targetType: 'app_extension',
      embedType: 'foundation-extension',
      frameworks: [],
      productType: 'com.apple.product-type.app-extension',
      extensionPointIdentifier: 'com.apple.services',
      defaultUsesAppGroups: false,
      requiresEntitlements: true,
      basePlist: {
        NSExtension: {
          NSExtensionMainStoryboard: 'MainInterface',
          NSExtensionActivationRule: 'TRUEPREDICATE',
        },
      },
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
    },
  };

export function getTargetInfoPlistForType(
  type: ExtensionType,
  customProperties?: Record<string, any>
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

  if (customProperties) {
    basePlist = deepMerge(basePlist, customProperties);
  }

  return plist.build(basePlist);
}

export function getFrameworksForType(type: ExtensionType): string[] {
  return TYPE_CHARACTERISTICS[type].frameworks;
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
