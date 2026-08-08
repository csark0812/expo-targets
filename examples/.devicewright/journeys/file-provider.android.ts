/**
 * Android dual of file-provider — DocumentsUI must list the provider root.
 * DeviceSession only (launchApp / openUrl / pressButton / AX). No raw adb.
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { hostLaunchId, TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  dismissSystemAlerts,
  findNamedViaPointProbe,
  flattenLabels,
  hostReadyTestId,
  sleep,
  tapCenter,
  tapId,
  tapProbeHit,
  waitForId,
  waitForNamed,
  ANDROID_POST_TAP_MS,
  ANDROID_SETTINGS_SETTLE_MS,
  tapNamedAndroid,
} from "./helpers";

const DOCUMENTS_UI = "com.google.android.documentsui";
const ROOT_MARKERS = ["Expo Targets", "ET FileProv"] as const;
const SEED_MARKERS = ["et-fp-seed.txt", "et-fp-seed"] as const;

function labelsHit(labels: string[], needles: readonly string[]): boolean {
  const lower = labels.map((l) => l.toLowerCase());
  return needles.some((n) =>
    lower.some((l) => l === n.toLowerCase() || l.includes(n.toLowerCase())),
  );
}

async function waitForRootListed(
  device: DeviceSession,
  timeoutMs = 12_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (labelsHit(flattenLabels(await device.accessibilityTree()), ROOT_MARKERS)) {
      return true;
    }
    await sleep(400);
  }
  return false;
}

async function tryOpenRoot(device: DeviceSession): Promise<boolean> {
  try {
    const node = await waitForNamed(device, [...ROOT_MARKERS], 3_000);
    await tapCenter(device, node);
    await sleep(450);
    return true;
  } catch {
    try {
      const hit = await findNamedViaPointProbe(device, [...ROOT_MARKERS], {
        timeoutMs: 4_000,
        match: "includes",
        yStartRatio: 0.1,
        yEndRatio: 0.95,
      });
      await tapProbeHit(device, hit);
      await sleep(450);
      return true;
    } catch {
      return false;
    }
  }
}

async function seedVisible(device: DeviceSession): Promise<boolean> {
  return labelsHit(
    flattenLabels(await device.accessibilityTree()),
    SEED_MARKERS,
  );
}

const tapNamed = tapNamedAndroid;

async function openDocumentsSurface(
  device: DeviceSession,
  steps: string[],
): Promise<void> {
  // DocumentsUI + Show roots drawer lists registered DocumentsProvider roots.
  // (DW has no OPEN_DOCUMENT intent peer yet — launchApp is enough.)
  await device.launchApp(DOCUMENTS_UI, { terminateRunning: true });
  steps.push("launch-documentsui");
  await sleep(550);
  await dismissSystemAlerts(device);

  if (await tapNamed(device, ["Show roots"], 4_000)) {
    steps.push("documents-show-roots");
  } else {
    steps.push("documents-show-roots-miss");
  }
}

export async function runAndroidFileProviderJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["file-provider"];
  const pathStr = entry?.path ?? "examples/file-provider";
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("file-provider: missing catalog entry");
    const pkg = hostLaunchId(entry, "android");

    steps.push("android-launch-host");
    await device.launchApp(pkg, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
    steps.push("host-ready");

    try {
      await tapId(device, entry.testIds.clearPayload, 3_000);
      steps.push("clear-payload");
    } catch {
      steps.push("clear-payload-skip");
    }

    await tapId(device, "btn-seed-android-docs", 5_000);
    steps.push("seed-android-docs");
    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      "android-docs",
      8_000,
    );
    steps.push("host-marker-ok");

    steps.push("documents-surface");
    await openDocumentsSurface(device, steps);

    let listed = await waitForRootListed(device, 10_000);
    if (!listed) {
      await tapNamed(device, ["Show roots"], 3_000);
      listed = await waitForRootListed(device, 8_000);
    }
    if (!listed) {
      const labels = flattenLabels(await device.accessibilityTree());
      throw new Error(
        `DocumentsUI missing Expo Targets root; labels=${labels.slice(0, 80).join(", ")}`,
      );
    }
    steps.push("documents-root-listed");

    const opened = await tryOpenRoot(device);
    steps.push(opened ? "documents-root-opened" : "documents-root-open-miss");
    let sawSeed = false;
    if (opened) {
      sawSeed = await seedVisible(device);
      steps.push(sawSeed ? "documents-seed-visible" : "documents-seed-miss");
    }

    await device.pressButton({ button: "HOME" });
    await sleep(400);
    await device.launchApp(pkg, { terminateRunning: false });
    await waitForId(device, hostReadyTestId(entry.testIds), 12_000);
    if (entry.testIds.refresh) {
      try {
        await tapId(device, entry.testIds.refresh, 3_000);
      } catch {
        // optional
      }
    }
    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      "android-docs",
      8_000,
    );
    steps.push("host-marker-reassert");

    return {
      id: "file-provider",
      path: pathStr,
      phase: 5,
      ok: true,
      status: "green",
      steps: [
        ...steps,
        sawSeed ? "fp-android-deepen-ok" : "fp-android-root-list-ok",
      ],
    };
  } catch (e) {
    const msg = String(e);
    const failureKind =
      /not installed|Launch failed|device offline|no devices|openUrl|pressButton/i.test(
        msg,
      )
        ? "operator"
        : "product";
    return {
      id: "file-provider",
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
