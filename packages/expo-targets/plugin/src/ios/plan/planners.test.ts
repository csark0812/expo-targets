import { describe, expect, test } from 'bun:test';
import * as path from 'node:path';
import type { ExpoConfig } from '@expo/config-types';
import type { ExtensionType } from '../../domain';
import { Logger } from '../../logger';
import type { TargetWorkspace } from '../observe/workspace';
import { planAssets } from './assets';
import { planBuildSettings } from './buildSettings';
import { composeXcodeTargetPlan } from './compose';
import { planEmbed } from './embed';
import { planEntitlements } from './entitlements';
import { resolveIdentity } from './identity';
import { planInfoPlist } from './infoPlist';
import { planSwiftSources } from './swiftSources';
import type {
  AssetPlan,
  IOSTargetProps,
  ProjectPaths,
  SwiftFilePlan,
  TargetIdentity,
} from './types';

const PROJECT_ROOT = '/tmp/project';
const PROJECT_NAME = 'App';
const MAIN_BUNDLE_ID = 'com.example.app';
const PRODUCT_NAME = 'MyShareTarget';
const SEALED_BUILD = path.join(
  PROJECT_NAME,
  'ExpoTargetsGenerated',
  PRODUCT_NAME
);
const INFO_PLIST_REFERENCE = `${SEALED_BUILD}/Info.plist`;
const ENTITLEMENTS_REFERENCE = `${SEALED_BUILD}/generated.entitlements`;

const paths: ProjectPaths = {
  projectRoot: PROJECT_ROOT,
  platformProjectRoot: path.join(PROJECT_ROOT, 'ios'),
  projectName: PROJECT_NAME,
};

function makeProps(overrides: Partial<IOSTargetProps> = {}): IOSTargetProps {
  return {
    type: 'share',
    name: 'MyShare',
    directory: 'targets/my-share',
    configPath: path.join(
      PROJECT_ROOT,
      'targets/my-share/expo-target.config.js'
    ),
    logger: new Logger(false),
    deploymentTarget: '15.1',
    ...overrides,
  } as IOSTargetProps;
}

/** A workspace with nothing on disk. Planners must never hit the file system. */
function makeWorkspace(
  overrides: Partial<TargetWorkspace> = {}
): TargetWorkspace {
  const type = (overrides.type || 'share') as ExtensionType;
  const directory = overrides.directory || 'targets/my-share';
  const targetDirectory = path.join(PROJECT_ROOT, directory, 'ios');

  return {
    projectRoot: PROJECT_ROOT,
    directory,
    type,
    targetDirectory,
    targetBuildPath: path.join(
      PROJECT_ROOT,
      'ios',
      PROJECT_NAME,
      'ExpoTargetsGenerated',
      PRODUCT_NAME
    ),
    swiftFiles: [],
    bundleResourceFiles: [],
    userAssetsPath: path.join(targetDirectory, 'Assets.xcassets'),
    hasUserAssets: false,
    userSafariResourcesPath: path.join(targetDirectory, 'Resources'),
    hasCustomSafariResources: false,
    hasUserSafariSwiftHandler: false,
    hasUserReactNativeViewController: false,
    hasUserMessagesViewController: false,
    ...overrides,
  };
}

function identityFor(props: IOSTargetProps): TargetIdentity {
  return resolveIdentity({ props, mainBundleIdentifier: MAIN_BUNDLE_ID });
}

function buildSettingsFor({
  props: overrides = {},
  mainBuildSettings = {},
  expoConfig = {},
}: {
  props?: Partial<IOSTargetProps>;
  mainBuildSettings?: Record<string, any>;
  expoConfig?: Partial<ExpoConfig>;
} = {}): Record<string, string | string[]> {
  const props = makeProps(overrides);
  return planBuildSettings({
    props,
    identity: identityFor(props),
    expoConfig,
    mainBuildSettings,
    paths,
    infoPlistReferencePath: INFO_PLIST_REFERENCE,
  });
}

function swiftSourcesFor(
  overrides: Partial<IOSTargetProps> = {},
  workspaceOverrides: Partial<TargetWorkspace> = {}
): SwiftFilePlan[] {
  const props = makeProps(overrides);
  return planSwiftSources({
    workspace: makeWorkspace({ type: props.type, ...workspaceOverrides }),
    props,
    identity: identityFor(props),
    platformProjectRoot: paths.platformProjectRoot,
  });
}

function assetsFor(
  overrides: Partial<IOSTargetProps> = {},
  workspaceOverrides: Partial<TargetWorkspace> = {}
): AssetPlan {
  const props = makeProps(overrides);
  return planAssets({
    workspace: makeWorkspace({ type: props.type, ...workspaceOverrides }),
    props,
    identity: identityFor(props),
    paths,
  });
}

describe('resolveIdentity', () => {
  test('product and pbx name follow config name; displayName is not the product', () => {
    const identity = identityFor(
      makeProps({ name: 'Messages', displayName: 'Popl' })
    );
    expect(identity.targetName).toBe('Messages');
    expect(identity.targetProductName).toBe('MessagesTarget');
    expect(identity.displayName).toBe('Popl');
  });

  test('derives product name, bundle id and frameworks from the type', () => {
    const identity = identityFor(makeProps({ displayName: 'My Share' }));

    expect(identity.targetName).toBe('MyShare');
    expect(identity.targetProductName).toBe('MyShareTarget');
    expect(identity.displayName).toBe('My Share');
    expect(identity.bundleIdentifier).toBe('com.example.app.share');
    expect(identity.productType).toBe('com.apple.product-type.app-extension');
    expect(identity.targetType).toBe('app_extension');
    expect(identity.frameworks).toEqual(['Social', 'MobileCoreServices']);
  });

  test('honours an explicit bundle identifier and extra frameworks', () => {
    const identity = identityFor(
      makeProps({
        bundleIdentifier: 'com.example.custom',
        frameworks: ['Contacts'],
      })
    );

    expect(identity.bundleIdentifier).toBe('com.example.custom');
    expect(identity.frameworks).toEqual([
      'Social',
      'MobileCoreServices',
      'Contacts',
    ]);
  });

  test('throws when the app has no iOS bundle identifier', () => {
    expect(() =>
      resolveIdentity({ props: makeProps(), mainBundleIdentifier: undefined })
    ).toThrow('iOS bundle identifier not found');
  });
});

describe('planBuildSettings', () => {
  test('inherits Swift version and versions from the main app', () => {
    const settings = buildSettingsFor({
      expoConfig: { version: '2.1.0' },
      mainBuildSettings: {
        SWIFT_VERSION: '5.9',
        CURRENT_PROJECT_VERSION: '"42"',
        CLANG_ENABLE_MODULES: 'YES',
      },
    });

    expect(settings.SWIFT_VERSION).toBe('5.9');
    expect(settings.CURRENT_PROJECT_VERSION).toBe('42');
    expect(settings.MARKETING_VERSION).toBe('2.1.0');
    expect(settings.CLANG_ENABLE_MODULES).toBe('YES');
    expect(settings.PRODUCT_NAME).toBe('"MyShareTarget"');
    expect(settings.IPHONEOS_DEPLOYMENT_TARGET).toBe('15.1');
    expect(settings.INFOPLIST_FILE).toBe(`"${INFO_PLIST_REFERENCE}"`);
    expect(settings.CODE_SIGN_ENTITLEMENTS).toBe(`"${ENTITLEMENTS_REFERENCE}"`);
  });

  test('falls back to Swift 5.0 and version 1.0.0 (1)', () => {
    const settings = buildSettingsFor();

    expect(settings.SWIFT_VERSION).toBe('5.0');
    expect(settings.MARKETING_VERSION).toBe('1.0.0');
    expect(settings.CURRENT_PROJECT_VERSION).toBe('1');
  });
});

describe('planBuildSettings for App Clips', () => {
  test('isolates search paths for App Clips only', () => {
    const settings = buildSettingsFor({
      props: { type: 'clip', name: 'MyClip' },
    });

    expect(settings.LIBRARY_SEARCH_PATHS).toEqual([
      '"$(SDKROOT)/usr/lib/swift"',
      '"$(TOOLCHAIN_DIR)/usr/lib/swift/$(PLATFORM_NAME)"',
    ]);
    expect(settings.ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES).toBe('YES');
    expect(settings.ENABLE_PREVIEWS).toBe('YES');
  });

  test('leaves search paths inherited for other types', () => {
    const settings = buildSettingsFor();

    expect(settings.LIBRARY_SEARCH_PATHS).toBeUndefined();
    expect(settings.ENABLE_PREVIEWS).toBeUndefined();
  });
});

describe('planBuildSettings for stickers', () => {
  test('asset-only sticker targets get the iMessage app icon setting', () => {
    const settings = buildSettingsFor({
      props: { type: 'stickers', name: 'MyStickers' },
      mainBuildSettings: { TARGETED_DEVICE_FAMILY: '"1,2"' },
    });

    expect(settings.ASSETCATALOG_COMPILER_APPICON_NAME).toBe(
      '"iMessage App Icon"'
    );
    expect(settings.CODE_SIGN_ENTITLEMENTS).toBeUndefined();
  });
});

describe('planBuildSettings for messages', () => {
  test('sets the iMessage app icon name when targetIcon is a file path', () => {
    const settings = buildSettingsFor({
      props: {
        type: 'messages',
        name: 'MyMessages',
        targetIcon: './assets/icon.png',
      },
    });

    expect(settings.ASSETCATALOG_COMPILER_APPICON_NAME).toBe(
      '"iMessage App Icon"'
    );
  });

  test('does not set the iMessage app icon name without targetIcon', () => {
    const settings = buildSettingsFor({
      props: { type: 'messages', name: 'MyMessages' },
    });

    expect(settings.ASSETCATALOG_COMPILER_APPICON_NAME).toBeUndefined();
  });
});

describe('planBuildSettings for watch targets', () => {
  test('watch targets use watchOS SDK and device family 4', () => {
    const settings = buildSettingsFor({
      props: {
        type: 'watch',
        name: 'Watch',
        deploymentTarget: '10.0',
        displayName: 'ET Watch Target',
      },
      mainBuildSettings: { TARGETED_DEVICE_FAMILY: '"1,2"' },
    });

    expect(settings.SDKROOT).toBe('watchos');
    expect(settings.SUPPORTED_PLATFORMS).toBe('"watchos watchsimulator"');
    expect(settings.TARGETED_DEVICE_FAMILY).toBe('"4"');
    expect(settings.WATCHOS_DEPLOYMENT_TARGET).toBe('10.0');
    expect(settings.IPHONEOS_DEPLOYMENT_TARGET).toBeUndefined();
  });

  test('watch-widget targets use watchOS SDK and device family 4', () => {
    const settings = buildSettingsFor({
      props: {
        type: 'watch-widget',
        name: 'WatchWidget',
        deploymentTarget: '10.0',
        displayName: 'ET Watch Widget',
      },
      mainBuildSettings: { TARGETED_DEVICE_FAMILY: '"1,2"' },
    });

    expect(settings.SDKROOT).toBe('watchos');
    expect(settings.SUPPORTED_PLATFORMS).toBe('"watchos watchsimulator"');
    expect(settings.TARGETED_DEVICE_FAMILY).toBe('"4"');
    expect(settings.WATCHOS_DEPLOYMENT_TARGET).toBe('10.0');
    expect(settings.IPHONEOS_DEPLOYMENT_TARGET).toBeUndefined();
  });
});

describe('planSwiftSources React Native generation', () => {
  test('generates a ReactNativeViewController when the user has no Swift', () => {
    const plans = swiftSourcesFor({ entry: './index.tsx' });

    expect(plans).toHaveLength(1);
    expect(plans[0].file).toBe('ReactNativeViewController.swift');
    expect(plans[0].generate?.template).toBe('reactNativeViewController');
    expect(plans[0].sourcePath).toContain(
      path.join(
        'ios',
        PROJECT_NAME,
        'ExpoTargetsGenerated',
        PRODUCT_NAME,
        'ReactNativeViewController.swift'
      )
    );
    expect(plans[0].referencePath).toBe(
      `${SEALED_BUILD}/ReactNativeViewController.swift`
    );
  });

  test('moduleName follows config name, not displayName product', () => {
    const plans = swiftSourcesFor({
      entry: './index.tsx',
      name: 'Action',
      displayName: 'Example Action',
    });

    expect(plans[0].generate?.options).toMatchObject({
      moduleName: 'Action',
      targetName: 'Action',
    });
    expect(
      identityFor(makeProps({ name: 'Action', displayName: 'Example Action' }))
        .targetProductName
    ).toBe('ActionTarget');
  });
});

describe('planSwiftSources user overrides', () => {
  test('prefers a user-provided ReactNativeViewController', () => {
    const plans = swiftSourcesFor(
      { entry: './index.tsx' },
      {
        swiftFiles: ['ReactNativeViewController.swift'],
        hasUserReactNativeViewController: true,
      }
    );

    expect(plans).toHaveLength(1);
    expect(plans[0].generate).toBeUndefined();
    expect(plans[0].sourcePath).toBe(
      path.join(
        PROJECT_ROOT,
        'targets/my-share/ios/ReactNativeViewController.swift'
      )
    );
  });

  test('references user Swift files in place and skips test files', () => {
    const plans = swiftSourcesFor(
      {},
      { swiftFiles: ['WidgetView.swift', 'MyThingTests.swift'] }
    );

    expect(plans.map((plan) => plan.file)).toEqual(['WidgetView.swift']);
    expect(plans[0].generate).toBeUndefined();
  });
});

describe('planSwiftSources per type', () => {
  test('messages extensions generate both view controllers', () => {
    const plans = swiftSourcesFor({
      type: 'messages',
      name: 'MyMessages',
      entry: './index.tsx',
    });

    expect(plans.map((plan) => plan.file)).toEqual([
      'MessagesViewController.swift',
      'ReactNativeViewController.swift',
    ]);
    expect(plans.map((plan) => plan.generate?.template)).toEqual([
      'messagesViewController',
      'reactNativeViewController',
    ]);
  });

  test('safari targets get a handler and never a view controller', () => {
    const plans = swiftSourcesFor({
      type: 'safari',
      name: 'MySafari',
      entry: './index.tsx',
    });

    expect(plans.map((plan) => plan.file)).toEqual([
      'SafariWebExtensionHandler.swift',
    ]);
    expect(plans[0].generate?.template).toBe('safariWebExtensionHandler');
  });

  test('clip with React Native entry generates @main app plus view controller', () => {
    const plans = swiftSourcesFor({
      type: 'clip',
      name: 'MyClip',
      entry: './index.tsx',
    });

    expect(plans.map((plan) => plan.file)).toEqual([
      'ReactNativeClipApp.swift',
      'ReactNativeViewController.swift',
    ]);
    expect(plans.map((plan) => plan.generate?.template)).toEqual([
      'reactNativeClipApp',
      'reactNativeViewController',
    ]);
  });

  test('asset-only targets plan no Swift files', () => {
    const plans = swiftSourcesFor({ type: 'stickers', name: 'MyStickers' });

    expect(plans).toEqual([]);
  });
});

describe('planSwiftSources native widget bundle emit', () => {
  test('emits a sealed WidgetBundle from ios.kinds when the user has no Bundle.swift', () => {
    const plans = swiftSourcesFor(
      {
        type: 'widget',
        name: 'PoplWidgets',
        kinds: [
          { name: 'HomescreenWidgets' },
          { name: 'LockScreenWidgets' },
          { name: 'LockScreenScanWidget' },
        ],
        liveActivity: {
          attributesName: 'DynamicIslandAttributes',
          static: { id: 'string' },
          contentState: { title: 'string' },
        },
      },
      {
        type: 'widget',
        swiftFiles: ['HomescreenWidgets.swift', 'LiveActivity.swift'],
      }
    );

    expect(plans.map((plan) => plan.file)).toEqual([
      'HomescreenWidgets.swift',
      'LiveActivity.swift',
      'PoplWidgetsBundle.swift',
    ]);
    const bundle = plans[2];
    expect(bundle.generate?.template).toBe('nativeWidgetBundle');
    expect(bundle.generate?.options).toMatchObject({
      name: 'PoplWidgets',
      widgets: [
        { name: 'HomescreenWidgets' },
        { name: 'LockScreenWidgets' },
        { name: 'LockScreenScanWidget' },
      ],
      includeLiveActivity: true,
    });
    expect(bundle.sourcePath).toContain(
      path.join(
        'ios',
        PROJECT_NAME,
        'ExpoTargetsGenerated',
        PRODUCT_NAME,
        'PoplWidgetsBundle.swift'
      )
    );
  });
});

describe('planSwiftSources native widget bundle user files', () => {
  test('keeps a user *Bundle.swift and does not emit a sealed bundle', () => {
    const plans = swiftSourcesFor(
      {
        type: 'widget',
        name: 'HelloWidget',
        kinds: [{ name: 'HelloWidget' }],
      },
      {
        type: 'widget',
        swiftFiles: ['Widget.swift', 'WidgetBundle.swift'],
      }
    );

    expect(plans.map((plan) => plan.file)).toEqual([
      'Widget.swift',
      'WidgetBundle.swift',
    ]);
    expect(plans.every((plan) => plan.generate === undefined)).toBe(true);
  });

  test('keeps a user target-named Bundle.swift and does not emit a sealed bundle', () => {
    const plans = swiftSourcesFor(
      {
        type: 'widget',
        name: 'PoplWidgets',
        kinds: [{ name: 'HomescreenWidgets' }],
      },
      {
        type: 'widget',
        swiftFiles: ['HomescreenWidgets.swift', 'PoplWidgetsBundle.swift'],
      }
    );

    expect(plans.map((plan) => plan.file)).toEqual([
      'HomescreenWidgets.swift',
      'PoplWidgetsBundle.swift',
    ]);
    expect(plans.every((plan) => plan.generate === undefined)).toBe(true);
    expect(plans[1].sourcePath).toBe(
      path.join(PROJECT_ROOT, 'targets/my-share/ios/PoplWidgetsBundle.swift')
    );
  });

  test('does not emit a sealed bundle when ios.kinds is omitted', () => {
    const plans = swiftSourcesFor(
      { type: 'widget', name: 'HelloWidget' },
      { type: 'widget', swiftFiles: ['Widget.swift'] }
    );

    expect(plans.map((plan) => plan.file)).toEqual(['Widget.swift']);
    expect(plans[0].generate).toBeUndefined();
  });
});

describe('planAssets', () => {
  test('plans colorsets and a reference relative to ios/', () => {
    const plan = assetsFor({
      colors: { $accent: '#ff0000', card: { light: '#fff', dark: '#000' } },
    });

    expect(plan.isStickers).toBe(false);
    expect(plan.copyUserAssets).toBe(false);
    expect(plan.referencePath).toBe(`${SEALED_BUILD}/Assets.xcassets`);
    expect(plan.colorsets).toHaveLength(2);
    expect(plan.colorsets[1]).toMatchObject({
      name: 'card',
      color: '#fff',
      darkColor: '#000',
    });
    expect(plan.stickers).toBeUndefined();
  });

  test('plans imagesets from ios.images relative to the target directory', () => {
    const plan = assetsFor({
      images: { Logo: './assets/logo.png' },
    });

    expect(plan.imagesets).toHaveLength(1);
    expect(plan.imagesets[0]).toMatchObject({
      name: 'Logo',
      sourcePath: path.join(PROJECT_ROOT, 'targets/my-share/assets/logo.png'),
    });
    expect(plan.imagesets[0].imagesetPath).toBe(
      path.join(
        PROJECT_ROOT,
        'ios',
        SEALED_BUILD,
        'Assets.xcassets',
        'Logo.imageset'
      )
    );
  });

  test('copies the user catalog when one exists', () => {
    const plan = assetsFor({}, { hasUserAssets: true });

    expect(plan.copyUserAssets).toBe(true);
    expect(plan.userAssetsPath).toContain(
      'targets/my-share/ios/Assets.xcassets'
    );
  });
});

describe('planAssets for sticker targets', () => {
  const plan = assetsFor({
    type: 'stickers',
    name: 'MyStickers',
    targetIcon: './assets/icon.png',
    stickerPacks: [{ name: 'Pack', assets: ['./stickers/hello.png'] }],
  });

  test('uses the Stickers catalog and an iMessage icon set', () => {
    expect(plan.isStickers).toBe(true);
    expect(plan.referencePath).toBe(
      `${PROJECT_NAME}/ExpoTargetsGenerated/MyStickersTarget/Stickers.xcassets`
    );
    expect(plan.stickers?.iconsetPath).toContain(
      'iMessage App Icon.stickersiconset'
    );
    expect(plan.stickers?.sourceIconPath).toBe(
      path.join(PROJECT_ROOT, 'targets/my-share', 'assets/icon.png')
    );
  });

  test('resolves pack assets relative to the target directory', () => {
    expect(plan.stickers?.packs[0].assets[0]).toMatchObject({
      filename: 'hello.png',
      sourcePath: path.join(
        PROJECT_ROOT,
        'targets/my-share/stickers/hello.png'
      ),
    });
  });
});

describe('planAssets for messages targets', () => {
  test('plans an iMessage icon set in Assets.xcassets from targetIcon', () => {
    const plan = assetsFor({
      type: 'messages',
      name: 'MyMessages',
      targetIcon: './assets/icon.png',
    });

    expect(plan.isStickers).toBe(false);
    expect(plan.referencePath).toBe(
      `${PROJECT_NAME}/ExpoTargetsGenerated/MyMessagesTarget/Assets.xcassets`
    );
    expect(plan.stickers?.iconsetPath).toContain(
      'iMessage App Icon.stickersiconset'
    );
    expect(plan.stickers?.iconsetPath).toContain('Assets.xcassets');
    expect(plan.stickers?.sourceIconPath).toBe(
      path.join(PROJECT_ROOT, 'targets/my-share', 'assets/icon.png')
    );
    expect(plan.stickers?.packs).toEqual([]);
  });

  test('does not plan an iMessage icon set without targetIcon', () => {
    const plan = assetsFor({ type: 'messages', name: 'MyMessages' });

    expect(plan.isStickers).toBe(false);
    expect(plan.stickers).toBeUndefined();
  });
});

describe('planInfoPlist', () => {
  test('injects main app URL schemes and the embedded targets config', () => {
    const plan = planInfoPlist({
      props: makeProps(),
      expoConfig: {
        scheme: 'myapp',
        ios: { bundleIdentifier: MAIN_BUNDLE_ID },
        extra: { targets: [{ name: 'MyShare', type: 'share' }] },
      },
      paths,
    });

    expect(plan.mainAppSchemes).toEqual(['myapp', MAIN_BUNDLE_ID]);
    expect(plan.embeddedTargetCount).toBe(1);
    expect(plan.referencePath).toBe(INFO_PLIST_REFERENCE);
    expect(plan.contents).toContain('LSApplicationQueriesSchemes');
    expect(plan.contents).toContain('ExpoTargetsConfig');
  });

  test('uses activation rules when the target declares them', () => {
    const plan = planInfoPlist({
      props: makeProps({ activationRules: [{ type: 'image', maxCount: 4 }] }),
      expoConfig: {},
      paths,
    });

    expect(plan.contents).toContain(
      'NSExtensionActivationSupportsImageWithMaxCount'
    );
    expect(plan.mainAppSchemes).toEqual([]);
  });
});

const entitlementPaths = {
  platformProjectRoot: path.join(PROJECT_ROOT, 'ios'),
  projectName: PROJECT_NAME,
  productName: PRODUCT_NAME,
};

describe('planEntitlements app groups', () => {
  test('syncs App Groups for types that default to them', () => {
    const plan = planEntitlements({
      type: 'share',
      mainAppGroups: ['group.com.example.app'],
      paths: entitlementPaths,
    });

    expect(plan.required).toBe(true);
    expect(plan.syncedAppGroups).toBe(true);
    expect(plan.entitlements['com.apple.security.application-groups']).toEqual([
      'group.com.example.app',
    ]);
    expect(plan.path).toContain(
      path.join(
        PROJECT_NAME,
        'ExpoTargetsGenerated',
        PRODUCT_NAME,
        'generated.entitlements'
      )
    );
  });

  test('syncs App Groups for action (host ↔ appex payload)', () => {
    const plan = planEntitlements({
      type: 'action',
      mainAppGroups: ['group.com.example.app'],
      paths: entitlementPaths,
    });

    expect(plan.entitlements['com.apple.security.application-groups']).toEqual([
      'group.com.example.app',
    ]);
    expect(plan.syncedAppGroups).toBe(true);
  });

  test('does not sync App Groups for types that opt out', () => {
    const plan = planEntitlements({
      type: 'stickers',
      mainAppGroups: ['group.com.example.app'],
      paths: entitlementPaths,
    });

    expect(plan.entitlements).toEqual({});
    expect(plan.syncedAppGroups).toBe(false);
  });
});

describe('planEntitlements per type', () => {
  test('adds App Clip parent identifiers', () => {
    const plan = planEntitlements({
      type: 'clip',
      mainBundleIdentifier: MAIN_BUNDLE_ID,
      mainAppGroups: ['group.com.example.app'],
      paths: entitlementPaths,
    });

    expect(
      plan.entitlements['com.apple.developer.parent-application-identifiers']
    ).toEqual(['$(AppIdentifierPrefix)com.example.app']);
    expect(
      plan.entitlements['com.apple.developer.on-demand-install-capable']
    ).toBe(true);
  });

  test('adds payment pass provisioning for wallet targets', () => {
    const plan = planEntitlements({ type: 'wallet', paths: entitlementPaths });

    expect(
      plan.entitlements['com.apple.developer.payment-pass-provisioning']
    ).toBe(true);
  });

  test('is not required for asset-only targets', () => {
    const plan = planEntitlements({
      type: 'stickers',
      paths: entitlementPaths,
    });

    expect(plan.required).toBe(false);
    expect(plan.entitlements).toEqual({});
  });
});

describe('planEntitlements clip omit', () => {
  test('omits host groups when clip lists none or []', () => {
    const absent = planEntitlements({
      type: 'clip',
      mainBundleIdentifier: MAIN_BUNDLE_ID,
      mainAppGroups: ['group.com.example.app'],
      paths: entitlementPaths,
    });
    const empty = planEntitlements({
      type: 'clip',
      entitlements: { 'com.apple.security.application-groups': [] },
      mainBundleIdentifier: MAIN_BUNDLE_ID,
      mainAppGroups: ['group.com.example.app'],
      paths: entitlementPaths,
    });

    expect(absent.entitlements).not.toHaveProperty(
      'com.apple.security.application-groups'
    );
    expect(empty.entitlements).not.toHaveProperty(
      'com.apple.security.application-groups'
    );
  });

  test('keeps an explicit non-empty clip App Group list', () => {
    const plan = planEntitlements({
      type: 'clip',
      entitlements: {
        'com.apple.security.application-groups': ['group.com.example.clip'],
      },
      mainBundleIdentifier: MAIN_BUNDLE_ID,
      mainAppGroups: ['group.com.example.app'],
      paths: entitlementPaths,
    });

    expect(plan.entitlements['com.apple.security.application-groups']).toEqual([
      'group.com.example.clip',
    ]);
  });
});

describe('planEmbed', () => {
  test('maps each type to its embed strategy', () => {
    expect(planEmbed('share')).toEqual({ kind: 'foundation-extension' });
    expect(planEmbed('clip')).toEqual({ kind: 'app-clip' });
    expect(planEmbed('watch')).toEqual({ kind: 'watch-content' });
    expect(planEmbed('watch-widget')).toEqual({ kind: 'watch-extension' });
  });
});

describe('composeXcodeTargetPlan content-blocker', () => {
  test('plans blockerList.json as a bundle resource', () => {
    const plan = composeXcodeTargetPlan({
      props: makeProps({
        type: 'content-blocker',
        name: 'Blocker',
        displayName: 'ET Blocker',
      }),
      expoConfig: { ios: { bundleIdentifier: MAIN_BUNDLE_ID } },
      workspace: makeWorkspace({
        type: 'content-blocker',
        directory: 'targets/content-blocker',
        bundleResourceFiles: ['blockerList.json'],
      }),
      paths: {
        projectRoot: PROJECT_ROOT,
        platformProjectRoot: path.join(PROJECT_ROOT, 'ios'),
        projectName: PROJECT_NAME,
      },
      mainBuildSettings: {},
    });
    expect(plan.bundleResources).toEqual([
      expect.objectContaining({
        file: 'blockerList.json',
        referencePath: expect.stringContaining('blockerList.json'),
      }),
    ]);
  });
});

describe('composeXcodeTargetPlan', () => {
  test('assembles a complete plan from props and workspace only', () => {
    const plan = composeXcodeTargetPlan({
      props: makeProps({ entry: './index.tsx', displayName: 'My Share' }),
      expoConfig: {
        version: '1.2.3',
        ios: { bundleIdentifier: MAIN_BUNDLE_ID },
      },
      workspace: makeWorkspace(),
      paths,
      mainBuildSettings: { SWIFT_VERSION: '5.9' },
    });

    expect(plan.identity.targetProductName).toBe('MyShareTarget');
    expect(plan.requiresCode).toBe(true);
    expect(plan.requiresEntitlements).toBe(true);
    expect(plan.embed).toEqual({ kind: 'foundation-extension' });
    expect(plan.swiftFiles).toHaveLength(1);
    expect(plan.buildSettings.MARKETING_VERSION).toBe('1.2.3');
    expect(plan.infoPlist.contents).toContain('ReactNativeViewController');
    expect(plan.safari).toBeUndefined();
    expect(plan.bundleReactNative).toEqual({ entryFile: 'index.tsx' });
  });
});

const SAFARI_RESOURCES = path.join(
  'ExpoTargetsGenerated',
  PRODUCT_NAME,
  'Resources'
);
const MY_SAFARI_POPUP_JS = path.join(
  PROJECT_ROOT,
  'ios',
  PROJECT_NAME,
  'ExpoTargetsGenerated',
  'MySafariTarget',
  'Resources',
  'popup.js'
);
const MY_SAFARI_POPUP_REF = path.join(
  PROJECT_NAME,
  'ExpoTargetsGenerated',
  'MySafariTarget',
  'Resources',
  'popup.js'
);

describe('composeXcodeTargetPlan safari with entry', () => {
  test('plans Safari resources and web bundle', () => {
    const plan = composeXcodeTargetPlan({
      props: makeProps({
        type: 'safari',
        name: 'MySafari',
        entry: './index.tsx',
      }),
      expoConfig: { ios: { bundleIdentifier: MAIN_BUNDLE_ID } },
      workspace: makeWorkspace({ type: 'safari' }),
      paths,
      mainBuildSettings: {},
    });

    expect(plan.safari?.useCustomResources).toBe(false);
    expect(plan.safari?.resourcesPath).toContain(SAFARI_RESOURCES);
    expect(plan.safari?.referencePath).toContain('Resources');
    expect(plan.bundleReactNative).toBeUndefined();
    expect(plan.safariWebBundle).toEqual({
      entryFile: 'index.tsx',
      popupJsPath: MY_SAFARI_POPUP_JS,
      popupJsReferencePath: MY_SAFARI_POPUP_REF,
    });
  });
});

describe('composeXcodeTargetPlan safari without entry', () => {
  test('plans Safari resources for native safari', () => {
    const plan = composeXcodeTargetPlan({
      props: makeProps({
        type: 'safari',
        name: 'NativeSafari',
      }),
      expoConfig: { ios: { bundleIdentifier: MAIN_BUNDLE_ID } },
      workspace: makeWorkspace({ type: 'safari' }),
      paths,
      mainBuildSettings: {},
    });

    expect(plan.safari?.resourcesPath).toContain(SAFARI_RESOURCES);
  });
});
