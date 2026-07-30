import type { ExtensionType } from './types';

/**
 * Static, per-type facts declared for every extension type.
 * These describe what a type *is*, never what a specific target instance wants.
 */
export interface BaseTypeCharacteristics {
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

/**
 * Behavioural flags derived from the sets below. Flags only — never value blobs,
 * so consumers branch on capabilities instead of hard-coded type checks.
 */
export interface TypeCharacteristicFlags {
  isReactNativeNative: boolean; // Runs React Native with native modules
  isReactNativeWeb: boolean; // Runs React Native Web inside a web view
  needsIsolatedSearchPaths: boolean; // Standalone product; must not inherit Pods search paths
}

export type TypeCharacteristics = BaseTypeCharacteristics &
  TypeCharacteristicFlags;

const REACT_NATIVE_NATIVE = new Set<ExtensionType>([
  'share',
  'action',
  'clip',
  'messages',
]);

const REACT_NATIVE_WEB = new Set<ExtensionType>(['safari']);

const ISOLATED_SEARCH_PATHS = new Set<ExtensionType>(['clip']);

const BASE_TYPE_CHARACTERISTICS: Record<
  ExtensionType,
  BaseTypeCharacteristics
> = {
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
    productType: 'com.apple.product-type.application.on-demand-install-capable',
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
    productType: 'com.apple.product-type.app-extension.messages',
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
        NSExtensionPrincipalClass: '$(PRODUCT_MODULE_NAME).ShareViewController',
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
    activationRulesLocation: 'attributes',
  },
  wallet: {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['PassKit'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.PassKit.issuer-provisioning',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {
      NSExtension: {
        NSExtensionPrincipalClass: '$(PRODUCT_MODULE_NAME).PassProvider',
      },
    },
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'wallet-ui': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['PassKit'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier:
      'com.apple.PassKit.issuer-provisioning.authorization',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {
      NSExtension: {
        NSExtensionPrincipalClass:
          '$(PRODUCT_MODULE_NAME).AuthorizationViewController',
      },
    },
    supportsActivationRules: false,
    activationRulesLocation: 'none',
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
    basePlist: {
      NSExtension: {
        NSExtensionPrincipalClass:
          '$(PRODUCT_MODULE_NAME).SafariWebExtensionHandler',
      },
    },
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'notification-content': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['UserNotifications', 'UserNotificationsUI'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.usernotifications.content-extension',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {
      NSExtension: {
        NSExtensionPrincipalClass:
          '$(PRODUCT_MODULE_NAME).NotificationViewController',
        NSExtensionAttributes: {
          // UNNotificationExtensionCategory is required - user should override
          UNNotificationExtensionCategory: 'myNotificationCategory',
          UNNotificationExtensionInitialContentSizeRatio: 1,
        },
      },
    },
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'notification-service': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['UserNotifications'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.usernotifications.service',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {
      NSExtension: {
        NSExtensionPrincipalClass: '$(PRODUCT_MODULE_NAME).NotificationService',
      },
    },
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  intent: {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['Intents'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.intents-service',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {
      NSExtension: {
        NSExtensionPrincipalClass: '$(PRODUCT_MODULE_NAME).IntentHandler',
        NSExtensionAttributes: {
          IntentsRestrictedWhileLocked: [],
          IntentsSupported: [],
        },
      },
    },
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'intent-ui': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['IntentsUI'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.intents-ui-service',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {
      NSExtension: {
        NSExtensionPrincipalClass:
          '$(PRODUCT_MODULE_NAME).IntentViewController',
        NSExtensionAttributes: {
          IntentsSupported: [],
        },
      },
    },
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
    extensionPointIdentifier: 'com.apple.background-asset-downloader-extension',
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
    extensionPointIdentifier: 'com.apple.matter.support.extension.device-setup',
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

/**
 * Every extension type, in declaration order.
 */
export const EXTENSION_TYPES = Object.keys(
  BASE_TYPE_CHARACTERISTICS
) as ExtensionType[];

/**
 * Centralized type characteristics for all extension types.
 * Use this map to avoid scattered type checks throughout the codebase.
 */
export const TYPE_CHARACTERISTICS: Record<ExtensionType, TypeCharacteristics> =
  Object.fromEntries(
    EXTENSION_TYPES.map((type) => [
      type,
      {
        ...BASE_TYPE_CHARACTERISTICS[type],
        isReactNativeNative: REACT_NATIVE_NATIVE.has(type),
        isReactNativeWeb: REACT_NATIVE_WEB.has(type),
        needsIsolatedSearchPaths: ISOLATED_SEARCH_PATHS.has(type),
      },
    ])
  ) as Record<ExtensionType, TypeCharacteristics>;

export function getFrameworksForType(type: ExtensionType): string[] {
  return TYPE_CHARACTERISTICS[type].frameworks;
}

export function productTypeForType(type: ExtensionType): string {
  return TYPE_CHARACTERISTICS[type].productType;
}

export const EXTENSION_POINT_IDENTIFIERS: Record<ExtensionType, string> =
  Object.fromEntries(
    EXTENSION_TYPES.map((type) => [
      type,
      TYPE_CHARACTERISTICS[type].extensionPointIdentifier,
    ])
  ) as Record<ExtensionType, string>;

export const SHOULD_USE_APP_GROUPS_BY_DEFAULT: Record<ExtensionType, boolean> =
  Object.fromEntries(
    EXTENSION_TYPES.map((type) => [
      type,
      TYPE_CHARACTERISTICS[type].defaultUsesAppGroups,
    ])
  ) as Record<ExtensionType, boolean>;
