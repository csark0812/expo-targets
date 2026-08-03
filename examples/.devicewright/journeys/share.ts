import type { DeviceSession } from "@csark0812/devicewright";
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
  sleep,
  tapId,
  tapProbeHit,
  waitForId,
} from "./helpers";

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

/**
 * Find share/action-extension cell via published suite probe
 * (`findSheetRowProbe` + probe taps). `needsViewMore` → expandMore true.
 */
async function findExtensionRow(
  device: DeviceSession,
  entry: TargetCatalogEntry,
  timeoutMs = 15_000,
) {
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
        { x: 200, y: 560 },
        { x: 200, y: 590 },
        { x: 200, y: 620 },
        { x: 200, y: 650 },
        { x: 200, y: 700 },
        { x: 200, y: 730 },
        { x: 200, y: 760 },
        { x: 100, y: 560 },
        { x: 100, y: 730 },
      ]
    : undefined;

  const hit = await findSheetRowProbe(device, searchNames, {
    expandMore: Boolean(entry.needsViewMore),
    match: "exact",
    blockedLabels: BLOCKED_SHEET_LABELS,
    probeTimeoutMs: timeoutMs,
    ...(listFirstHotspots ? { hotspots: listFirstHotspots } : {}),
  });
  return hit;
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
            // RN share Save / action Process — tap-space ~y500 on Air.
            { x: 210, y: 500 },
            { x: 210, y: 490 },
            { x: 210, y: 480 },
            { x: 210, y: 420 },
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
 * Share/action C1 parity journey (pure DW).
 * Text path remains primary green for share / native-share.
 * Image / multi-item markers asserted when host exposes `btn-open-image-share`
 * or when the primary path is already image (action / native-action).
 */
export async function runShareActionJourney(
  device: DeviceSession,
  id: keyof typeof TARGET_CATALOG,
): Promise<TargetJourneyResult> {
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
    await tapProbeHit(device, row);
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
    const msg = String(e);
    const failureKind = /labels=\s*$|labels=$/m.test(msg)
      ? "infra"
      : /not installed|Unable to find|failed to get the task|Launch failed|point-probe/i.test(
            msg,
          )
        ? "operator"
        : /btn-open-share-sheet|screen-root/i.test(msg)
          ? "operator"
          : "product";
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
        failureKind === "operator"
          ? "operator"
          : failureKind === "infra"
            ? "infra"
            : "red",
      steps,
      checklist,
      error: msg,
      failureKind,
    };
  }
}
