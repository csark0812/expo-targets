/**
 * Quick Look Thumbnail deep journey.
 *
 * GREEN (P): pluginkit lists quicklook.thumbnail + Files browses et-thumb.etqlt
 * and App Group shows qlThumb:* / ET QL Thumb (provider invoke).
 *
 * Thumbnail pixels are not AX-readable; App Group from provideThumbnail is the
 * primary P proof. Files folder listing is the invoke surface.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { DeviceSession } from "@csark0812/devicewright";
import { claimForId } from "../claims";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  dismissSystemAlerts,
  findNamedViaPointProbe,
  flattenLabels,
  sleep,
  tapId,
  tapProbeHit,
  waitForNamed,
} from "./helpers";
import { tapLabelInTree } from "./settings-nav";

const FILES_BUNDLE = "com.apple.DocumentsApp";
const FIXTURE_NAME = "et-thumb.etqlt";

function pluginkitHasQuickLookThumbnail(udid: string, appexId: string): boolean {
  const r = spawnSync(
    "xcrun",
    ["simctl", "spawn", udid, "pluginkit", "-mAvvvvv"],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, env: process.env },
  );
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  return (
    out.toLowerCase().includes(appexId.toLowerCase()) &&
    /quicklook\.thumbnail/i.test(out)
  );
}

function writeFixtureToDocuments(
  udid: string,
  hostBundleId: string,
  steps: string[],
): void {
  const container = spawnSync(
    "xcrun",
    ["simctl", "get_app_container", udid, hostBundleId, "data"],
    { encoding: "utf8" },
  );
  if (container.status !== 0) {
    throw new Error(
      `get_app_container data failed: ${container.stderr || container.stdout}`,
    );
  }
  const docs = path.join(container.stdout.trim(), "Documents");
  fs.mkdirSync(docs, { recursive: true });
  const fixturePath = path.join(docs, FIXTURE_NAME);
  // Unique stamp so Files / QL thumbnail cache cannot reuse a prior reply.
  fs.writeFileSync(
    fixturePath,
    `expo-targets quicklook-thumbnail fixture\nET QL Thumb\n${Date.now()}\n`,
    "utf8",
  );
  steps.push(`fixture-written:${FIXTURE_NAME}`);
}

async function openFilesBrowse(device: DeviceSession, steps: string[]): Promise<void> {
  await device.launchApp(FILES_BUNDLE, { terminateRunning: true });
  await sleep(1_400);
  await dismissSystemAlerts(device);
  for (let i = 0; i < 4; i++) {
    const labels = flattenLabels(await device.accessibilityTree());
    if (
      labels.some((l) => /^Locations$/i.test(l.trim())) ||
      labels.some((l) => /On My iPhone|iCloud Drive/i.test(l))
    ) {
      steps.push("files-browse-surface");
      return;
    }
    const tapped = await tapLabelInTree(device, ["Browse"], { exactOnly: true });
    if (!tapped) {
      await device.tap({ x: 315, y: 880 });
      steps.push("files-browse-tab-hotspot");
    } else {
      steps.push("files-browse-tab");
    }
    await sleep(700);
  }
}

async function openHostFolderInFiles(
  device: DeviceSession,
  steps: string[],
): Promise<void> {
  await openFilesBrowse(device, steps);
  await sleep(500);

  const openedOnMy = await tapLabelInTree(device, ["On My iPhone", "On My iPad"], {
    exactOnly: false,
  });
  if (!openedOnMy) {
    try {
      const hit = await findNamedViaPointProbe(
        device,
        ["On My iPhone", "On My iPad"],
        { timeoutMs: 4_000, match: "includes" },
      );
      await tapProbeHit(device, hit);
    } catch {
      throw new Error("Files: On My iPhone row missing");
    }
  }
  steps.push("files-on-my-iphone");
  await sleep(900);

  const hostOpened = await tapLabelInTree(
    device,
    ["ET QLThumb", "ET QLThumb Target", "quicklook-thumbnail"],
    { exactOnly: false },
  );
  if (!hostOpened) {
    try {
      const hit = await findNamedViaPointProbe(
        device,
        ["ET QLThumb", "QLThumb"],
        { timeoutMs: 5_000, match: "includes", yStartRatio: 0.15, yEndRatio: 0.95 },
      );
      await tapProbeHit(device, hit);
    } catch (e) {
      const labels = flattenLabels(await device.accessibilityTree());
      throw new Error(
        `Files: host folder missing; labels=${labels.slice(0, 60).join(", ")}; ${e}`,
      );
    }
  }
  steps.push("files-host-folder");
  await sleep(1_200);

  // Listing the folder should request thumbnails; confirm fixture row exists.
  const labels = flattenLabels(await device.accessibilityTree());
  if (
    labels.some(
      (l) =>
        l.toLowerCase().includes(FIXTURE_NAME.toLowerCase()) ||
        l.toLowerCase().includes("et-thumb") ||
        l.toLowerCase().includes(".etqlt"),
    )
  ) {
    steps.push("files-fixture-visible");
  } else {
    // Icon view may omit filename AX — try opening via probe anyway.
    try {
      const hit = await findNamedViaPointProbe(
        device,
        [FIXTURE_NAME, "et-thumb", ".etqlt"],
        { timeoutMs: 4_000, match: "includes" },
      );
      await tapProbeHit(device, hit);
      steps.push("files-fixture-opened");
      await sleep(1_000);
    } catch {
      steps.push("files-fixture-ax-opaque");
    }
  }

  // Extra settle for QLThumbnailGenerationService → appex.
  await sleep(2_500);
}

export async function runQuicklookThumbnailJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["quicklook-thumbnail"];
  const pathStr = entry?.path ?? "examples/quicklook-thumbnail";
  const claim = claimForId("quicklook-thumbnail");
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("quicklook-thumbnail: missing catalog entry");

    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    // Clear prior App Group so a green cannot come from a stale provider run.
    try {
      await tapId(device, entry.testIds.clearPayload, 4_000);
      steps.push("cleared-payload");
      await sleep(400);
    } catch {
      steps.push("clear-payload-miss");
    }

    const appexId = `${entry.hostBundleId}.quicklook-thumbnail`;
    if (!pluginkitHasQuickLookThumbnail(device.deviceId, appexId)) {
      throw new Error(
        `quicklook.thumbnail appex missing from pluginkit (${appexId})`,
      );
    }
    steps.push("pluginkit-quicklook-thumbnail");

    writeFixtureToDocuments(device.deviceId, entry.hostBundleId, steps);

    await openHostFolderInFiles(device, steps);

    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await waitForNamed(device, ["ready"], 12_000);

    // Poll App Group — Files may request thumbs asynchronously after browse.
    let appGroupOk = false;
    for (let i = 0; i < 10; i++) {
      try {
        await assertPayloadContains(
          device,
          entry.testIds.lastPayload,
          "ET QL Thumb",
          3_000,
        );
        steps.push("ql-thumb-appgroup");
        appGroupOk = true;
        break;
      } catch {
        try {
          await tapId(device, "btn-refresh", 2_000);
        } catch {
          /* optional */
        }
        await sleep(800);
      }
    }
    if (!appGroupOk) {
      steps.push("ql-thumb-appgroup-missing");
    }

    if (appGroupOk) {
      return {
        id: "quicklook-thumbnail",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "green",
        steps,
      };
    }

    if (claim) {
      return {
        id: "quicklook-thumbnail",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "os-limit",
        steps,
        failureKind: "os-limit",
        error: claim.reason,
      };
    }

    const labels = flattenLabels(await device.accessibilityTree());
    throw new Error(
      `Quick Look thumbnail provider did not write App Group after browsing ${FIXTURE_NAME}; labels=${labels.slice(0, 80).join(", ")}`,
    );
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? "operator"
      : "product";
    return {
      id: "quicklook-thumbnail",
      path: pathStr,
      phase: 5,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}
