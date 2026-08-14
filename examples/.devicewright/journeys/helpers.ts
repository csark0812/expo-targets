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

/** Android post-tap settle — shorter than legacy 700–1200ms pads (iOS-parity). */
export const ANDROID_POST_TAP_MS = 350;
/** Settings / activity transition settle on Android. */
export const ANDROID_SETTINGS_SETTLE_MS = 500;

/**
 * Label tap for Android journeys: capped waitForNamed → point-probe, short settle.
 * Prefer this over per-file tapNamed + sleep(700).
 */
export async function tapNamedAndroid(
  device: DeviceSession,
  names: string[],
  timeoutMs = 4_000,
): Promise<boolean> {
  try {
    await tapCenter(device, await waitForNamed(device, names, timeoutMs));
    await sleep(ANDROID_POST_TAP_MS);
    return true;
  } catch {
    try {
      const hit = await findNamedViaPointProbe(device, names, {
        timeoutMs: Math.min(timeoutMs, 3_500),
        match: "includes",
        yStartRatio: 0.05,
        yEndRatio: 0.95,
      });
      await tapProbeHit(device, hit);
      await sleep(ANDROID_POST_TAP_MS);
      return true;
    } catch {
      return false;
    }
  }
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

function isSpringBoardSpotlight(labels: string[]): boolean {
  const joined = labels.join(" | ");
  // iOS 26 home still exposes dewey-search-field for the Search pill — that is
  // not Spotlight. Real Spotlight has Siri Suggestions / a Spotlight title.
  return (
    /Siri Suggestions/i.test(joined) ||
    /(^|\|)\s*Spotlight\s*(\||$)/i.test(joined)
  );
}

/**
 * iOS 26: HOME from an app can land on Spotlight instead of the icon grid.
 * The home Search pill is not Spotlight — do not swipe it away.
 */
export async function dismissSpringBoardSpotlight(
  device: DeviceSession,
): Promise<void> {
  for (let i = 0; i < 3; i++) {
    if (!isSpringBoardSpotlight(flattenLabels(await device.accessibilityTree()))) {
      return;
    }
    await device.pressButton({ button: "HOME" }).catch(() => undefined);
    await sleep(400);
    if (!isSpringBoardSpotlight(flattenLabels(await device.accessibilityTree()))) {
      return;
    }
    try {
      const cancel = await waitForNamed(device, ["Cancel"], { timeoutMs: 800 });
      await tapCenter(device, cancel);
      await sleep(400);
      continue;
    } catch {
      /* swipe up to close Spotlight, not down (down opens search) */
    }
    await device.swipe({
      xStart: 200,
      yStart: 720,
      xEnd: 200,
      yEnd: 140,
      duration: 0.28,
    });
    await sleep(400);
  }
}

/**
 * SpringBoard app icons are often missing from the AX tree on iOS 26 (only the
 * Search pill is listed). Probe the grid + dock and synthesize a tap frame.
 */
export async function findSpringBoardHostIcon(
  device: DeviceSession,
  names: string[],
): Promise<AccessibilityNode> {
  await dismissSpringBoardSpotlight(device);
  for (let page = 0; page < 4; page++) {
    try {
      const hit = await findNamedViaPointProbe(device, names, {
        timeoutMs: 3_500,
        match: "includes",
        yStartRatio: 0.05,
        yEndRatio: 0.99,
        hotspots: [
          { x: 48, y: 820 },
          { x: 72, y: 860 },
          { x: 96, y: 880 },
          { x: 120, y: 840 },
          { x: 200, y: 420 },
        ],
      });
      const node = hit.node;
      const frame = node.frame;
      if (!frame || frame.width < 8 || frame.height < 8) {
        node.frame = {
          x: hit.probeX - 22,
          y: hit.probeY - 22,
          width: 44,
          height: 44,
        };
      }
      return node;
    } catch {
      await device.swipe({
        xStart: 360,
        yStart: 400,
        xEnd: 60,
        yEnd: 400,
        duration: 0.3,
      });
      await sleep(500);
    }
  }
  const tree = await device.accessibilityTree();
  throw new Error(
    `host icon not on SpringBoard; labels=${flattenLabels(tree).slice(0, 60).join(", ")}`,
  );
}

/**
 * Visible text for an a11y node. On Android, long JSON in `text=` often leaves
 * `label`/`value` empty while the uiautomator `raw` still carries `text='...'`.
 */
export function nodeVisibleText(node: AccessibilityNode | undefined): string {
  if (!node) return "";
  const direct = String(
    node.label ??
      (node as { value?: string }).value ??
      (node as { title?: string }).title ??
      "",
  ).trim();
  if (direct) return direct;
  const raw = (node as { raw?: unknown }).raw;
  if (typeof raw !== "string" || !raw.includes("text=")) return "";
  // Prefer single-quoted attrs (JSON payloads use double quotes inside).
  const single = /\btext='([^']*)'/.exec(raw);
  if (single?.[1]) return single[1];
  const dbl = /\btext="([^"]*)"/.exec(raw);
  return dbl?.[1] ?? "";
}

/** Poll host labels for a marker (payload text often has no AXUniqueId). */
export async function assertPayloadContains(
  device: DeviceSession,
  payloadId: string,
  marker: string,
  timeoutMs = 12_000,
): Promise<void> {
  const start = Date.now();
  let last = "";
  while (Date.now() - start < timeoutMs) {
    const tree = await device.accessibilityTree();
    const hit = tree.find((n) => {
      const id = String(
        (n as { identifier?: string; id?: string }).identifier ??
          (n as { id?: string }).id ??
          "",
      );
      return id === payloadId || id.endsWith(`/${payloadId}`) || id.endsWith(`:id/${payloadId}`);
    });
    const text = nodeVisibleText(hit);
    const texts = tree.map((n) => nodeVisibleText(n)).filter(Boolean);
    last = text || texts.join(" | ") || flattenLabels(tree).join(" | ");
    if (text.includes(marker)) return;
    // JSON payload often surfaces as AXValue / AXLabel without matching id — require
    // curly braces so host titles cannot false-green.
    if (texts.some((l) => l.includes("{") && l.includes(marker))) {
      return;
    }
    if (
      flattenLabels(tree).some(
        (l) => l.includes("{") && l.includes(marker),
      )
    ) {
      return;
    }
    await sleep(300);
  }
  throw new Error(
    `host payload ${JSON.stringify(payloadId)} missing marker ${JSON.stringify(marker)}; last=${last.slice(0, 400)}`,
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
