import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  anyTargetNeedsAppGroup,
  ensureHostAppGroups,
  targetNeedsAppGroup,
  warnMissingMetroWrapper,
} from './ensureHostAppGroups';
import { Logger } from './logger';

describe('targetNeedsAppGroup', () => {
  test('share requires app group', () => {
    expect(targetNeedsAppGroup('share')).toBe(true);
  });

  test('action uses app groups by default', () => {
    expect(targetNeedsAppGroup('action')).toBe(true);
  });

  test('safari does not need app groups', () => {
    expect(targetNeedsAppGroup('safari')).toBe(false);
  });
});

describe('ensureHostAppGroups', () => {
  test('invents group when target needs one and host has none', () => {
    const logger = new Logger(false);
    const targets = [
      {
        config: {
          type: 'share' as const,
          platforms: ['ios'],
        },
      },
    ];
    expect(anyTargetNeedsAppGroup(targets)).toBe(true);

    const config = ensureHostAppGroups(
      {
        ios: { bundleIdentifier: 'com.example.app' },
      },
      targets,
      logger
    );

    expect(
      config.ios?.entitlements?.['com.apple.security.application-groups']
    ).toEqual(['group.com.example.app']);
  });

  test('does not overwrite existing host app groups', () => {
    const logger = new Logger(false);
    const targets = [
      {
        config: {
          type: 'share' as const,
          platforms: ['ios'],
        },
      },
    ];

    const config = ensureHostAppGroups(
      {
        ios: {
          bundleIdentifier: 'com.example.app',
          entitlements: {
            'com.apple.security.application-groups': ['group.custom'],
          },
        },
      },
      targets,
      logger
    );

    expect(
      config.ios?.entitlements?.['com.apple.security.application-groups']
    ).toEqual(['group.custom']);
  });
});

describe('warnMissingMetroWrapper', () => {
  test('warns when entry target exists but metro lacks withTargets', () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-targets-plugin-'));
    fs.writeFileSync(
      path.join(root, 'metro.config.js'),
      'module.exports = {};\n'
    );

    const warnings: string[] = [];
    const logger = {
      warn: (msg: string) => warnings.push(msg),
      log: () => {},
      logSparse: () => {},
    } as Logger;

    warnMissingMetroWrapper(
      root,
      [{ config: { entry: './targets/share/index.tsx' } }],
      logger
    );

    expect(warnings.some((w) => w.includes('withTargets'))).toBe(true);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
