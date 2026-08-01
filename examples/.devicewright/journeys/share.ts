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
  findNamedViaPointProbe,
  findSheetRowProbe,
  hostReadyTestId,
  sleep,
  tapId,
  tapProbeHit,
  waitForId,
} from './helpers';

async function dismissShareSheet(device: DeviceSession): Promise<void> {
  for (const label of ['Close', 'Cancel']) {
    try {
      const hit = await findNamedViaPointProbe(device, [label], {
        timeoutMs: 2_000,
        yStartRatio: 0.05,
        yEndRatio: 0.95,
        allowBlocked: true,
      });
      await tapProbeHit(device, hit);
      await sleep(500);
      return;
    } catch {
      // try next
    }
  }
}

/**
 * Find share/action-extension cell via published suite probe
 * (`findSheetRowProbe` + probe taps). `needsViewMore` → expandMore true.
 */
async function findExtensionRow(
  device: DeviceSession,
  entry: TargetCatalogEntry,
  timeoutMs = 15_000
): Promise<{ probeX: number; probeY: number; label?: string }> {
  const names = [
    entry.extensionName,
    entry.hostDisplayName,
    ...entry.extensionAliases,
  ].filter(Boolean);
  // Drop only ultra-generic aliases that collide with system rows.
  const searchNames = [
    ...new Set(names.filter((n) => n !== 'Share' && n !== 'Messages')),
  ];
  if (!searchNames.length) {
    searchNames.push(entry.extensionName);
  }

  const hit = await findSheetRowProbe(device, searchNames, {
    expandMore: Boolean(entry.needsViewMore),
    match: 'exact',
    blockedLabels: BLOCKED_SHEET_LABELS,
    probeTimeoutMs: timeoutMs,
  });
  return {
    probeX: hit.probeX,
    probeY: hit.probeY,
    label: hit.node.label,
  };
}

/**
 * Share/action C1 parity journey (pure DW).
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
    await waitForId(device, hostReadyTestId(entry.testIds), 12_000);
    steps.push('host-ready');

    const clearId = entry.testIds.clearPayload;
    try {
      await tapId(device, clearId, 3_000);
      steps.push('clear-payload');
    } catch {
      steps.push('clear-payload-skip');
    }

    steps.push('open-share-sheet');
    await tapId(device, entry.testIds.openShareSheet, 8_000);
    checklist.push(C1.triggerFromHost);
    await sleep(1_000);

    steps.push('find-extension-row');
    const row = await findExtensionRow(device, entry);
    steps.push(`extension=${row.label ?? '?'}`);
    checklist.push(C1.findExtensionRow);

    steps.push('tap-extension');
    await tapProbeHit(device, row);
    await sleep(1_000);

    // readyText probe is optional and expensive when AX-opaque — skip.
    steps.push('appex-ready-skip');

    const completeLabels = entry.completeButton
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    steps.push('complete-appex');
    const complete = await findNamedViaPointProbe(device, completeLabels, {
      timeoutMs: 10_000,
      yStartRatio: 0.2,
      yEndRatio: 0.85,
      stepX: 45,
      stepY: 35,
      hotspots: [
        { x: 30, y: 370 },
        { x: 210, y: 480 },
        { x: 210, y: 520 },
        { x: 210, y: 420 },
      ],
    });
    await tapProbeHit(device, complete);
    checklist.push(C1.completeAppex);
    await sleep(600);

    // Native action Process Image writes App Group but does not dismiss.
    if (id === 'native-action') {
      try {
        const close = await findNamedViaPointProbe(device, ['Close'], {
          timeoutMs: 1_500,
          yStartRatio: 0.35,
          yEndRatio: 0.85,
          allowBlocked: true,
          hotspots: [{ x: 210, y: 560 }, { x: 210, y: 500 }],
        });
        await tapProbeHit(device, close);
        steps.push('dismiss-appex');
        await sleep(400);
      } catch {
        // force-launch host below
      }
    }

    steps.push('return-host');
    await device.launchApp(entry.hostBundleId);
    await waitForId(device, hostReadyTestId(entry.testIds), 10_000);
    if (entry.testIds.refresh) {
      try {
        await tapId(device, entry.testIds.refresh, 3_000);
      } catch {
        // optional
      }
    }

    steps.push('assert-payload');
    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      entry.payloadMarker,
      12_000
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
      : /not installed|Unable to find|failed to get the task|Launch failed|point-probe/i.test(
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
