/**
 * Android dual of file-provider-ui — Open document → chooser FileProvUI → Activity chrome.
 * Distinct from file-provider: DocumentsUI root list alone must NOT green this id.
 * DeviceSession only. Green on Activity chrome; else os-limit after honest attempt.
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { claimForId } from "../claims";
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
} from "./helpers";

const DOCUMENTS_UI = "com.google.android.documentsui";
const CHOOSER_MARKERS = [
  "ET FileProvUI Target",
  "ET FileProvUI",
  "FileProvUI",
  "fileproviderui",
] as const;
const CHROME_MARKERS = [
  "Expo Targets Document UI",
  "ET FileProvUI",
] as const;

function labelsHit(labels: string[], needles: readonly string[]): boolean {
  const lower = labels.map((l) => l.toLowerCase());
  return needles.some((n) =>
    lower.some((l) => l === n.toLowerCase() || l.includes(n.toLowerCase())),
  );
}

async function tapNamed(
  device: DeviceSession,
  names: string[],
  timeoutMs = 3_500,
): Promise<boolean> {
  try {
    await tapCenter(device, await waitForNamed(device, names, timeoutMs));
    await sleep(700);
    return true;
  } catch {
    try {
      const hit = await findNamedViaPointProbe(device, names, {
        timeoutMs: Math.min(timeoutMs, 3_000),
        match: "includes",
        yStartRatio: 0.0,
        yEndRatio: 0.95,
      });
      await tapProbeHit(device, hit);
      await sleep(700);
      return true;
    } catch {
      return false;
    }
  }
}

async function waitForMarkers(
  device: DeviceSession,
  markers: readonly string[],
  timeoutMs = 8_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (labelsHit(flattenLabels(await device.accessibilityTree()), markers)) {
      return true;
    }
    await sleep(400);
  }
  return false;
}

async function openDocumentsAndPickFile(
  device: DeviceSession,
  steps: string[],
): Promise<void> {
  await device.launchApp(DOCUMENTS_UI, { terminateRunning: true });
  steps.push("launch-documentsui");
  await sleep(1_400);
  await dismissSystemAlerts(device);

  if (await tapNamed(device, ["Show roots", "Files", "Downloads"], 4_000)) {
    steps.push("documents-nav");
  }

  // Prefer a concrete file row over provider roots (file-provider Locked P).
  for (const name of [
    "et-fp-seed.txt",
    "et-fp-seed",
    ".txt",
    "Download",
    "Downloads",
  ]) {
    if (await tapNamed(device, [name], 2_500)) {
      steps.push(`documents-open:${name}`);
      await sleep(900);
      break;
    }
  }

  // Open-with / chooser surfaces.
  for (const label of [
    "Open with",
    "Open with…",
    "Just once",
    "Always",
    "Open",
  ]) {
    if (await tapNamed(device, [label], 2_000)) {
      steps.push(`chooser-entry:${label}`);
    }
  }
}

export async function runAndroidFileProviderUiJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["file-provider-ui"];
  const pathStr = entry?.path ?? "examples/file-provider-ui";
  const claim = claimForId("file-provider-ui", "android");
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("file-provider-ui: missing catalog entry");
    const pkg = hostLaunchId(entry, "android");

    steps.push("android-launch-host");
    await device.launchApp(pkg, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
    steps.push("host-ready");

    try {
      await tapId(device, "btn-mark-registered", 4_000);
      await assertPayloadContains(
        device,
        entry.testIds.lastPayload,
        "android:view-activity-registered",
        6_000,
      );
      steps.push("host-registered-marker");
    } catch {
      steps.push("host-registered-marker-miss");
    }

    steps.push("document-open-attempt");
    await openDocumentsAndPickFile(device, steps);

    // Chooser must name FileProvUI — root list alone is insufficient.
    let chooserHit = await waitForMarkers(device, CHOOSER_MARKERS, 6_000);
    if (!chooserHit) {
      for (const label of ["Open with", "Open with…", "See all"]) {
        if (await tapNamed(device, [label], 2_000)) {
          steps.push(`chooser-retry:${label}`);
        }
      }
      chooserHit = await waitForMarkers(device, CHOOSER_MARKERS, 5_000);
    }
    steps.push(chooserHit ? "chooser-fileprovui-visible" : "chooser-fileprovui-miss");

    if (chooserHit) {
      await tapNamed(device, [...CHOOSER_MARKERS], 3_000);
      steps.push("chooser-fileprovui-tapped");
      if (await tapNamed(device, ["Just once", "Always", "OK"], 2_000)) {
        steps.push("chooser-confirm");
      }
    }

    const chrome = await waitForMarkers(device, CHROME_MARKERS, 8_000);
    // Require Document UI chrome — not Expo Targets DocumentsProvider root.
    const labels = flattenLabels(await device.accessibilityTree());
    const hasDocChrome =
      chrome &&
      labels.some((l) => /expo targets document ui/i.test(l));

    if (hasDocChrome) {
      steps.push("fileprovui-activity-chrome");
      return {
        id: "file-provider-ui",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "green",
        steps: [...steps, "file-provider-ui-android-chrome-ok"],
      };
    }

    steps.push("fileprovui-activity-chrome-miss");
    return {
      id: "file-provider-ui",
      path: pathStr,
      phase: 5,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error:
        claim?.reason ??
        `FileProvUI chooser/chrome miss; labels=${labels.slice(0, 80).join(", ")}`,
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
      id: "file-provider-ui",
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
