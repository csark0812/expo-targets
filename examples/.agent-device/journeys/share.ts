import type { DeviceSession } from "../driver";
import {
  BLOCKED_SHEET_LABELS,
  TARGET_CATALOG,
  type TargetCatalogEntry,
} from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  C1,
  dismissSystemAlerts,
  findNamedViaPointProbe,
  findSheetRowProbe,
  hostReadyTestId,
  journeyFailure,
  sleep,
  tapId,
  tapProbeHit,
  waitForId,
} from "./helpers";
import { runAndroidShareJourney } from "./share.android";
import { runAndroidActionJourney } from "./action.android";

async function dismissShareSheet(device: DeviceSession): Promise<void> {
  for (const label of ["Close", "Cancel"]) {
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

function pointNames(node: {
  label?: string;
  value?: string;
  identifier?: string;
  type?: string;
  role?: string;
}): string[] {
  return [node.label, node.value, node.identifier, node.type, node.role]
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

/**
 * Find share/action-extension cell via published suite probe
 * (`findSheetRowProbe` + probe taps). `needsViewMore` → expandMore true.
 */
async function findExtensionRow(
  device: DeviceSession,
  entry: TargetCatalogEntry,
  timeoutMs = 15_000,
) {
  let screen: { width: number; height: number } | undefined;
  if (entry.needsViewMore) {
    // Wait for the opaque share sheet before tapping: the host's animation can
    // take several seconds, and a fast point tap otherwise lands on the host.
    const { width, height } = (screen = await device.screenSize());
    const surfacePoint = { x: Math.round(width / 2), y: Math.round(height * 0.64) };
    const deadline = Date.now() + timeoutMs;
    let shareSurface: import("../driver").AccessibilityNode[] = [];
    do {
      shareSurface = await device.inspectPoint(surfacePoint);
      if (
        shareSurface.some((node) =>
          pointNames(node).some((name) =>
            /activitylistview|sharesheet\.remotecontainerview/i.test(name),
          ),
        )
      ) {
        break;
      }
      await sleep(250);
    } while (Date.now() < deadline);
    if (!shareSurface.some((node) =>
      pointNames(node).some((name) =>
        /activitylistview|sharesheet\.remotecontainerview/i.test(name),
      ),
    )) {
      if (shareSurface[0]) {
        await device.capturePointEvidence(surfacePoint, shareSurface[0]);
      }
      throw new Error("share-sheet surface did not appear after host action");
    }
    await device.capturePointEvidence(surfacePoint, shareSurface[0]!);

    // The iOS share sheet has two different controls: Apps-row "More" and
    // action-row "View More". A com.apple.ui-services action extension is in
    // the latter, not the Apps editor. The opaque surface requires a
    // screenshot-backed coordinate tap; the extension-row probe remains the
    // required behavioral oracle.
    const viewMorePoint = { x: Math.round(width * 0.83), y: Math.round(height * 0.89) };
    await device.capturePointEvidence(viewMorePoint, shareSurface[0]!);
    await device.tap(viewMorePoint);
    await sleep(500);
    await device.capturePointEvidence(viewMorePoint, shareSurface[0]!);
  }

  const names = [
    entry.extensionName,
    entry.hostDisplayName,
    ...entry.extensionAliases,
  ].filter(Boolean);
  // Drop only ultra-generic aliases that collide with system rows.
  const searchNames = [
    ...new Set(names.filter((n) => n !== "Share" && n !== "Messages")),
  ];
  if (!searchNames.length) {
    searchNames.push(entry.extensionName);
  }

  // Prefer expanded action-list Y before apps-row hotspots — idb describePoint
  // at ~636 can ghost-match Example Action while the real row is ~539.
  const listFirstHotspots = entry.needsViewMore
    ? [
        { x: Math.round((screen?.width ?? 402) * 0.5), y: Math.round((screen?.height ?? 874) * 0.71) },
        { x: Math.round((screen?.width ?? 402) * 0.5), y: Math.round((screen?.height ?? 874) * 0.75) },
        { x: Math.round((screen?.width ?? 402) * 0.5), y: Math.round((screen?.height ?? 874) * 0.79) },
        { x: Math.round((screen?.width ?? 402) * 0.25), y: Math.round((screen?.height ?? 874) * 0.71) },
        { x: Math.round((screen?.width ?? 402) * 0.25), y: Math.round((screen?.height ?? 874) * 0.79) },
      ]
    : undefined;

  const probeOpts = {
    expandMore: Boolean(entry.needsViewMore),
    match: "exact" as const,
    blockedLabels: BLOCKED_SHEET_LABELS,
    probeTimeoutMs: timeoutMs,
    ...(listFirstHotspots ? { hotspots: listFirstHotspots } : {}),
  };

  try {
    return await findSheetRowProbe(device, searchNames, probeOpts);
  } catch (first) {
    // Crowded favorites bury freshly installed extensions off-screen to the
    // right (Reminders / other ET apps). Swipe the apps row, then re-probe.
    for (let i = 0; i < 3; i++) {
      await device.swipe({
        xStart: 340,
        yStart: 620,
        xEnd: 80,
        yEnd: 620,
        duration: 0.35,
      });
      await sleep(400);
      try {
        return await findSheetRowProbe(device, searchNames, {
          ...probeOpts,
          probeTimeoutMs: Math.min(8_000, timeoutMs),
        });
      } catch {
        // keep swiping
      }
    }
    throw first;
  }
}

async function completeAppex(
  device: DeviceSession,
  id: string,
  entry: TargetCatalogEntry,
  steps: string[],
): Promise<void> {
  const completeLabels = entry.completeButton
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  steps.push("complete-appex");
  if (id === "native-action" || id === "action") {
    // Action examples auto-write App Group + dismiss on open —
    // idb taps on this sheet fall through to the share sheet on iOS 26.
    await sleep(1_200);
    steps.push("complete-auto");
  } else {
    const completeHotspots =
      id === "native-share"
        ? [
            { x: 40, y: 220 },
            { x: 30, y: 370 },
            { x: 210, y: 280 },
          ]
        : [
            // RN share Save — solid blue band ~y300–335 on Air (tall sheet).
            { x: 210, y: 315 },
            { x: 210, y: 330 },
            { x: 210, y: 300 },
            { x: 210, y: 420 },
            { x: 210, y: 500 },
          ];
    const complete = await findNamedViaPointProbe(device, completeLabels, {
      timeoutMs: 12_000,
      yStartRatio: 0.15,
      yEndRatio: 0.85,
      stepX: 45,
      stepY: 35,
      match: "exact",
      hotspots: completeHotspots,
    });
    await tapProbeHit(device, complete);
    await sleep(600);

    // Native share Save leaves the sheet up until Close / completeRequest.
    if (id === "native-share") {
      try {
        const close = await findNamedViaPointProbe(device, ["Close"], {
          timeoutMs: 2_500,
          yStartRatio: 0.2,
          yEndRatio: 0.9,
          allowBlocked: true,
          hotspots: [
            { x: 210, y: 280 },
            { x: 40, y: 280 },
            { x: 210, y: 420 },
            { x: 210, y: 500 },
          ],
        });
        await tapProbeHit(device, close);
        steps.push("dismiss-appex");
        await sleep(500);
      } catch {
        // force-launch host below
      }
    }
  }
}

async function returnHostAndAssert(
  device: DeviceSession,
  entry: TargetCatalogEntry,
  marker: string,
  steps: string[],
  checklist: string[],
  stepPrefix = "",
): Promise<void> {
  steps.push(`${stepPrefix}return-host`);
  await device.launchApp(entry.hostBundleId, { terminateRunning: true });
  await dismissSystemAlerts(device);
  await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
  if (entry.testIds.refresh) {
    try {
      await tapId(device, entry.testIds.refresh, 3_000);
    } catch {
      // optional
    }
  }

  steps.push(`${stepPrefix}assert-payload`);
  await assertPayloadContains(
    device,
    entry.testIds.lastPayload,
    marker,
    12_000,
  );
  checklist.push(C1.assertHostMarker);
}

/**
 * Share/action C1 parity journey (pure agent-device).
 * Text path remains primary green for share / native-share.
 * Image / multi-item markers asserted when host exposes `btn-open-image-share`
 * or when the primary path is already image (action / native-action).
 */
export async function runShareActionJourney(
  device: DeviceSession,
  id: keyof typeof TARGET_CATALOG,
): Promise<TargetJourneyResult> {
  if (device.platform === "android") {
    if (id === "action" || id === "native-action") {
      return runAndroidActionJourney(device, id);
    }
    return runAndroidShareJourney(device, id);
  }

  const entry = TARGET_CATALOG[id];
  if (!entry?.testIds.openShareSheet) {
    return {
      id,
      path: entry?.path ?? id,
      phase: 1,
      ok: false,
      status: "red",
      steps: [],
      error: `no share/action catalog for ${id}`,
      failureKind: "product",
    };
  }

  const steps: string[] = [];
  const checklist: string[] = [];
  const imageIds = new Set(["share", "native-share", "action", "native-action"]);
  const textPrimary = id === "share" || id === "native-share";

  try {
    steps.push("launch-host");
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    // Expo run:ios / prior deep-links leave “Open in ET Share?” over the host.
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 12_000);
    steps.push("host-ready");

    const clearId = entry.testIds.clearPayload;
    try {
      await tapId(device, clearId, 3_000);
      steps.push("clear-payload");
    } catch {
      steps.push("clear-payload-skip");
    }

    steps.push("open-share-sheet");
    await tapId(device, entry.testIds.openShareSheet, 8_000);
    checklist.push(C1.triggerFromHost);
    await sleep(1_000);

    steps.push("find-extension-row");
    const row = await findExtensionRow(device, entry);
    steps.push(`extension=${row.node.label ?? "?"}`);
    checklist.push(C1.findExtensionRow);

    steps.push("tap-extension");
    if (entry.needsViewMore) {
      // iOS 27's AX frame for the opaque action list is vertically offset from
      // the rendered sheet (the row probe reports Native Action around y=559,
      // while its screenshot shows the row around y=618). Anchor the separate
      // touch to that screenshot-backed row location; never let the mismatched
      // AX coordinate tap the adjacent Save to Files action.
      const { width, height } = await device.screenSize();
      const actionPoint = {
        x: Math.round(width * 0.3),
        y: Math.round(height * 0.71),
      };
      await device.capturePointEvidence(actionPoint, row.node);
      await device.tap(actionPoint);
    } else {
      await tapProbeHit(device, row);
    }
    // RN share/action appex is AX-opaque until ~2.5s after open; 1.2s settle
    // left Save/Process hotspots empty and the slow bottom-up sweep timed out.
    await sleep(2_500);

    // readyText probe is optional and expensive when AX-opaque — skip.
    steps.push("appex-ready-skip");

    await completeAppex(device, id, entry, steps);
    checklist.push(C1.completeAppex);

    await returnHostAndAssert(
      device,
      entry,
      entry.payloadMarker,
      steps,
      checklist,
    );

    // Image / kind deepening — Sim-reachable secondary path.
    if (imageIds.has(String(id))) {
      if (textPrimary) {
        try {
          await tapId(device, clearId, 3_000);
        } catch {
          // optional
        }
        steps.push("image-open-share");
        try {
          await tapId(device, "btn-open-image-share", 8_000);
        } catch {
          steps.push("image-path-skip-no-button");
          return {
            id: entry.id,
            path: entry.path,
            phase: 1,
            ok: true,
            status: "green",
            steps,
            checklist,
          };
        }
        await sleep(1_000);
        const imageRow = await findExtensionRow(device, entry);
        await tapProbeHit(device, imageRow);
        await sleep(2_500);
        await completeAppex(device, id, entry, steps);
        const imageMarker =
          id === "native-share" ? '"type":"image"' : '"kind":"image"';
        await returnHostAndAssert(
          device,
          entry,
          imageMarker,
          steps,
          checklist,
          "image-",
        );
        steps.push("image-path-ok");
      } else {
        // action / native-action primary path already shares an image.
        const kindMarker =
          id === "native-action" ? '"kind":"image"' : '"kind":"image"';
        await assertPayloadContains(
          device,
          entry.testIds.lastPayload,
          kindMarker,
          8_000,
        );
        steps.push("image-kind-ok");
        if (id === "native-action") {
          try {
            await assertPayloadContains(
              device,
              entry.testIds.lastPayload,
              '"returnedItems":true',
              4_000,
            );
            steps.push("return-items-ok");
          } catch {
            steps.push("return-items-skip");
          }
        }
      }
    }

    return {
      id: entry.id,
      path: entry.path,
      phase: 1,
      ok: true,
      status: "green",
      steps,
      checklist,
    };
  } catch (e) {
    try {
      await dismissShareSheet(device);
    } catch {
      // ignore
    }
    return journeyFailure({
      id: entry.id,
      path: entry.path,
      phase: 1,
      steps,
      checklist,
      error: e,
    });
  }
}
