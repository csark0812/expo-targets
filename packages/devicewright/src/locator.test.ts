import { describe, expect, test } from 'bun:test';

import { Locator } from './locator';
import type {
  AccessibilityNode,
  DeviceDriver,
  FindCriteria,
  TapOptions,
} from './types';

function fakeDriver(nodes: AccessibilityNode[]): DeviceDriver {
  return {
    platform: 'ios',
    deviceId: 'fake',
    kind: 'simulator',
    async install() {},
    async launchApp() {},
    async screenshot() {
      return Buffer.from('');
    },
    async accessibilityTree() {
      return nodes;
    },
    async findElements(criteria: FindCriteria) {
      return nodes.filter((n) =>
        criteria.search.some((s) => (n.label ?? '').includes(s))
      );
    },
    async tap(_options: TapOptions) {},
    async type() {},
    async swipe() {},
  };
}

describe('Locator', () => {
  test('taps center of matching frame', async () => {
    const taps: TapOptions[] = [];
    const driver = fakeDriver([
      {
        type: 'Button',
        label: 'Share',
        frame: { x: 10, y: 20, width: 100, height: 40 },
      },
    ]);
    driver.tap = async (o) => {
      taps.push(o);
    };
    const loc = new Locator(driver, { search: ['Share'] }, { timeoutMs: 500 });
    await loc.tap();
    expect(taps[0]).toEqual({ x: 60, y: 40 });
  });

  test('times out when missing', async () => {
    const loc = new Locator(
      fakeDriver([]),
      { search: ['Nope'] },
      { timeoutMs: 200, intervalMs: 50 }
    );
    await expect(loc.tap()).rejects.toThrow(/locator timeout/);
  });
});
