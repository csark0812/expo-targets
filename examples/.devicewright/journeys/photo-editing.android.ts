/**
 * Android dual of photo-editing — ACTION_EDIT → editor → save → host marker.
 * DeviceSession only. Green on lastPayload marker; else os-limit after honest attempt.
 */
import path from "node:path";
import type { DeviceSession } from "@csark0812/devicewright";
import { claimForId } from "../claims";
import { hostLaunchId,
  TARGET_CATALOG } from "../catalog";
import { repoRoot } from "../root";
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

const FIXTURE = path.join(
  repoRoot(),
  "examples/.devicewright/fixtures/sample-photo.png",
);

const EDITOR_MARKERS = [
  "ET PhotoEdit",
  "ET PhotoEdit Target",
  "Save",
  "Done",
  "Edit",
] as const;

function labelsHit(labels: string[], needles: readonly string[]): boolean {
  const lower = labels.map((l) => l.toLowerCase());
  return needles.some((n) =>
    lower.some((l) => l === n.toLowerCase() || l.includes(n.toLowerCase())),
  );
}

const tapNamed = tapNamedAndroid;

export async function runAndroidPhotoEditingJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["photo-editing"];
  const pathStr = entry?.path ?? "examples/photo-editing";
  const claim = claimForId("photo-editing", "android");
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("photo-editing: missing catalog entry");
    const pkg = hostLaunchId(entry, "android");

    try {
      await device.addMedia([FIXTURE]);
      steps.push("add-media");
    } catch {
      steps.push("add-media-skip");
    }

    steps.push("android-launch-host");
    await device.launchApp(pkg, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
    steps.push("host-ready");

    try {
      await tapId(device, entry.testIds.clearPayload, 4_000);
      steps.push("cleared-payload");
    } catch {
      steps.push("clear-payload-miss");
    }

    await tapId(device, "btn-launch-action-edit", 8_000);
    steps.push("launch-action-edit");
    await sleep(600);
    await dismissSystemAlerts(device);

    steps.push("editor-surface-attempt");
    const editorVisible = labelsHit(
      flattenLabels(await device.accessibilityTree()),
      EDITOR_MARKERS,
    );
    if (editorVisible) {
      steps.push("editor-chrome-visible");
      for (const save of ["Save", "Done", "OK", "Apply"]) {
        if (await tapNamed(device, [save], 2_500)) {
          steps.push(`editor-save:${save}`);
          break;
        }
      }
      await sleep(ANDROID_SETTINGS_SETTLE_MS);
    } else {
      steps.push("editor-chrome-miss");
    }

    await device.launchApp(pkg, { terminateRunning: false });
    await waitForId(device, hostReadyTestId(entry.testIds), 12_000);
    try {
      await tapId(device, "btn-refresh", 3_000);
    } catch {
      /* optional */
    }

    try {
      await assertPayloadContains(
        device,
        entry.testIds.lastPayload,
        "expo-targets uitest photo-edit done",
        8_000,
      );
      steps.push("host-marker-ok");
      return {
        id: "photo-editing",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "green",
        steps: [...steps, "photo-editing-android-ok"],
      };
    } catch {
      steps.push("host-marker-miss");
    }

    const labels = flattenLabels(await device.accessibilityTree());
    return {
      id: "photo-editing",
      path: pathStr,
      phase: 5,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error:
        claim?.reason ??
        `ACTION_EDIT editor→save→host marker unreachable; labels=${labels.slice(0, 80).join(", ")}`,
    };
  } catch (e) {
    const msg = String(e);
    const failureKind =
      /not installed|Launch failed|device offline|no devices|pressButton/i.test(
        msg,
      )
        ? "operator"
        : "product";
    return {
      id: "photo-editing",
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
