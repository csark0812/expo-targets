import type { DeviceSession } from '@csark0812/devicewright';
import {
  BLOCKED_SHEET_LABELS,
  TARGET_CATALOG,
  type TargetCatalogEntry,
} from '../catalog';
import type { TargetJourneyResult } from '../types';
import {
  assertPayloadContains,
  C1,
  findNamedNode,
  flattenLabels,
  sleep,
  tapCenter,
  tapId,
  waitForId,
  waitForNamed,
} from './helpers';

async function dismissShareSheet(device: DeviceSession): Promise<void> {
  for (const label of ['Close', 'Cancel']) {
    try {
      const node = await waitForNamed(device, [label], 2_000);
      await tapCenter(device, node);
      await sleep(500);
      return;
    } catch {
      // try next
    }
  }
  // Best-effort: tap outside / home not required — re-launch host later.
}

async function findExtensionRow(
  device: DeviceSession,
  entry: TargetCatalogEntry,
  timeoutMs = 15_000
): Promise<ReturnType<typeof findNamedNode>> {
  const names = [
    entry.extensionName,
    entry.hostDisplayName,
    ...entry.extensionAliases,
  ].filter(Boolean);
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const tree = await device.accessibilityTree();
    const hit = findNamedNode(tree, names);
    if (hit && !BLOCKED_SHEET_LABELS.has(hit.label ?? '')) return hit;

    // View More / More expands the activity list.
    const more = findNamedNode(tree, ['View More', 'More']);
    if (more) {
      try {
        await tapCenter(device, more);
        await sleep(800);
        continue;
      } catch {
        // ignore
      }
    }
    await sleep(400);
  }
  const tree = await device.accessibilityTree();
  throw new Error(
    `extension row not in Share Sheet (${names.join(' | ')}); labels=${flattenLabels(
      tree
    )
      .slice(0, 100)
      .join(', ')}`
  );
}

/**
 * Share/action C1 parity journey (pure DW).
 * Checklist: trigger → find row → complete → host marker.
 * Caller must ensure Release install (operator fail if Debug-only).
 */
export async function runShareActionJourney(
  device: DeviceSession,
  id: keyof typeof TARGET_CATALOG
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG[id];
  if (!entry?.testIds.openShareSheet) {
    return {
      id,
      path: entry?.path ?? id,
      phase: 1,
      ok: false,
      status: 'red',
      steps: [],
      error: `no share/action catalog for ${id}`,
      failureKind: 'product',
    };
  }

  const steps: string[] = [];
  const checklist: string[] = [];
  try {
    steps.push('launch-host');
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await waitForId(device, entry.testIds.screenRoot, 20_000);
    steps.push('host-ready');

    const clearId = entry.testIds.clearPayload;
    try {
      await tapId(device, clearId, 5_000);
      steps.push('clear-payload');
    } catch {
      steps.push('clear-payload-skip');
    }

    steps.push('open-share-sheet');
    await tapId(device, entry.testIds.openShareSheet, 10_000);
    checklist.push(C1.triggerFromHost);
    await sleep(1_200);

    steps.push('find-extension-row');
    const row = await findExtensionRow(device, entry);
    if (!row) throw new Error('extension row missing');
    checklist.push(C1.findExtensionRow);

    steps.push('tap-extension');
    await tapCenter(device, row);
    await sleep(1_500);

    if (entry.readyText) {
      try {
        await waitForNamed(device, [entry.readyText], 12_000);
        steps.push('appex-ready');
      } catch {
        steps.push('appex-ready-skip');
      }
    }

    const completeLabels = entry.completeButton
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    steps.push('complete-appex');
    const complete = await waitForNamed(device, completeLabels, 15_000);
    await tapCenter(device, complete);
    checklist.push(C1.completeAppex);
    await sleep(1_200);

    steps.push('return-host');
    await device.launchApp(entry.hostBundleId);
    await waitForId(device, entry.testIds.screenRoot, 15_000);
    if (entry.testIds.refresh) {
      try {
        await tapId(device, entry.testIds.refresh, 5_000);
      } catch {
        // optional
      }
    }

    steps.push('assert-payload');
    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      entry.payloadMarker,
      25_000
    );
    checklist.push(C1.assertHostMarker);

    return {
      id: entry.id,
      path: entry.path,
      phase: 1,
      ok: true,
      status: 'green',
      steps,
      checklist,
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /labels=\s*$|labels=$/m.test(msg)
      ? 'infra'
      : /not installed|Unable to find|failed to get the task|Launch failed/i.test(
            msg
          )
        ? 'operator'
        : /btn-open-share-sheet|screen-root/i.test(msg)
          ? 'operator'
          : 'product';
    try {
      await dismissShareSheet(device);
    } catch {
      // ignore
    }
    return {
      id: entry.id,
      path: entry.path,
      phase: 1,
      ok: false,
      status:
        failureKind === 'operator'
          ? 'operator'
          : failureKind === 'infra'
            ? 'infra'
            : 'red',
      steps,
      checklist,
      error: msg,
      failureKind,
    };
  }
}
