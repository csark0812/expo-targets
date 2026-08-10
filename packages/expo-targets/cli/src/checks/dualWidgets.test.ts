import { describe, expect, test } from 'bun:test';

import { warnDualWidgets } from './dualWidgets';

describe('warnDualWidgets', () => {
  test('fails when expo-widgets plugin and widget targets coexist', () => {
    const results = warnDualWidgets({
      plugins: ['expo-widgets'],
      targets: [{ config: { type: 'widget', name: 'W', platforms: ['ios'] } }],
    } as any);
    expect(results).toHaveLength(1);
    expect(results[0].level).toBe('error');
    expect(results[0].title).toBe('Dual widgets');
  });

  test('silent when only expo-targets widgets', () => {
    expect(
      warnDualWidgets({
        plugins: ['expo-targets'],
        targets: [{ config: { type: 'widget', name: 'W' } }],
      } as any)
    ).toEqual([]);
  });
});
