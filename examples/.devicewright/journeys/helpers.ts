/**
 * Consumer journey helpers — DW suite a11y + C1 ids.
 *
 * iOS 26 share sheet / appex: `accessibilityTree()` (describe-all) often only
 * returns Application + dismiss chrome. Cells and Save live in AX but are only
 * reachable via `describePoint` — use point probes for those surfaces.
 *
 * Probe cost dominates matrix time: prefer tree → hotspots → one coarse sweep
 * → one fine sweep. Never loop a dense grid until a long timeout.
 */
import type { AccessibilityNode, DeviceSession } from '@csark0812/devicewright';
import {
  findNamedNode as findNamedNodeSuite,
  findSheetRow,
  flattenLabels,
  sleep,
  tapCenter,
  tapId as tapIdSuite,
  waitForId as waitForIdSuite,
  waitForNamed as waitForNamedSuite,
} from '@csark0812/devicewright/suite';
import { BLOCKED_SHEET_LABELS } from '../catalog';

export { findSheetRow, flattenLabels, sleep, tapCenter };

export function findNamedNode(
  nodes: AccessibilityNode[],
  names: string[]
): AccessibilityNode | undefined {
  return findNamedNodeSuite(nodes, names, BLOCKED_SHEET_LABELS);
}

function nodeNameHit(
  node: AccessibilityNode,
  names: string[],
  match: 'includes' | 'exact' = 'includes'
): boolean {
  const label = (node.label ?? '').trim();
  const id = (node.identifier ?? '').trim();
  if (match === 'exact') {
    return names.some((n) => n === label || n === id);
  }
  return names.some((n) => n === label || n === id || label.includes(n));
}

/** Skip host Application / full-screen dismiss chrome that false-match sheet rows. */
export function isSheetChromeNode(node: AccessibilityNode): boolean {
  if (node.type === 'Application') return true;
  if (node.identifier === 'PopoverDismissRegion') return true;
  const f = node.frame;
  if (f && f.width >= 300 && f.height >= 700) return true;
  return false;
}

function walkNamed(
  nodes: AccessibilityNode[],
  names: string[],
  match: 'includes' | 'exact',
  allowBlocked: boolean
): AccessibilityNode | undefined {
  for (const n of nodes) {
    if (
      !isSheetChromeNode(n) &&
      (allowBlocked || !BLOCKED_SHEET_LABELS.has(n.label ?? '')) &&
      nodeNameHit(n, names, match) &&
      n.frame
    ) {
      return n;
    }
    if (n.children?.length) {
      const c = walkNamed(n.children, names, match, allowBlocked);
      if (c) return c;
    }
  }
  return undefined;
}

/**
 * Sweep describePoint until a name matches.
 * Returns node + probe coords (AXFrame can disagree with tap space — tap probeX/Y).
 */
export async function findNamedViaPointProbe(
  device: DeviceSession,
  names: string[],
  options: {
    timeoutMs?: number;
    yStartRatio?: number;
    yEndRatio?: number;
    stepX?: number;
    stepY?: number;
    allowBlocked?: boolean;
    match?: 'includes' | 'exact';
    hotspots?: Array<{ x: number; y: number }>;
  } = {}
): Promise<{ node: AccessibilityNode; probeX: number; probeY: number }> {
  const timeoutMs = options.timeoutMs ?? 8_000;
  const yStartRatio = options.yStartRatio ?? 0.45;
  const yEndRatio = options.yEndRatio ?? 0.95;
  const allowBlocked = options.allowBlocked ?? false;
  const match = options.match ?? 'includes';
  const start = Date.now();

  let width = 420;
  let height = 912;
  try {
    const tree = await device.accessibilityTree();
    const app = tree.find((n) => n.type === 'Application' && n.frame);
    if (app?.frame) {
      width = Math.max(1, Math.round(app.frame.width));
      height = Math.max(1, Math.round(app.frame.height));
    }
    const fromTree = walkNamed(tree, names, match, allowBlocked);
    if (fromTree?.frame) {
      return {
        node: fromTree,
        probeX: Math.round(fromTree.frame.x + fromTree.frame.width / 2),
        probeY: Math.round(fromTree.frame.y + fromTree.frame.height / 2),
      };
    }
  } catch {
    // keep defaults
  }

  const tryPoint = async (
    x: number,
    y: number
  ): Promise<{ node: AccessibilityNode; probeX: number; probeY: number } | undefined> => {
    let node: AccessibilityNode | null = null;
    try {
      node = await device.describePoint(x, y);
    } catch {
      return undefined;
    }
    if (!node || isSheetChromeNode(node)) return undefined;
    if (!allowBlocked && BLOCKED_SHEET_LABELS.has(node.label ?? '')) return undefined;
    if (!nodeNameHit(node, names, match)) return undefined;
    return { node, probeX: x, probeY: y };
  };

  for (const hs of options.hotspots ?? []) {
    if (Date.now() - start >= timeoutMs) break;
    const hit = await tryPoint(hs.x, hs.y);
    if (hit) return hit;
  }

  const sweep = async (
    stepX: number,
    stepY: number
  ): Promise<{ node: AccessibilityNode; probeX: number; probeY: number } | undefined> => {
    const y0 = Math.round(height * yStartRatio);
    const y1 = Math.round(height * yEndRatio);
    // Share sheets live in the lower half — scan bottom → top so we hit rows sooner.
    const ys: number[] = [];
    for (let y = y1; y >= y0; y -= stepY) ys.push(y);
    const midX = Math.round(width / 2);
    for (const y of ys) {
      if (Date.now() - start >= timeoutMs) return undefined;
      // Prefer mid / known columns before a full row sweep.
      const xs = [
        midX,
        Math.round(width * 0.75),
        Math.round(width * 0.25),
        ...Array.from(
          { length: Math.ceil((width - 16) / stepX) },
          (_, i) => Math.max(8, Math.floor(stepX / 4)) + i * stepX
        ),
      ];
      const seenX = new Set<number>();
      for (const x of xs) {
        if (x < 8 || x > width - 8 || seenX.has(x)) continue;
        seenX.add(x);
        if (Date.now() - start >= timeoutMs) return undefined;
        const hit = await tryPoint(x, y);
        if (hit) return hit;
      }
    }
    return undefined;
  };

  const coarseX = options.stepX ?? 55;
  const coarseY = options.stepY ?? 45;
  const coarse = await sweep(coarseX, coarseY);
  if (coarse) return coarse;

  if (Date.now() - start < timeoutMs) {
    const fine = await sweep(
      Math.max(28, Math.floor(coarseX * 0.55)),
      Math.max(22, Math.floor(coarseY * 0.55))
    );
    if (fine) return fine;
  }

  throw new Error(
    `point-probe timeout for [${names.join(' | ')}] (screen ${width}x${height})`
  );
}

/** Expand share-sheet action list. Hotspot first — grid only if needed. */
export async function expandShareSheet(device: DeviceSession): Promise<string[]> {
  const tapped: string[] = [];
  const hotspot = { x: 340, y: 775 };
  try {
    const at = await device.describePoint(hotspot.x, hotspot.y);
    if ((at?.label ?? '').trim() === 'View More') {
      await device.tap(hotspot);
      tapped.push('View More@hotspot');
      await sleep(700);
      return tapped;
    }
  } catch {
    // probe below
  }
  try {
    const hit = await findNamedViaPointProbe(device, ['View More'], {
      timeoutMs: 2_500,
      yStartRatio: 0.7,
      yEndRatio: 0.98,
      stepX: 40,
      stepY: 30,
      match: 'exact',
      hotspots: [hotspot, { x: 360, y: 800 }, { x: 310, y: 790 }],
    });
    await tapProbeHit(device, hit);
    tapped.push('View More');
    await sleep(700);
  } catch {
    // already expanded or not an action sheet
  }
  return tapped;
}

export async function tapProbeHit(
  device: DeviceSession,
  hit: { probeX: number; probeY: number }
): Promise<void> {
  await device.tap({ x: hit.probeX, y: hit.probeY });
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

/** Dismiss common iOS “Open in …?” sheets — tree-first, short probe budget. */
export async function dismissSystemAlerts(
  device: DeviceSession,
  timeoutMs = 1_500
): Promise<void> {
  const labels = ['Cancel', 'Close', 'Not Now', 'Don’t Allow', "Don't Allow"];
  try {
    const tree = await device.accessibilityTree();
    const hit = walkNamed(tree, labels, 'exact', true);
    if (hit?.frame) {
      await tapCenter(device, hit);
      await sleep(300);
      return;
    }
  } catch {
    // probe
  }
  try {
    const hit = await findNamedViaPointProbe(device, labels, {
      timeoutMs,
      yStartRatio: 0.35,
      yEndRatio: 0.75,
      stepX: 60,
      stepY: 50,
      allowBlocked: true,
      match: 'exact',
      hotspots: [
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

/** Poll host labels for a marker (payload Text often has no AXUniqueId). */
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
