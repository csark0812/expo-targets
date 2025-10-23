import plist from '@expo/plist';

import type { ExtensionType } from '../config';

export function getTargetInfoPlistForType(type: ExtensionType): string {
  if (type === 'widget') {
    return plist.build({
      CFBundleName: '$(PRODUCT_NAME)',
      CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
      CFBundleExecutable: '$(EXECUTABLE_NAME)',
      CFBundlePackageType: '$(PRODUCT_BUNDLE_PACKAGE_TYPE)',
      CFBundleShortVersionString: '1.0',
      CFBundleVersion: '1',
      NSExtension: {
        NSExtensionPointIdentifier: 'com.apple.widgetkit-extension',
      },
    });
  }

  if (type === 'clip') {
    return plist.build({
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
    });
  }

  if (type === 'imessage') {
    return plist.build({
      NSExtension: {
        NSExtensionPointIdentifier: 'com.apple.message-payload-provider',
        NSExtensionPrincipalClass: 'StickerBrowserViewController',
      },
    });
  }

  if (type === 'share') {
    return plist.build({
      NSExtension: {
        NSExtensionPointIdentifier: 'com.apple.share-services',
        NSExtensionMainStoryboard: 'MainInterface',
        NSExtensionActivationRule: 'TRUEPREDICATE',
      },
    });
  }

  if (type === 'action') {
    return plist.build({
      NSExtension: {
        NSExtensionPointIdentifier: 'com.apple.services',
        NSExtensionMainStoryboard: 'MainInterface',
        NSExtensionActivationRule: 'TRUEPREDICATE',
      },
    });
  }

  throw new Error(`Info.plist not implemented for type: ${type}`);
}

export function getFrameworksForType(type: ExtensionType): string[] {
  if (type === 'widget') {
    return ['WidgetKit', 'SwiftUI', 'ActivityKit', 'AppIntents'];
  }

  if (type === 'imessage') {
    return ['Messages'];
  }

  if (type === 'share') {
    return ['Social', 'MobileCoreServices'];
  }

  if (type === 'action') {
    return [];
  }

  if (type === 'clip') {
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
  return 'com.apple.product-type.app-extension';
}

export const EXTENSION_POINT_IDENTIFIERS: Record<ExtensionType, string> = {
  widget: 'com.apple.widgetkit-extension',
  clip: '',
  imessage: 'com.apple.message-payload-provider',
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
  watch: '',
};

export const SHOULD_USE_APP_GROUPS_BY_DEFAULT: Record<ExtensionType, boolean> =
  {
    widget: true,
    clip: true,
    share: true,
    imessage: false,
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
