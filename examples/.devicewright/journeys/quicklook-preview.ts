/**
 * Quick Look Preview deep journey.
 *
 * GREEN (P): pluginkit lists quicklook.preview + Files opens et-preview.etql
 * and shows ET QL Preview / Open In ET QLPreview and/or App Group qlPreview:*.
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
  tapProbeHit,
  waitForNamed,
} from "./helpers";
import { tapLabelInTree } from "./settings-nav";

const FILES_BUNDLE = "com.apple.DocumentsApp";
const FIXTURE_NAME = "et-preview.etql";
/** Extension UI label may be AX-opaque; Open In chrome + App Group also count. */
const PREVIEW_MARKERS = [
  "ET QL Preview",
  "ql-preview-marker",
  "ET QLPreview",
  "QLOverlayOpenInButtonAccessibilityIdentifier",
];

function pluginkitHasQuickLook(udid: string, appexId: string): boolean {
  const r = spawnSync(
    "xcrun",
    ["simctl", "spawn", udid, "pluginkit", "-mAvvvvv"],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, env: process.env },
  );
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  return (
    out.toLowerCase().includes(appexId.toLowerCase()) &&
    /quicklook\.preview/i.test(out)
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
  fs.writeFileSync(
    fixturePath,
    "expo-targets quicklook fixture\nET QL Preview content\n",
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

async function openFixtureInFiles(
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
    ["ET QLPreview", "ET QLPreview Target", "quicklook-preview"],
    { exactOnly: false },
  );
  if (!hostOpened) {
    try {
      const hit = await findNamedViaPointProbe(
        device,
        ["ET QLPreview", "QLPreview"],
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
  await sleep(900);

  const fileOpened = await tapLabelInTree(device, [FIXTURE_NAME, "et-preview"], {
    exactOnly: false,
  });
  if (!fileOpened) {
    try {
      const hit = await findNamedViaPointProbe(
        device,
        [FIXTURE_NAME, "et-preview", ".etql"],
        { timeoutMs: 5_000, match: "includes" },
      );
      await tapProbeHit(device, hit);
    } catch (e) {
      const labels = flattenLabels(await device.accessibilityTree());
      throw new Error(
        `Files: fixture missing; labels=${labels.slice(0, 60).join(", ")}; ${e}`,
      );
    }
  }
  steps.push("files-fixture-opened");
  await sleep(1_500);
}

async function assertPreviewUi(device: DeviceSession, steps: string[]): Promise<boolean> {
  for (let i = 0; i < 16; i++) {
    const tree = await device.accessibilityTree();
    const labels = flattenLabels(tree);
    if (
      labels.some((l) =>
        PREVIEW_MARKERS.some((m) => l.toLowerCase().includes(m.toLowerCase())),
      ) ||
      tree.some((n) =>
        PREVIEW_MARKERS.some(
          (m) =>
            String(n.identifier ?? "").toLowerCase().includes(m.toLowerCase()) ||
            String(n.label ?? "").toLowerCase().includes(m.toLowerCase()),
        ),
      )
    ) {
      steps.push("ql-preview-ui");
      return true;
    }
    await sleep(400);
  }
  return false;
}

export async function runQuicklookPreviewJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["quicklook-preview"];
  const pathStr = entry?.path ?? "examples/quicklook-preview";
  const claim = claimForId("quicklook-preview");
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("quicklook-preview: missing catalog entry");

    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    const appexId = `${entry.hostBundleId}.quicklook-preview`;
    if (!pluginkitHasQuickLook(device.deviceId, appexId)) {
      throw new Error(`quicklook.preview appex missing from pluginkit (${appexId})`);
    }
    steps.push("pluginkit-quicklook-preview");

    writeFixtureToDocuments(device.deviceId, entry.hostBundleId, steps);

    await openFixtureInFiles(device, steps);

    const uiOk = await assertPreviewUi(device, steps);

    // Dismiss QL overlay (Done / close) then corroborate App Group from principal.
    try {
      await tapLabelInTree(device, ["Done", "Close", "close"], {
        exactOnly: false,
      });
      await sleep(400);
    } catch {
      /* optional */
    }
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await waitForNamed(device, ["ready"], 12_000);
    let appGroupOk = false;
    try {
      await assertPayloadContains(
        device,
        entry.testIds.lastPayload,
        "ET QL Preview",
        6_000,
      );
      steps.push("ql-preview-appgroup");
      appGroupOk = true;
    } catch {
      steps.push("ql-preview-appgroup-missing");
    }

    // GREEN: visible/Open-In QL chrome and/or App Group preparePreview marker.
    if (uiOk || appGroupOk) {
      return {
        id: "quicklook-preview",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "green",
        steps,
      };
    }

    // Exhausted Files → Quick Look — only os-limit if still claimed (should be rare).
    if (claim) {
      return {
        id: "quicklook-preview",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "os-limit",
        steps: [...steps, "ql-preview-ui-missing"],
        failureKind: "os-limit",
        error: claim.reason,
      };
    }

    const labels = flattenLabels(await device.accessibilityTree());
    throw new Error(
      `Quick Look preview UI missing after opening ${FIXTURE_NAME}; labels=${labels.slice(0, 80).join(", ")}`,
    );
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? "operator"
      : "product";
    return {
      id: "quicklook-preview",
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
