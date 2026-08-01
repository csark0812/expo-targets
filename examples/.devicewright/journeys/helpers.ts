/**
 * Consumer journey helpers — thin wraps over `@csark0812/devicewright/suite`.
 *
 * Share-sheet rows: prefer `findSheetRowProbe` + `tapProbeHit` (iOS 26).
 * Messages/stickers keep caller-owned hotspots on the generic primitive.
 */
import type { AccessibilityNode, DeviceSession } from '@csark0812/devicewright';
import {
  defaultIsChrome,
  findNamedNode as findNamedNodeSuite,
  findNamedViaPointProbe as findNamedViaPointProbeSuite,
  findSheetRow,
  findSheetRowProbe,
  flattenLabels,
  iosShareSheetHotspots,
  sleep,
  tapCenter,
  tapId as tapIdSuite,
  tapProbeHit as tapProbeHitSuite,
  waitForId as waitForIdSuite,
  waitForNamed as waitForNamedSuite,
  type FindNamedViaPointProbeOptions,
  type PointProbeHit,
} from '@csark0812/devicewright/suite';
import { BLOCKED_SHEET_LABELS } from '../catalog';

export {
  defaultIsChrome,
  findSheetRow,
  findSheetRowProbe,
  flattenLabels,
  iosShareSheetHotspots,
  sleep,
  tapCenter,
};

export type { PointProbeHit };

export function findNamedNode(
  nodes: AccessibilityNode[],
  names: string[]
): AccessibilityNode | undefined {
  return findNamedNodeSuite(nodes, names, BLOCKED_SHEET_LABELS);
}

/** @deprecated Prefer `defaultIsChrome` from suite. */
export function isSheetChromeNode(node: AccessibilityNode): boolean {
  return defaultIsChrome(node);
}

/**
 * Generic point probe — wraps suite with consumer blocked labels.
 * Returns describePoint coords only (never AXFrame center).
 */
export async function findNamedViaPointProbe(
  device: DeviceSession,
  names: string[],
  options: FindNamedViaPointProbeOptions = {}
): Promise<PointProbeHit> {
  return findNamedViaPointProbeSuite(device, names, {
    ...options,
    blockedLabels: options.blockedLabels ?? BLOCKED_SHEET_LABELS,
    isChrome: options.isChrome ?? defaultIsChrome,
  });
}

/**
 * Tap a point-probe hit at describePoint coords — never AXFrame center.
 * On iOS 26 share sheets AXFrame is often shifted (Example Action frame
 * overlaps Save to Files); clamping into the frame opens the wrong row.
 */
export async function tapProbeHit(
  device: DeviceSession,
  hit: PointProbeHit | Pick<PointProbeHit, 'probeX' | 'probeY'>
): Promise<void> {
  return tapProbeHitSuite(device, hit);
}

export async function waitForNamed(
  device: DeviceSession,
  names: string[],
  timeoutMsOrOpts: number | { timeoutMs?: number } = 10_000
): Promise<AccessibilityNode> {
  const timeoutMs =
    typeof timeoutMsOrOpts === 'number'
      ? timeoutMsOrOpts
      : (timeoutMsOrOpts.timeoutMs ?? 10_000);
  try {
    return await waitForNamedSuite(device, names, {
      timeoutMs: Math.min(timeoutMs, 2_000),
      blockedLabels: BLOCKED_SHEET_LABELS,
    });
  } catch {
    const hit = await findNamedViaPointProbe(device, names, {
      timeoutMs: Math.min(timeoutMs, 6_000),
    });
    return hit.node;
  }
}

export async function waitForId(
  device: DeviceSession,
  id: string,
  timeoutMs = 12_000
): Promise<AccessibilityNode> {
  return waitForIdSuite(device, id, timeoutMs);
}

export async function tapId(
  device: DeviceSession,
  id: string,
  timeoutMs = 10_000
): Promise<void> {
  return tapIdSuite(device, id, timeoutMs);
}

export function hostReadyTestId(testIds: {
  screenRoot: string;
  openShareSheet?: string;
  clearPayload?: string;
  packCatalog?: string;
}): string {
  // Prefer controls that expose AXUniqueId. screen-root / status-* Text often
  // only appear as labels (same iOS 26 AX gap as last-payload).
  return (
    testIds.openShareSheet ??
    testIds.clearPayload ??
    testIds.screenRoot
  );
}

/** Dismiss common iOS “Open in …?” / permission alerts — short probe budget. */
export async function dismissSystemAlerts(
  device: DeviceSession,
  timeoutMs = 1_500
): Promise<void> {
  const labels = ['Cancel', 'Close', 'Not Now', 'Don’t Allow', "Don't Allow"];
  try {
    const hit = await findNamedViaPointProbe(device, labels, {
      timeoutMs,
      yStartRatio: 0.35,
      yEndRatio: 0.75,
      stepX: 60,
      stepY: 50,
      allowBlocked: true,
      match: 'exact',
      // “Open in …?” Cancel sits left-of-center (~136,496 on Air).
      hotspots: [
        { x: 136, y: 496 },
        { x: 80, y: 490 },
        { x: 120, y: 520 },
        { x: 210, y: 500 },
      ],
    });
    await tapProbeHit(device, hit);
    await sleep(300);
  } catch {
    // no alert
  }
}

/** Poll host labels for a marker (payload text often has no AXUniqueId). */
export async function assertPayloadContains(
  device: DeviceSession,
  _payloadId: string,
  marker: string,
  timeoutMs = 12_000
): Promise<void> {
  const start = Date.now();
  let last = '';
  while (Date.now() - start < timeoutMs) {
    const tree = await device.accessibilityTree();
    const labels = flattenLabels(tree);
    last = labels.join(' | ');
    if (labels.some((l) => l.includes(marker))) return;
    await sleep(300);
  }
  throw new Error(
    `host missing marker ${JSON.stringify(marker)}; labels=${last.slice(0, 400)}`
  );
}

export const C1 = {
  triggerFromHost: 'c1-1-trigger-from-host',
  findExtensionRow: 'c1-2-find-extension-row',
  completeAppex: 'c1-3-complete-appex',
  assertHostMarker: 'c1-4-assert-host-marker',
  releasePreflight: 'c1-5-release-preflight',
  matrixFailFast: 'c1-6-matrix-fail-fast',
} as const;
