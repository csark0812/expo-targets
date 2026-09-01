import { describe, expect, test } from 'bun:test';

import {
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

describe('parseReactNativeConfig', () => {
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
