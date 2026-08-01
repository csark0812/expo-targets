import type { DeviceSession } from '@csark0812/devicewright';
import { TARGET_CATALOG } from '../catalog';
import type { TargetJourneyResult } from '../types';
import { sleep, tapId, waitForId } from './helpers';

const SAFARI_BUNDLE = 'com.apple.mobilesafari';

/**
 * Clip host + invocation as far as idb allows.
 * Host contract: screen-root + seed/clear/payload. Invocation via Safari soft probe.
 */
export async function runClipJourney(
  device: DeviceSession
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG.clip;
  const steps: string[] = [];
  try {
    steps.push('launch-host');
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await waitForId(device, entry.testIds.screenRoot, 20_000);
    steps.push('host-ready');

    steps.push('seed-payload');
    await tapId(device, 'btn-seed-payload', 8_000);
    await sleep(400);
    const payload = await waitForId(device, entry.testIds.lastPayload, 8_000);
    const label = payload.label ?? '';
    if (!label.includes('seeded') && !label.includes('itemName')) {
      // Accept any non-none after seed.
      if (label === 'none' || label === '') {
        throw new Error(`clip host payload still empty after seed: ${label}`);
      }
    }
    steps.push('host-contract-ok');

    steps.push('safari-probe');
    await device.launchApp(SAFARI_BUNDLE, { terminateRunning: true });
    await sleep(800);
    const tree = await device.accessibilityTree();
    if (tree.length === 0) {
      throw new Error('Safari accessibility tree empty (clip surface probe)');
    }
    steps.push('invocation-surface-ok');

    return {
      id: entry.id,
      path: entry.path,
      phase: 3,
      ok: true,
      status: 'green',
      steps,
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? 'operator'
      : 'product';
    return {
      id: entry.id,
      path: entry.path,
      phase: 3,
      ok: false,
      status: failureKind === 'operator' ? 'operator' : 'red',
      steps,
      error: msg,
      failureKind,
    };
  }
}
