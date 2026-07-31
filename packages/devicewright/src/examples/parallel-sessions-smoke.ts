/**
 * Required local smoke (not CI): two booted sims, concurrent cross-UDID tools,
 * same-UDID serial. Validates multi-sim Map (A), not cross-process B1.
 *
 * Usage:
 *   bun src/examples/parallel-sessions-smoke.ts
 *   DEVICEWRIGHT_SMOKE_UDIDS=udid1,udid2 bun src/examples/parallel-sessions-smoke.ts
 */

import { createSessionRegistry, listBootedSimulators } from '../mcp/sessions';
import { devices } from '../devices';

async function main(): Promise<void> {
  const fromEnv = process.env.DEVICEWRIGHT_SMOKE_UDIDS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const booted = listBootedSimulators();
  const udids =
    fromEnv && fromEnv.length >= 2
      ? fromEnv.slice(0, 2)
      : booted.slice(0, 2).map((d) => d.udid);

  if (udids.length < 2) {
    throw new Error(
      `need two booted sims (found ${booted.length}). Boot two simulators or set DEVICEWRIGHT_SMOKE_UDIDS=udid1,udid2`
    );
  }

  const [a, b] = udids as [string, string];
  const registry = createSessionRegistry();

  console.log(`smoke: ensure ${a} and ${b}`);
  await Promise.all([registry.ensureDevice(a), registry.ensureDevice(b)]);
  if (!registry.isHeld(a) || !registry.isHeld(b)) {
    throw new Error('expected both UDIDs held after ensure');
  }

  console.log('smoke: concurrent cross-UDID accessibilityTree');
  const [treeA, treeB] = await Promise.all([
    registry.runExclusive(a, (s) => s.accessibilityTree()),
    registry.runExclusive(b, (s) => s.accessibilityTree()),
  ]);
  if (!Array.isArray(treeA) || !Array.isArray(treeB)) {
    throw new Error('expected accessibility trees from both devices');
  }

  console.log('smoke: same-UDID serial taps (rounded coords)');
  const order: string[] = [];
  await Promise.all([
    registry.runExclusive(a, async (s) => {
      order.push('1-start');
      await s.tap({ x: 10.5, y: 10.5 });
      order.push('1-end');
    }),
    registry.runExclusive(a, async (s) => {
      order.push('2-start');
      await s.tap({ x: 12.2, y: 12.2 });
      order.push('2-end');
    }),
  ]);
  const joined = order.join(',');
  if (
    joined !== '1-start,1-end,2-start,2-end' &&
    joined !== '2-start,2-end,1-start,1-end'
  ) {
    throw new Error(`same-UDID work not serialized: ${joined}`);
  }

  console.log('smoke: close both');
  const closeA = await registry.closeDevice(a, 5_000);
  const closeB = await registry.closeDevice(b, 5_000);
  if (!closeA.ok || !closeB.ok) {
    throw new Error(`expected clean closes, got ${JSON.stringify({ closeA, closeB })}`);
  }

  // scripts path still works (ephemeral, not MCP registry)
  const script = await devices.launch({
    platform: 'ios',
    deviceId: a,
    lock: false,
    boot: false,
  });
  await script.close();

  console.log('smoke: ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
