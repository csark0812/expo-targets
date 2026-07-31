import { describe, expect, test } from 'bun:test';

import {
  assertSafeBundleId,
  assertSafeDeviceId,
  assertSafePath,
} from './allowlist';
import { applyCuts, cutOrder, HOST_CLAIMS, mustKeepHosts } from './claims';
import { acquireDeviceLock } from './lock';

describe('allowlist', () => {
  test('accepts bundle ids', () => {
    expect(assertSafeBundleId('com.apple.mobilesafari')).toBe(
      'com.apple.mobilesafari'
    );
  });

  test('rejects shelly bundle ids', () => {
    expect(() => assertSafeBundleId('com.apple;rm -rf')).toThrow();
  });

  test('rejects path metacharacters', () => {
    expect(() => assertSafePath('/tmp/foo;bar')).toThrow();
  });

  test('accepts udids', () => {
    expect(assertSafeDeviceId('AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE')).toBe(
      'AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE'
    );
  });
});

describe('claims', () => {
  test('must-keep set is the dogfood core', () => {
    expect(mustKeepHosts()).toEqual([
      'share',
      'messages',
      'photos',
      'springboard',
      'settings',
      'safari',
    ]);
  });

  test('cut order is Wallet → Clip → widgets → Stickers then android', () => {
    expect(cutOrder()).toEqual([
      'wallet',
      'clip',
      'widgets',
      'stickers',
      'android-hello',
    ]);
  });

  test('applyCuts drops red hosts', () => {
    const green = new Set(mustKeepHosts());
    const state = applyCuts(green);
    expect(state.surviving).toEqual(mustKeepHosts());
    expect(state.cut).toContain('wallet');
    expect(state.cut).toContain('android-hello');
  });

  test('claim table covers early hosts', () => {
    const ids = HOST_CLAIMS.map((c) => c.id);
    expect(ids).toContain('share');
    expect(ids).toContain('android-hello');
  });
});

describe('lock', () => {
  test('acquires and releases', () => {
    const id = 'test-device-lock-unit';
    const handle = acquireDeviceLock(id);
    expect(handle.deviceId).toBe(id);
    handle.release();
    const again = acquireDeviceLock(id);
    again.release();
  });

  test('second holder fails while first held', () => {
    const id = 'test-device-lock-busy';
    const first = acquireDeviceLock(id);
    expect(() => acquireDeviceLock(id)).toThrow(/already locked/);
    first.release();
  });
});
