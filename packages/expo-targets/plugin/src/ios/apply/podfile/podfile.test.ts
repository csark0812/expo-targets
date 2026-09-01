import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { normalizePodfile } from '../../../../test-utils/normalizePodfile';
import { Logger } from '../../../logger';
import { applyPodfilePlan } from './applyPodfilePlan';
import {
  ensureExcludedPackagesPostIntegrate,
  ensureExpoWidgetsPostInstall,
  ensureMainTargetUsesFrameworks,
  ensureReactNativeExtensionFrameworkPaths,
  generateExpoUiWidgetTargetBlock,
  generateReactNativeTargetBlock,
  generateStandaloneTargetBlock,
  hasTargetBlock,
  insertTargetBlock,
  removeTargetBlock,
} from './podfile';

const fixturesDir = path.join(__dirname, '../../../../__fixtures__/podfile');
const plainPodfile = fs.readFileSync(
  path.join(fixturesDir, 'plain.Podfile'),
  'utf-8'
);
const withFrameworksPodfile = fs.readFileSync(
  path.join(fixturesDir, 'with-frameworks.Podfile'),
  'utf-8'
);

describe('hasTargetBlock', () => {
  test('detects an existing target block', () => {
    expect(hasTargetBlock(plainPodfile, 'App')).toBe(true);
  });

  test('returns false when target is absent', () => {
    expect(hasTargetBlock(plainPodfile, 'ShareExtensionTarget')).toBe(false);
  });
});

describe('generateStandaloneTargetBlock', () => {
  test('generates a target block without use_frameworks! by default', () => {
    const block = generateStandaloneTargetBlock({
      targetName: 'ShareExtensionTarget',
      deploymentTarget: '15.1',
    });

    expect(block).toContain("target 'ShareExtensionTarget' do");
    expect(block).toContain("platform :ios, '15.1'");
    expect(block).not.toContain('use_frameworks!');
  });

  test('includes use_frameworks! :linkage => :static when requested', () => {
    const block = generateStandaloneTargetBlock({
      targetName: 'ShareExtensionTarget',
      deploymentTarget: '15.1',
      useFrameworks: true,
    });

    expect(block).toContain('use_frameworks! :linkage => :static');
  });
});

describe('generateReactNativeTargetBlock', () => {
  test('share/action inherit search_paths only', () => {
    const block = generateReactNativeTargetBlock({
      targetName: 'ExampleShareTarget',
      deploymentTarget: '15.1',
      extensionType: 'share',
    });
    expect(block).toContain('inherit! :search_paths');
    expect(block).not.toContain('expo-targets-excluded-packages');
  });

  test('clip also inherits search_paths (host copies frameworks into AppClips)', () => {
    const block = generateReactNativeTargetBlock({
      targetName: 'ExampleClipTarget',
      deploymentTarget: '15.1',
      extensionType: 'clip',
    });
    expect(block).toContain('inherit! :search_paths');
  });

  test('records excludedPackages as a marker comment', () => {
    const block = generateReactNativeTargetBlock({
      targetName: 'ExampleMessagesTarget',
      deploymentTarget: '16.4',
      extensionType: 'messages',
      excludedPackages: ['expo-updates', 'expo-dev-client'],
    });
    expect(block).toContain(
      '# [expo-targets-excluded-packages-list] expo-updates,expo-dev-client'
    );
  });

  test('records linker tokens for the same strip set', () => {
    const block = generateReactNativeTargetBlock({
      targetName: 'ExampleMessagesTarget',
      deploymentTarget: '16.4',
      extensionType: 'messages',
      excludedPackages: ['@intercom/intercom-react-native'],
      linkerTokens: ['Intercom', 'intercom-react-native'],
    });
    expect(block).toContain(
      '# [expo-targets-excluded-linker-list] Intercom,intercom-react-native'
    );
  });
});

describe('ensureExcludedPackagesPostIntegrate', () => {
  test('injects an idempotent post_integrate hook', () => {
    const once = ensureExcludedPackagesPostIntegrate(plainPodfile, [
      {
        targetName: 'ExampleMessagesTarget',
        packages: ['expo-updates', 'expo-dev-client'],
      },
    ]);
    expect(once).toContain('# [expo-targets-excluded-packages-begin]');
    expect(once).toContain('# [expo-targets-excluded-packages-done]');
    expect(once).toContain('post_integrate do |installer|');
    expect(once).toContain(
      "'ExampleMessagesTarget' => { :packages => ['expo-updates', 'expo-dev-client'], :linker => [] }"
    );
    expect(once).toContain('expo-configure-project.sh');
    expect(once).toContain('Pods-#{target_name}');
    expect(once).toContain('ExpoTargetsExtensionBundleModule');
    expect(once).toContain('OTHER_LDFLAGS');
    expect(once).toContain('-framework');

    const twice = ensureExcludedPackagesPostIntegrate(once, [
      {
        targetName: 'ExampleMessagesTarget',
        packages: ['expo-updates', 'expo-dev-client'],
      },
    ]);
    expect(twice.split('# [expo-targets-excluded-packages-begin]').length).toBe(
      2
    );
  });

  test('records linker tokens in the post_integrate spec', () => {
    const once = ensureExcludedPackagesPostIntegrate(plainPodfile, [
      {
        targetName: 'ExampleMessagesTarget',
        packages: ['@intercom/intercom-react-native'],
        linkerTokens: ['Intercom'],
      },
    ]);
    expect(once).toContain(":linker => ['Intercom']");
    expect(once).toContain('Dir.glob');
  });

  test('removes the hook when exclusions are empty', () => {
    const withHook = ensureExcludedPackagesPostIntegrate(plainPodfile, [
      { targetName: 'ExampleMessagesTarget', packages: ['expo-updates'] },
    ]);
    const cleared = ensureExcludedPackagesPostIntegrate(withHook, []);
    expect(cleared).not.toContain('# [expo-targets-excluded-packages-begin]');
    expect(cleared).not.toContain('post_integrate do |installer|');
  });
});

describe('insertTargetBlock + removeTargetBlock', () => {
  test('inserts a standalone target as a sibling of the main target', () => {
    const block = generateStandaloneTargetBlock({
      targetName: 'ShareExtensionTarget',
      deploymentTarget: '15.1',
    });

    const result = insertTargetBlock(plainPodfile, block, {
      standalone: true,
    });

    expect(hasTargetBlock(result, 'ShareExtensionTarget')).toBe(true);
    expect(hasTargetBlock(result, 'App')).toBe(true);
  });

  test('round-trips insert then remove back to the original content', () => {
    const block = generateStandaloneTargetBlock({
      targetName: 'ShareExtensionTarget',
      deploymentTarget: '15.1',
    });

    const inserted = insertTargetBlock(plainPodfile, block, {
      standalone: true,
    });
    const removed = removeTargetBlock(inserted, 'ShareExtensionTarget');

    expect(normalizePodfile(removed)).toBe(normalizePodfile(plainPodfile));
  });

  test('removeTargetBlock is a no-op when the target does not exist', () => {
    const result = removeTargetBlock(plainPodfile, 'DoesNotExist');
    expect(result).toBe(plainPodfile);
  });

  test('standalone insert does not splice into the excluded-packages fence', () => {
    const withHook = ensureExcludedPackagesPostIntegrate(plainPodfile, [
      { targetName: 'MessagesTarget', packages: ['expo-updates'] },
    ]);
    const clip = generateStandaloneTargetBlock({
      targetName: 'ClipTarget',
      deploymentTarget: '16.4',
      useFrameworks: true,
    });
    const result = insertTargetBlock(withHook, clip, { standalone: true });

    expect(result).toContain('# [expo-targets-excluded-packages-begin]');
    expect(result).toContain('# [expo-targets-excluded-packages-done]');
    expect(result).not.toMatch(/excluded-packages-\w+\n/);
    expect(result).not.toMatch(/^\s+end\]/m);
    expect(result.indexOf("target 'ClipTarget'")).toBeLessThan(
      result.indexOf('# [expo-targets-excluded-packages-begin]')
    );
  });
});

describe('applyPodfilePlan messages then clip', () => {
  test('keeps fence markers intact after a later standalone target', () => {
    const logger = new Logger();
    const afterMessages = applyPodfilePlan(
      plainPodfile,
      {
        targetName: 'MessagesTarget',
        deploymentTarget: '16.4',
        extensionType: 'messages',
        standalone: false,
        excludedPackages: ['expo-updates', 'expo-dev-client'],
      },
      { mainTargetName: 'App', logger }
    );
    const afterClip = applyPodfilePlan(
      afterMessages,
      {
        targetName: 'ClipTarget',
        deploymentTarget: '16.4',
        extensionType: 'clip',
        standalone: true,
      },
      { mainTargetName: 'App', logger }
    );

    expect(afterClip).toContain('# [expo-targets-excluded-packages-list]');
    expect(afterClip).toContain('# [expo-targets-excluded-packages-begin]');
    expect(afterClip).toContain('# [expo-targets-excluded-packages-done]');
    expect(afterClip).not.toMatch(/excluded-packages-\w+\n/);
    expect(afterClip).not.toMatch(/^\s+end\]/m);
    expect(afterClip).toContain("target 'ClipTarget' do");
    expect(afterClip.indexOf("target 'ClipTarget'")).toBeLessThan(
      afterClip.indexOf('# [expo-targets-excluded-packages-begin]')
    );
  });
});

describe('ensureMainTargetUsesFrameworks', () => {
  test('adds use_frameworks! to a plain main target', () => {
    const result = ensureMainTargetUsesFrameworks(plainPodfile, 'App');
    expect(result).toContain('use_frameworks! :linkage => :static');
  });

  test('is idempotent when use_frameworks! already present', () => {
    const result = ensureMainTargetUsesFrameworks(withFrameworksPodfile, 'App');
    expect(normalizePodfile(result)).toBe(
      normalizePodfile(withFrameworksPodfile)
    );
  });
});

describe('ensureReactNativeExtensionFrameworkPaths', () => {
  test('strips paired -Xcc when dropping host-only module maps', () => {
    const result = ensureReactNativeExtensionFrameworkPaths(
      withFrameworksPodfile,
      [{ targetName: 'Share', deploymentTarget: '15.1' }],
      'App'
    );
    // Orphaned -Xcc left a -Xcc -Xcc -fmodule-map-file=... that swiftc rejects.
    expect(result).toContain(
      String.raw`.gsub(/\s*-Xcc\s+-fmodule-map-file="[^"]*EXUpdates[^"]*"/, '')`
    );
    expect(result).toContain(
      String.raw`.gsub(/\s*"\$\{PODS_CONFIGURATION_BUILD_DIR\}\/EXUpdates"/, '')`
    );
    expect(result).not.toMatch(/OTHER_LDFLAGS = #\{/);
  });
});

describe('generateExpoUiWidgetTargetBlock', () => {
  test('links use_expo_modules_widgets!', () => {
    const block = generateExpoUiWidgetTargetBlock({
      targetName: 'HelloExpoUi',
      deploymentTarget: '16.4',
    });
    expect(block).toContain("target 'HelloExpoUi' do");
    expect(block).toContain('use_expo_modules_widgets!');
    expect(block).toContain('expo-widgets/package.json');
  });
});

describe('ensureExpoWidgetsPostInstall', () => {
  test('injects expo_widgets_post_install into existing post_install', () => {
    const next = ensureExpoWidgetsPostInstall(`
post_install do |installer|
  react_native_post_install(installer)
end
`);
    expect(next).toContain('expo_widgets_post_install(installer)');
    expect(next).toContain('react_native_post_install(installer)');
  });
});
