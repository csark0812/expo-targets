/**
 * App Intents (ExtensionKit) deep journey.
 *
 * GREEN (P): pluginkit lists appintents-extension + Shortcuts shows
 * "ET Greet" (not pluginkit-only).
 */
import { spawnSync } from "node:child_process";
import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  dismissSystemAlerts,
  findNamedViaPointProbe,
  flattenLabels,
  sleep,
  tapProbeHit,
  waitForNamed,
} from "./helpers";
import { tapLabelInTree } from "./settings-nav";

const SHORTCUTS_BUNDLE = "com.apple.shortcuts";
const ACTION_MARKERS = [
  "ET Greet",
  "Say Hello",
  "ET AppIntent",
  "Hello from ET AppIntent",
];

function pluginkitHasAppIntent(udid: string, appexId: string): boolean {
  const r = spawnSync(
    "xcrun",
    ["simctl", "spawn", udid, "pluginkit", "-mAvvvvv"],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, env: process.env },
  );
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  return (
    out.toLowerCase().includes(appexId.toLowerCase()) &&
    /appintents-extension/i.test(out)
  );
}

async function assertShortcutsListsAction(
  device: DeviceSession,
  hostDisplayName: string,
): Promise<void> {
  await device.launchApp(SHORTCUTS_BUNDLE, { terminateRunning: true });
  await sleep(1_500);

  // Gallery / search surfaces vary by iOS — prefer ET Greet (intent title).
  const searchTargets = [
    "ET Greet",
    "Say Hello",
    hostDisplayName,
    "ET AppIntent",
    "Search",
  ];

  for (let round = 0; round < 5; round++) {
    const labels = flattenLabels(await device.accessibilityTree());
    if (
      labels.some((l) =>
        ACTION_MARKERS.some((m) => l.toLowerCase().includes(m.toLowerCase())),
      )
    ) {
      return;
    }

    try {
      await findNamedViaPointProbe(device, ACTION_MARKERS, {
        timeoutMs: 2_500,
        yStartRatio: 0.15,
        yEndRatio: 0.95,
        match: "includes",
      });
      return;
    } catch {
      // try search / scroll
    }

    try {
      const search = await findNamedViaPointProbe(
        device,
        ["Search", "search"],
        {
          timeoutMs: 2_000,
          yStartRatio: 0.0,
          yEndRatio: 0.35,
          match: "includes",
        },
      );
      await tapProbeHit(device, search);
      await sleep(400);
      await device.type("ET Greet");
      await sleep(1_000);
    } catch {
      await tapLabelInTree(device, searchTargets);
      await sleep(700);
    }

    await device.swipe({
      xStart: 210,
      yStart: 700,
      xEnd: 210,
      yEnd: 280,
      duration: 0.35,
    });
    await sleep(500);
  }

  const labels = flattenLabels(await device.accessibilityTree());
  throw new Error(
    `Shortcuts missing ET Greet / ET AppIntent; labels=${labels.slice(0, 80).join(", ")}`,
  );
}

export async function runAppIntentJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["app-intent"];
  const path = entry?.path ?? "examples/app-intent";
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("app-intent: missing catalog entry");

    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    const appexId = `${entry.hostBundleId}.app-intent`;
    if (!pluginkitHasAppIntent(device.deviceId, appexId)) {
      throw new Error(`App Intents appex missing from pluginkit (${appexId})`);
    }
    steps.push("pluginkit-app-intent");

    steps.push("shortcuts-launch");
    await assertShortcutsListsAction(device, entry.hostDisplayName);
    steps.push("shortcuts-action-visible");

    return {
      id: "app-intent",
      path,
      phase: 5,
      ok: true,
      status: "green",
      steps,
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? "operator"
      : "product";
    return {
      id: "app-intent",
      path,
      phase: 5,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}
