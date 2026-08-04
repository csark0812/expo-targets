/**
 * MSMessages extension sheet helpers — DeviceWright MCP findings locked in.
 *
 * Invariants (iOS 26 Messages + RN MSMessagesAppViewController):
 * 1. While the extension sheet is open, `accessibilityTree` typically only
 *    exposes host chrome: "Messages" + ghost "Activate to dismiss pop-up window."
 *    RN controls (Expand / Send template / style:*) are describePoint-only.
 * 2. Never dismiss that ghost (or blind-tap / tap "Messages") — it dismisses
 *    the sheet. Real alerts only: Not Now / Continue / OK / Dismiss.
 * 3. Point-probe tries hotspots before its bottom-up sweep. A dense mid-column
 *    ladder finds sheet controls before timeout burns on empty bottom Y.
 * 4. describePoint on the exact top edge of a ~38px button often returns empty;
 *    ladder step ≤16 keeps hits near button centers as layout shifts
 *    (compact sheet, session-id row).
 * 5. Host `screen-root` often lacks AXUniqueId — wait on the "ready" label.
 */
import type { DeviceSession } from "@csark0812/devicewright";
import {
  findNamedViaPointProbe,
  sleep,
  tapProbeHit,
  waitForId,
  waitForNamed,
  type PointProbeHit,
} from "./helpers";

/** Dense vertical describePoint ladder (hotspots run before sweep). */
export function columnHotspots(
  x: number,
  yStart: number,
  yEnd: number,
  step = 16,
): { x: number; y: number }[] {
  const hs: { x: number; y: number }[] = [];
  const lo = Math.min(yStart, yEnd);
  const hi = Math.max(yStart, yEnd);
  for (let y = lo; y <= hi; y += step) {
    hs.push({ x, y });
  }
  return hs;
}

/** Mid-column ladder covering expanded + compact MSMessages sheet bands. */
export function messagesSheetControlHotspots(): { x: number; y: number }[] {
  return [
    ...columnHotspots(210, 360, 824, 16),
    ...columnHotspots(100, 400, 784, 24),
  ];
}

/** Left-biased ladder for style:/Participants text. */
export function messagesSheetStyleHotspots(): { x: number; y: number }[] {
  return [
    ...columnHotspots(80, 360, 700, 14),
    ...columnHotspots(120, 360, 700, 20),
  ];
}

/** Real composer/system alerts only — never the sheet AX dismiss ghost. */
export async function dismissMessagesComposerAlerts(
  device: DeviceSession,
): Promise<void> {
  for (const label of ["Not Now", "Continue", "OK", "Dismiss"]) {
    try {
      const hit = await findNamedViaPointProbe(device, [label], {
        timeoutMs: 900,
        yStartRatio: 0.15,
        yEndRatio: 0.95,
        match: "exact",
        hotspots: columnHotspots(210, 400, 700, 40),
      });
      await tapProbeHit(device, hit);
      await sleep(350);
    } catch {
      // optional
    }
  }
}

/**
 * Find a control inside the open MSMessages RN sheet via describePoint.
 * Do not use accessibilityTree for readiness or asserts while the sheet is up.
 */
export async function probeMessagesSheetControl(
  device: DeviceSession,
  names: string[],
  options: {
    timeoutMs?: number;
    match?: "exact" | "includes";
    hotspots?: { x: number; y: number }[];
  } = {},
): Promise<PointProbeHit> {
  return findNamedViaPointProbe(device, names, {
    timeoutMs: options.timeoutMs ?? 10_000,
    // Narrow sweep band so residual sweep time stays in the sheet, not chrome.
    yStartRatio: 0.35,
    yEndRatio: 0.92,
    stepX: 50,
    stepY: 20,
    match: options.match ?? "includes",
    hotspots: options.hotspots ?? messagesSheetControlHotspots(),
  });
}

export async function tapMessagesSheetControl(
  device: DeviceSession,
  names: string[],
  options?: Parameters<typeof probeMessagesSheetControl>[2],
): Promise<PointProbeHit> {
  const hit = await probeMessagesSheetControl(device, names, options);
  await tapProbeHit(device, hit);
  await sleep(700);
  return hit;
}

export async function waitForMessagesSheetReady(
  device: DeviceSession,
): Promise<void> {
  const markers = [
    "Send template",
    "btn-send-template",
    "Send session",
    "btn-send-session",
    "Expand",
    "btn-expand",
  ];
  for (let i = 0; i < 8; i++) {
    try {
      await probeMessagesSheetControl(device, markers, { timeoutMs: 2_500 });
      return;
    } catch {
      // Compact / loading — nudge sheet toward expanded without dismissing.
      await device.swipe({
        xStart: 210,
        yStart: 780,
        xEnd: 210,
        yEnd: 220,
        duration: 0.45,
      });
      await sleep(800);
    }
  }
  throw new Error(
    "messages extension UI missing after open (describePoint; AX tree omits RN sheet)",
  );
}

export async function assertMessagesPresentationStyle(
  device: DeviceSession,
  style: "expanded" | "compact",
): Promise<void> {
  await probeMessagesSheetControl(device, [`style:${style}`], {
    timeoutMs: 8_000,
    match: "exact",
    hotspots: messagesSheetStyleHotspots(),
  });
}

/** iOS 26 host: prefer visible "ready" label over screen-root AX id. */
export async function waitForMessagesHostReady(
  device: DeviceSession,
): Promise<void> {
  try {
    await waitForNamed(device, ["ready"], 10_000);
  } catch {
    await waitForId(device, "btn-clear-payload", 8_000);
  }
}
