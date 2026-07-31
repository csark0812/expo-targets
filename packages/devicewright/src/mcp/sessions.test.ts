import { describe, expect, test } from 'bun:test';

import type { DeviceSession } from '../session';
import {
  DEVICE_CLOSE_FORCED,
  DEVICE_SESSION_ABORTED,
  createSessionRegistry,
  resolveMcpSimulatorId,
  resolveMcpSimulatorIdFromBooted,
} from './sessions';

function mockSession(deviceId: string): DeviceSession {
  let closed = false;
  return {
    platform: 'ios',
    deviceId,
    kind: 'simulator',
    async close() {
      closed = true;
    },
    isClosed: () => closed,
  } as unknown as DeviceSession & { isClosed: () => boolean };
}

describe('resolveMcpSimulatorId soft-omit', () => {
  test('returns explicit deviceId', () => {
    expect(
      resolveMcpSimulatorId('AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE')
    ).toBe('AAAAAAAA-BBBB-CCCC-DDDD-EEEEEEEEEEEE');
  });

  test('0 booted fails loudly', () => {
    expect(() => resolveMcpSimulatorIdFromBooted(undefined, [])).toThrow(
      /no booted simulator/
    );
  });

  test('1 booted soft-omits', () => {
    expect(
      resolveMcpSimulatorIdFromBooted(undefined, [
        { udid: 'only-one', name: 'iPhone' },
      ])
    ).toBe('only-one');
  });

  test('2+ booted fails with list', () => {
    expect(() =>
      resolveMcpSimulatorIdFromBooted(undefined, [
        { udid: 'a', name: 'A' },
        { udid: 'b', name: 'B' },
      ])
    ).toThrow(/multiple booted simulators.*A \(a\).*B \(b\)/);
  });
});

describe('SessionRegistry', () => {
  test('holds two iOS sessions without closing the other', async () => {
    const launches: string[] = [];
    const registry = createSessionRegistry({
      skipIdbTracker: true,
      resolveId: (id) => id!,
      launchIos: async (id) => {
        launches.push(id);
        return mockSession(id);
      },
    });

    const a = await registry.ensureDevice('udid-a');
    const b = await registry.ensureDevice('udid-b');
    expect(a.deviceId).toBe('udid-a');
    expect(b.deviceId).toBe('udid-b');
    expect(registry.isHeld('udid-a')).toBe(true);
    expect(registry.isHeld('udid-b')).toBe(true);
    expect(launches).toEqual(['udid-a', 'udid-b']);
  });

  test('concurrent ensure same UDID coalesces to one launch', async () => {
    let launches = 0;
    let releaseLaunch!: () => void;
    const gate = new Promise<void>((r) => {
      releaseLaunch = r;
    });
    const registry = createSessionRegistry({
      skipIdbTracker: true,
      resolveId: (id) => id ?? 'solo',
      launchIos: async (id) => {
        launches += 1;
        await gate;
        return mockSession(id);
      },
    });

    const p1 = registry.ensureDevice('solo');
    const p2 = registry.ensureDevice('solo');
    releaseLaunch();
    const [s1, s2] = await Promise.all([p1, p2]);
    expect(launches).toBe(1);
    expect(s1).toBe(s2);
  });

  test('same-UDID runExclusive serializes; cross-id overlaps', async () => {
    const registry = createSessionRegistry({
      skipIdbTracker: true,
      resolveId: (id) => id!,
      launchIos: async (id) => mockSession(id),
    });
    await registry.ensureDevice('a');
    await registry.ensureDevice('b');

    const order: string[] = [];
    let releaseA!: () => void;
    const aGate = new Promise<void>((r) => {
      releaseA = r;
    });

    const a1 = registry.runExclusive('a', async () => {
      order.push('a-start');
      await aGate;
      order.push('a-end');
      return 1;
    });
    // Let a acquire the mutex
    await Promise.resolve();
    await Promise.resolve();

    const a2 = registry.runExclusive('a', async () => {
      order.push('a2');
      return 2;
    });
    const b1 = registry.runExclusive('b', async () => {
      order.push('b');
      return 3;
    });

    await Promise.resolve();
    await Promise.resolve();
    expect(order).toContain('a-start');
    expect(order).toContain('b');
    expect(order).not.toContain('a2');

    releaseA();
    await Promise.all([a1, a2, b1]);
    expect(order.indexOf('a-end')).toBeLessThan(order.indexOf('a2'));
  });

  test('close_device force returns DEVICE_CLOSE_FORCED and aborts hung owner', async () => {
    const registry = createSessionRegistry({
      skipIdbTracker: true,
      resolveId: (id) => id!,
      launchIos: async (id) => mockSession(id),
    });
    await registry.ensureDevice('hung');

    let releaseWork!: () => void;
    const workGate = new Promise<void>((r) => {
      releaseWork = r;
    });

    const hung = registry.runExclusive('hung', async () => {
      await workGate;
      return 'done';
    });

    await Promise.resolve();
    await Promise.resolve();

    const close = await registry.closeDevice('hung', 50);
    expect(close.ok).toBe(false);
    if (!close.ok) {
      expect(close.code).toBe(DEVICE_CLOSE_FORCED);
      expect(close.forced).toBe(true);
      expect(close.udid).toBe('hung');
    }
    expect(registry.isHeld('hung')).toBe(false);

    await expect(hung).rejects.toMatchObject({ name: DEVICE_SESSION_ABORTED });
    releaseWork();
  });

  test('clean close returns ok forced false', async () => {
    const registry = createSessionRegistry({
      skipIdbTracker: true,
      resolveId: (id) => id!,
      launchIos: async (id) => mockSession(id),
    });
    await registry.ensureDevice('clean');
    const result = await registry.closeDevice('clean', 100);
    expect(result).toEqual({ ok: true, forced: false, udid: 'clean' });
    expect(registry.isHeld('clean')).toBe(false);
  });

  test('heldByThisMcp reflects map membership', async () => {
    const registry = createSessionRegistry({
      skipIdbTracker: true,
      resolveId: (id) => id!,
      launchIos: async (id) => mockSession(id),
      listBooted: () => [
        { udid: 'held', name: 'Held' },
        { udid: 'free', name: 'Free' },
      ],
    });
    await registry.ensureDevice('held');
    const rows = registry.listBootedWithHeld();
    expect(rows).toEqual([
      { udid: 'held', name: 'Held', heldByThisMcp: true },
      { udid: 'free', name: 'Free', heldByThisMcp: false },
    ]);
  });

  test('releaseAll clears sessions without drain', async () => {
    const closed: string[] = [];
    const registry = createSessionRegistry({
      skipIdbTracker: true,
      resolveId: (id) => id!,
      launchIos: async (id) => {
        const s = mockSession(id);
        const orig = s.close.bind(s);
        s.close = async () => {
          closed.push(id);
          await orig();
        };
        return s;
      },
    });
    await registry.ensureDevice('x');
    await registry.ensureDevice('y');
    await registry.releaseAll();
    expect(registry.heldIds()).toEqual([]);
    expect(closed.sort()).toEqual(['x', 'y']);
  });
});
