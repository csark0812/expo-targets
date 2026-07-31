import { describe, expect, test } from 'bun:test';

import { runAsync } from '../exec';

describe('idb integer coords (footgun)', () => {
  test('Math.round matches what idb argv needs', () => {
    expect(Math.round(111.5)).toBe(112);
    expect(Math.round(111.4)).toBe(111);
    expect(String(Math.round(200.9))).toBe('201');
  });
});

describe('runAsync killable', () => {
  test('onSpawn tracks child and signal aborts', async () => {
    let spawnedPid: number | undefined;
    const ac = new AbortController();
    const pending = runAsync(
      process.execPath,
      ['-e', 'setTimeout(() => {}, 30_000)'],
      {
        onSpawn: (child) => {
          spawnedPid = child.pid;
        },
        signal: ac.signal,
      }
    );
    await new Promise((r) => setTimeout(r, 50));
    expect(spawnedPid).toBeGreaterThan(0);
    ac.abort();
    await expect(pending).rejects.toThrow(/aborted/);
  });

  test('timeoutMs kills hung child', async () => {
    const pending = runAsync(
      process.execPath,
      ['-e', 'setTimeout(() => {}, 30_000)'],
      { timeoutMs: 80 }
    );
    await expect(pending).rejects.toThrow(/timed out/);
  });
});
