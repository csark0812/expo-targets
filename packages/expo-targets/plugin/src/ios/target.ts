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

export function getTargetInfoPlistForType(
  type: ExtensionType,
  customProperties?: Record<string, any>
): string {
  let basePlist: Record<string, any>;

  if (type === 'widget') {
    basePlist = {
      CFBundleName: '$(PRODUCT_NAME)',
      CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
      CFBundleExecutable: '$(EXECUTABLE_NAME)',
      CFBundlePackageType: '$(PRODUCT_BUNDLE_PACKAGE_TYPE)',
      CFBundleShortVersionString: '1.0',
      CFBundleVersion: '1',
      NSExtension: {
        NSExtensionPointIdentifier: 'com.apple.widgetkit-extension',
      },
    };
  } else if (type === 'clip') {
    basePlist = {
      CFBundleName: '$(PRODUCT_NAME)',
      CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
      CFBundleExecutable: '$(EXECUTABLE_NAME)',
      CFBundlePackageType: '$(PRODUCT_BUNDLE_PACKAGE_TYPE)',
      CFBundleShortVersionString: '$(MARKETING_VERSION)',
      UIApplicationSupportsIndirectInputEvents: true,
      NSAppClip: {
        NSAppClipRequestEphemeralUserNotification: false,
        NSAppClipRequestLocationConfirmation: false,
      },
      UILaunchStoryboardName: 'SplashScreen',
      UIUserInterfaceStyle: 'Automatic',
    };
  } else if (type === 'stickers') {
    // iMessage Sticker Pack - minimal Info.plist
    // No executable - sticker packs are asset-only
    // Assets and sticker metadata are in Assets.xcassets
    basePlist = {
      CFBundleName: '$(PRODUCT_NAME)',
      CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
      CFBundlePackageType: '$(PRODUCT_BUNDLE_PACKAGE_TYPE)',
      CFBundleShortVersionString: '1.0',
      CFBundleVersion: '1',
    };
  } else if (type === 'share') {
    basePlist = {
      NSExtension: {
        NSExtensionPointIdentifier: 'com.apple.share-services',
        NSExtensionMainStoryboard: 'MainInterface',
        NSExtensionActivationRule: 'TRUEPREDICATE',
      },
    };
  } else if (type === 'action') {
    basePlist = {
      NSExtension: {
        NSExtensionPointIdentifier: 'com.apple.services',
        NSExtensionMainStoryboard: 'MainInterface',
        NSExtensionActivationRule: 'TRUEPREDICATE',
      },
    };
  } else {
    throw new Error(`Info.plist not implemented for type: ${type}`);
  }

  if (customProperties) {
    basePlist = deepMerge(basePlist, customProperties);
  }

  return plist.build(basePlist);
}

export function getFrameworksForType(type: ExtensionType): string[] {
  if (type === 'widget') {
    return ['WidgetKit', 'SwiftUI', 'ActivityKit', 'AppIntents'];
  }

  if (type === 'stickers') {
    return ['Messages'];
  }

  if (type === 'share') {
    return ['Social', 'MobileCoreServices'];
  }

  if (type === 'action') {
    return [];
  }

  if (type === 'clip') {
    // Don't explicitly link SwiftUI for App Clips - let Swift auto-link it
    // Explicit linking causes UIUtilities and SwiftUICore auto-link errors
    return [];
  }

  return [];
}

export function productTypeForType(type: ExtensionType): string {
  if (type === 'clip') {
    return 'com.apple.product-type.application.on-demand-install-capable';
  }
  if (type === 'watch') {
    return 'com.apple.product-type.application';
  }
  if (type === 'app-intent') {
    return 'com.apple.product-type.extensionkit-extension';
  }
  if (type === 'stickers') {
    return 'com.apple.product-type.app-extension.messages-sticker-pack';
  }
  return 'com.apple.product-type.app-extension';
}

export const EXTENSION_POINT_IDENTIFIERS: Record<ExtensionType, string> = {
  widget: 'com.apple.widgetkit-extension',
  clip: '', // App Clips are standalone apps, not extensions
  stickers: '', // Sticker packs are asset-only, no extension point
  share: 'com.apple.share-services',
  action: 'com.apple.services',
  safari: 'com.apple.Safari.web-extension',
  'notification-content': 'com.apple.usernotifications.content-extension',
  'notification-service': 'com.apple.usernotifications.service',
  intent: 'com.apple.intents-service',
  'intent-ui': 'com.apple.intents-ui-service',
  spotlight: 'com.apple.spotlight.import',
  'bg-download': 'com.apple.background-asset-downloader-extension',
  'quicklook-thumbnail': 'com.apple.quicklook.thumbnail',
  'location-push': 'com.apple.location.push.service',
  'credentials-provider':
    'com.apple.authentication-services-credential-provider-ui',
  'account-auth':
    'com.apple.authentication-services-account-authentication-modification-ui',
  'app-intent': 'com.apple.appintents-extension',
  'device-activity-monitor': 'com.apple.deviceactivity.monitor-extension',
  matter: 'com.apple.matter.support.extension.device-setup',
  watch: '', // Watch apps are standalone apps, not extensions
};

export const SHOULD_USE_APP_GROUPS_BY_DEFAULT: Record<ExtensionType, boolean> =
  {
    widget: true,
    clip: true,
    share: true,
    stickers: false,
    action: false,
    safari: false,
    'notification-content': false,
    'notification-service': false,
    intent: false,
    'intent-ui': false,
    spotlight: false,
    'bg-download': true,
    'quicklook-thumbnail': false,
    'location-push': false,
    'credentials-provider': false,
    'account-auth': false,
    'app-intent': false,
    'device-activity-monitor': false,
    matter: false,
    watch: false,
  };
