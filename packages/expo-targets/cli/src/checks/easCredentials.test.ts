import { describe, expect, test } from 'bun:test';
import type { ProjectContext } from '../types';
import { checkEasCredentials } from './easCredentials';

function baseCtx(overrides: Partial<ProjectContext> = {}): ProjectContext {
  return {
    projectRoot: '/tmp/app',
    expo: {
      ios: { bundleIdentifier: 'com.example.app' },
    },
    plugins: ['expo-targets'],
    hostAppGroups: ['group.com.example.app'],
    targets: [
      {
        dirName: 'share',
        configPath: '/tmp/app/targets/share/expo-target.config.json',
        config: {
          type: 'share',
          name: 'Share',
          platforms: ['ios'],
          appGroup: 'group.com.example.app',
        },
      },
    ],
    ...overrides,
  };
}

function withAppExtensions(
  rows: Array<{ targetName: string; bundleIdentifier: string }>
): ProjectContext {
  return baseCtx({
    expo: {
      ios: { bundleIdentifier: 'com.example.app' },
      extra: {
        eas: {
          build: {
            experimental: {
              ios: { appExtensions: rows },
            },
          },
        },
      },
    },
  });
}

describe('checkEasCredentials', () => {
  test('errors when host bundleIdentifier missing', () => {
    const results = checkEasCredentials(baseCtx({ expo: { ios: {} } }));
    expect(results.some((r) => r.level === 'error')).toBe(true);
    expect(results[0].message).toContain('bundleIdentifier');
  });

  test('warns when committed appExtensions misses a target', () => {
    const results = checkEasCredentials(
      withAppExtensions([
        {
          targetName: 'OtherTarget',
          bundleIdentifier: 'com.example.app.other',
        },
      ])
    );
    expect(
      results.some(
        (r) => r.level === 'warn' && r.message.includes('ShareTarget')
      )
    ).toBe(true);
  });

  test('errors when targetName is not sanitized product', () => {
    const results = checkEasCredentials(
      withAppExtensions([
        {
          targetName: 'Share',
          bundleIdentifier: 'com.example.app.share',
        },
      ])
    );
    expect(
      results.some(
        (r) => r.level === 'error' && r.message.includes('ShareTarget')
      )
    ).toBe(true);
  });
});
