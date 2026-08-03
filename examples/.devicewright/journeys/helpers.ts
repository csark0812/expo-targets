/**
 * Consumer journey helpers — thin wraps over `@csark0812/devicewright/suite`.
 *
 * Share-sheet rows: prefer `findSheetRowProbe` + `tapProbeHit` (iOS 26).
 * Open MSMessages RN sheets: use `messages-sheet.ts` (describePoint ladder;
 * accessibilityTree omits extension chrome — see that module’s invariants).
 */
import type { AccessibilityNode, DeviceSession } from "@csark0812/devicewright";
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
} from "@csark0812/devicewright/suite";
import { BLOCKED_SHEET_LABELS } from "../catalog";

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
  names: string[],
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
  options: FindNamedViaPointProbeOptions = {},
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
  hit: PointProbeHit | Pick<PointProbeHit, "probeX" | "probeY">,
): Promise<void> {
  return tapProbeHitSuite(device, hit);
}

export async function waitForNamed(
  device: DeviceSession,
  names: string[],
  timeoutMsOrOpts: number | { timeoutMs?: number } = 10_000,
): Promise<AccessibilityNode> {
  const timeoutMs =
    typeof timeoutMsOrOpts === "number"
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
  timeoutMs = 12_000,
): Promise<AccessibilityNode> {
  return waitForIdSuite(device, id, timeoutMs);
}

export async function tapId(
  device: DeviceSession,
  id: string,
  timeoutMs = 10_000,
): Promise<void> {
  return tapIdSuite(device, id, timeoutMs);
}

export function hostReadyTestId(testIds: {
  screenRoot: string;
  openShareSheet?: string;
  clearPayload?: string;
  packCatalog?: string;
}): string {
  // Prefer status-/screen roots over clearPayload — end/clear buttons may sit
  // behind permission sheets and are the wrong ready signal for LA/Trick.
  if (
    testIds.screenRoot.startsWith("status-") ||
    testIds.screenRoot === "screen-root"
  ) {
    return testIds.openShareSheet ?? testIds.screenRoot;
  }
  return testIds.openShareSheet ?? testIds.clearPayload ?? testIds.screenRoot;
}

/**
 * Dismiss common iOS “Open in …?” / permission alerts.
 * Prefer Cancel via accessibility-tree frames (resolution-independent); fall back
 * to point-probe hotspots when AX omits the button frame.
 */
export async function dismissSystemAlerts(
  device: DeviceSession,
  timeoutMs = 2_000,
  attempts = 4,
): Promise<void> {
  const dismissLabels = [
    "Cancel",
    "Close",
    "Not Now",
    "Don't Allow",
    "Don’t Allow",
  ];
  for (let i = 0; i < attempts; i++) {
    const tree = await device.accessibilityTree();
    const flat = flattenLabels(tree);
    // Paste/Autofill edit menu — dismiss by tapping away, never Paste itself.
    const hasEditMenu = flat.some(
      (l) =>
        /^Paste$/i.test(l.trim()) ||
        /^Auto-?Fill$/i.test(l.trim()) ||
        /^Select All$/i.test(l.trim()),
    );
    if (hasEditMenu) {
      await device.tap({ x: 210, y: 180 });
      await sleep(400);
      continue;
    }
    const hasSheet = flat.some(
      (l) =>
        /open in .+\?/i.test(l) ||
        /Would Like to Send You Notifications/i.test(l) ||
        /Enable Dictation/i.test(l) ||
        dismissLabels.some((d) => l.toLowerCase() === d.toLowerCase()),
    );
    if (!hasSheet) {
      return;
    }

    let tapped = false;
    for (const name of dismissLabels) {
      for (const node of tree) {
        const label = (node.label ?? "").trim();
        if (label.toLowerCase() !== name.toLowerCase()) continue;
        const f = node.frame;
        if (!f || f.width < 8 || f.height < 8) continue;
        await device.tap({
          x: Math.round(f.x + f.width / 2),
          y: Math.round(f.y + f.height / 2),
        });
        await sleep(400);
        tapped = true;
        break;
      }
      if (tapped) break;
    }
    if (tapped) continue;

    try {
      const hit = await findNamedViaPointProbe(device, dismissLabels, {
        timeoutMs,
        yStartRatio: 0.35,
        yEndRatio: 0.75,
        stepX: 60,
        stepY: 50,
        allowBlocked: true,
        match: "exact",
        hotspots: [
          { x: 136, y: 496 },
          { x: 80, y: 490 },
          { x: 120, y: 520 },
          { x: 260, y: 496 },
          { x: 210, y: 500 },
        ],
      });
      await tapProbeHit(device, hit);
      await sleep(350);
    } catch {
      return;
    }
  }
}

/** Poll host labels for a marker (payload text often has no AXUniqueId). */
export async function assertPayloadContains(
  device: DeviceSession,
  _payloadId: string,
  marker: string,
  timeoutMs = 12_000,
): Promise<void> {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < timeoutMs) {
    const tree = await device.accessibilityTree();
    const labels = flattenLabels(tree);
    last = labels.join(" | ");
    if (labels.some((l) => l.includes(marker))) return;
    await sleep(300);
  }
  throw new Error(
    `host missing marker ${JSON.stringify(marker)}; labels=${last.slice(0, 400)}`,
  );
}

export const C1 = {
  triggerFromHost: "c1-1-trigger-from-host",
  findExtensionRow: "c1-2-find-extension-row",
  completeAppex: "c1-3-complete-appex",
  assertHostMarker: "c1-4-assert-host-marker",
  releasePreflight: "c1-5-release-preflight",
  matrixFailFast: "c1-6-matrix-fail-fast",
} as const;
