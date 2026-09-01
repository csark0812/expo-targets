import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import {
  frameworkNamesFromPodspec,
  mergeAutolinkedPackages,
  parseExpoAutolinkingResolve,
  parseReactNativeConfig,
} from './autolinkedPackages';

describe('parseExpoAutolinkingResolve', () => {
  test('maps packageName to pods and swift modules', () => {
    expect(
      parseExpoAutolinkingResolve({
        modules: [
          {
            packageName: '@sentry/react-native',
            pods: [{ podName: 'RNSentry' }],
            swiftModuleNames: ['RNSentry'],
          },
        ],
      })
    ).toEqual([
      {
        packageName: '@sentry/react-native',
        linkerTokens: ['@sentry/react-native', 'RNSentry'],
      },
    ]);
  });
});

describe('frameworkNamesFromPodspec', () => {
  test('maps wrapper pod dependencies to XCFramework names, not React runtime pods', () => {
    expect(
      frameworkNamesFromPodspec(`
Pod::Spec.new do |s|
  s.name = "intercom-react-native"
  s.dependency "Intercom", '~> 19.3.0'
  s.dependency "React-Core"
end
`)
    ).toEqual(['Intercom']);

    expect(
      frameworkNamesFromPodspec(`
Pod::Spec.new do |s|
  s.name = "logrocket-react-native"
  s.dependency "LogRocket", "3.6.0"
  s.dependency "React"
end
`)
    ).toEqual(['LogRocket']);
  });

  test('maps vendored xcframework basenames', () => {
    expect(
      frameworkNamesFromPodspec(`
s.vendored_frameworks = "ios/SomeSDK.xcframework"
`)
    ).toEqual(['SomeSDK']);
  });
});

describe('parseReactNativeConfig podspec file', () => {
  test('reads framework names from the podspec on disk', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-targets-podspec-'));
    const podspecPath = path.join(dir, 'intercom-react-native.podspec');
    fs.writeFileSync(
      podspecPath,
      `
Pod::Spec.new do |s|
  s.dependency "Intercom", '~> 19.3.0'
  s.dependency "React-Core"
end
`
    );
    expect(
      parseReactNativeConfig({
        dependencies: {
          '@intercom/intercom-react-native': {
            platforms: {
              ios: { podspecPath },
            },
          },
        },
      })
    ).toEqual([
      {
        packageName: '@intercom/intercom-react-native',
        linkerTokens: [
          '@intercom/intercom-react-native',
          'intercom-react-native',
          'Intercom',
        ],
      },
    ]);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('parseReactNativeConfig basename', () => {
  test('maps RN community deps from podspec basename', () => {
    expect(
      parseReactNativeConfig({
        dependencies: {
          '@intercom/intercom-react-native': {
            platforms: {
              ios: {
                podspecPath:
                  '/app/node_modules/@intercom/intercom-react-native/intercom-react-native.podspec',
              },
            },
          },
          '@logrocket/react-native': {
            platforms: {
              ios: {
                podspecPath:
                  '/app/node_modules/@logrocket/react-native/LogRocket.podspec',
              },
            },
          },
          'left-pad': {
            platforms: { android: {} },
          },
        },
      })
    ).toEqual([
      {
        packageName: '@intercom/intercom-react-native',
        linkerTokens: [
          '@intercom/intercom-react-native',
          'intercom-react-native',
        ],
      },
      {
        packageName: '@logrocket/react-native',
        linkerTokens: ['@logrocket/react-native', 'LogRocket'],
      },
    ]);
  });
});

describe('mergeAutolinkedPackages', () => {
  test('unions tokens for the same package', () => {
    expect(
      mergeAutolinkedPackages([
        [{ packageName: 'expo-image', linkerTokens: ['expo-image'] }],
        [
          {
            packageName: 'expo-image',
            linkerTokens: ['ExpoImage'],
          },
        ],
      ])
    ).toEqual([
      {
        packageName: 'expo-image',
        linkerTokens: ['expo-image', 'ExpoImage'],
      },
    ]);
  });
});
