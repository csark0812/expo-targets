import type { ExtensionType } from './types';

/**
 * Static, per-type facts declared for every extension type.
 * These describe what a type *is*, never what a specific target instance wants.
 */
export interface BaseTypeCharacteristics {
  requiresCode: boolean; // Needs Swift files, code signing, build settings
  targetType: 'application' | 'app_extension'; // Xcode target creation type
  embedType:
    | 'foundation-extension'
    | 'extensionkit-extension'
    | 'app-clip'
    | 'watch-content'
    | 'watch-extension'
    | 'none'; // How to embed in parent app
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
  /** Example host track for Devicewright / examples/. */
  rnExample: 'dual' | 'native-only' | 'rn-only';
}

export type TypeCharacteristics = BaseTypeCharacteristics &
  TypeCharacteristicFlags;

const REACT_NATIVE_NATIVE = new Set<ExtensionType>([
  'share',
  'action',
  'clip',
  'messages',
  'notification-content',
]);

const REACT_NATIVE_WEB = new Set<ExtensionType>(['safari']);

const ISOLATED_SEARCH_PATHS = new Set<ExtensionType>([
  'clip',
  'watch',
  'watch-widget',
]);

/** Initial dual set = UI extension points; headless → native-only; asset/spine → rn-only. */
const RN_EXAMPLE_DUAL = new Set<ExtensionType>([
  'share',
  'action',
  'clip',
  'messages',
  'safari',
  'notification-content',
]);

const RN_EXAMPLE_RN_ONLY = new Set<ExtensionType>(['stickers', 'widget']);

function rnExampleFor(type: ExtensionType): 'dual' | 'native-only' | 'rn-only' {
  if (RN_EXAMPLE_DUAL.has(type)) return 'dual';
  if (RN_EXAMPLE_RN_ONLY.has(type)) return 'rn-only';
  return 'native-only';
}

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
    // Host ↔ appex payload (setData/getData) is App Group backed.
    defaultUsesAppGroups: true,
    requiresEntitlements: true,
    basePlist: {
      NSExtension: {
        // Native Swift path (no `entry`). When `entry` is set, applyPrincipalClass
        // replaces this with ReactNativeViewController.
        NSExtensionPrincipalClass:
          '$(PRODUCT_MODULE_NAME).ActionViewController',
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
          UNNotificationExtensionInitialContentSizeRatio: 0.5,
          UNNotificationExtensionDefaultContentHidden: true,
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
    // Journey proof uses App Group importer markers; sync groups by default.
    defaultUsesAppGroups: true,
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
    frameworks: ['QuickLookThumbnailing'],
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
    frameworks: ['AuthenticationServices'],
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
    frameworks: ['AuthenticationServices'],
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
    // ExtensionKit must land in Extensions/, not PlugIns/ (simctl rejects PlugIns).
    embedType: 'extensionkit-extension',
    frameworks: ['AppIntents'],
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
    frameworks: ['DeviceActivity'],
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
    embedType: 'watch-content',
    frameworks: ['SwiftUI', 'WatchKit'],
    productType: 'com.apple.product-type.application',
    extensionPointIdentifier: '',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    // WKCompanionAppBundleIdentifier is filled at plan time from the host id.
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },

  'content-blocker': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: [],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.Safari.content-blocker',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  keyboard: {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: [],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.keyboard-service',
    defaultUsesAppGroups: true,
    requiresEntitlements: true,
    basePlist: {
      NSExtension: {
        NSExtensionAttributes: {
          IsASCIICapable: false,
          PrefersRightToLeft: false,
          PrimaryLanguage: 'en-US',
          RequestsOpenAccess: false,
        },
      },
    },
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'photo-editing': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['Photos', 'PhotosUI'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.photo-editing',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {
      NSExtension: {
        NSExtensionPrincipalClass:
          '$(PRODUCT_MODULE_NAME).PhotoEditingViewController',
        NSExtensionAttributes: {
          PHSupportedMediaTypes: ['Image'],
        },
      },
    },
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'file-provider': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['FileProvider', 'UniformTypeIdentifiers'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.fileprovider-nonui',
    defaultUsesAppGroups: true,
    requiresEntitlements: true,
    basePlist: {
      NSExtension: {
        NSExtensionPrincipalClass:
          '$(PRODUCT_MODULE_NAME).FileProviderExtension',
        NSExtensionFileProviderSupportsEnumeration: true,
      },
    },
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'file-provider-ui': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['FileProviderUI'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.fileprovider-actionsui',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'broadcast-upload': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['ReplayKit'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.broadcast-services-upload',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'broadcast-setup-ui': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['ReplayKit'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.broadcast-services-setupui',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'call-directory': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['CallKit'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.callkit.call-directory',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'message-filter': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['IdentityLookup'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.identitylookup.message-filter',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'unwanted-communication': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['IdentityLookup', 'IdentityLookupUI'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.identitylookup.classification-ui',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'network-packet-tunnel': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['NetworkExtension'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.networkextension.packet-tunnel',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'network-app-proxy': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['NetworkExtension'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.networkextension.app-proxy',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'network-dns-proxy': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['NetworkExtension'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.networkextension.dns-proxy',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'network-filter-data': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['NetworkExtension'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.networkextension.filter-data',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'shield-action': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['ManagedSettings', 'ManagedSettingsUI'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.ManagedSettings.shield-action-service',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'shield-config': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['ManagedSettings', 'ManagedSettingsUI'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier:
      'com.apple.ManagedSettingsUI.shield-configuration-service',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'classkit-context': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['ClassKit'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.classkit.context-provider',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'authentication-services': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['AuthenticationServices'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.AppSSO.idp-extension',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'spotlight-delegate': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['CoreSpotlight'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.spotlight.index',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'quicklook-preview': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['QuickLook'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.quicklook.preview',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'print-service': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: [],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.printing.discovery',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'smart-card': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: ['CryptoTokenKit'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.ctk-tokens',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'virtual-conference': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'foundation-extension',
    frameworks: [],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.calendar.virtualconference',
    defaultUsesAppGroups: false,
    requiresEntitlements: true,
    basePlist: {},
    supportsActivationRules: false,
    activationRulesLocation: 'none',
  },
  'watch-widget': {
    requiresCode: true,
    targetType: 'app_extension',
    embedType: 'watch-extension',
    frameworks: ['WidgetKit', 'SwiftUI'],
    productType: 'com.apple.product-type.app-extension',
    extensionPointIdentifier: 'com.apple.widgetkit-extension',
    defaultUsesAppGroups: true,
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
        rnExample: rnExampleFor(type),
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
