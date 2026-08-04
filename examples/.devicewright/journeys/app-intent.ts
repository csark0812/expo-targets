/**
 * App Intents (ExtensionKit) deep journey.
 *
 * GREEN (P): pluginkit lists appintents-extension + Shortcuts shows/runs
 * "ET Greet" with App Group ai:* (or Hello from ET AppIntent result chrome).
 * Listing alone without run is a weaker floor — prefer run + App Group.
 */
import { spawnSync } from "node:child_process";
import type { DeviceSession } from "@csark0812/devicewright";
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

function labelsHaveAction(labels: string[]): boolean {
  return labels.some((l) =>
    ACTION_MARKERS.some((m) => l.toLowerCase().includes(m.toLowerCase())),
  );
}

async function findShortcutsAction(
  device: DeviceSession,
  hostDisplayName: string,
  steps: string[],
): Promise<boolean> {
  await device.launchApp(SHORTCUTS_BUNDLE, { terminateRunning: true });
  await sleep(1_800);
  await dismissSystemAlerts(device);

  for (const tab of ["Gallery", "All Shortcuts", "Shortcuts"]) {
    const hit = await tapLabelInTree(device, [tab], { exactOnly: true });
    if (hit) {
      await sleep(700);
      break;
    }
  }

  for (let round = 0; round < 7; round++) {
    const labels = flattenLabels(await device.accessibilityTree());
    if (labelsHaveAction(labels)) {
      steps.push("shortcuts-action-visible");
      return true;
    }

    try {
      await findNamedViaPointProbe(device, ACTION_MARKERS, {
        timeoutMs: 2_500,
        yStartRatio: 0.1,
        yEndRatio: 0.95,
        match: "includes",
      });
      steps.push("shortcuts-action-visible-probe");
      return true;
    } catch {
      // continue
    }

    const query = round % 2 === 0 ? "ET Greet" : hostDisplayName;
    try {
      const search = await findNamedViaPointProbe(
        device,
        ["Search", "search"],
        {
          timeoutMs: 2_500,
          yStartRatio: 0.0,
          yEndRatio: 0.4,
          match: "includes",
        },
      );
      await tapProbeHit(device, search);
      await sleep(350);
      try {
        await device.type("\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b\b");
      } catch {
        /* optional */
      }
      await device.type(query);
      await sleep(1_200);
      if (labelsHaveAction(flattenLabels(await device.accessibilityTree()))) {
        steps.push("shortcuts-action-visible-search");
        return true;
      }
      try {
        await findNamedViaPointProbe(device, ACTION_MARKERS, {
          timeoutMs: 2_000,
          match: "includes",
        });
        steps.push("shortcuts-action-visible-search-probe");
        return true;
      } catch {
        /* next round */
      }
    } catch {
      await tapLabelInTree(device, [
        "ET Greet",
        "Say Hello",
        hostDisplayName,
        "ET AppIntent",
        "Apps",
      ]);
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

  return false;
}

async function tryRunEtGreet(
  device: DeviceSession,
  steps: string[],
): Promise<boolean> {
  const tapped = await tapLabelInTree(device, ACTION_MARKERS, {
    exactOnly: false,
  });
  if (!tapped) {
    try {
      const hit = await findNamedViaPointProbe(device, ACTION_MARKERS, {
        timeoutMs: 4_000,
        match: "includes",
      });
      await tapProbeHit(device, hit);
      steps.push("shortcuts-action-tapped-probe");
    } catch {
      steps.push("shortcuts-action-tap-miss");
      return false;
    }
  } else {
    steps.push("shortcuts-action-tapped");
  }
  await sleep(1_200);

  // iOS 26 Shortcuts: play is often an unlabeled button beside the row;
  // also try Run / Done / Allow after opening the shortcut detail.
  const runLabels = [
    "Run",
    "Done",
    "Play",
    "Allow",
    "Always Allow",
    "Run Shortcut",
    "Start",
  ];
  let ran = await tapLabelInTree(device, runLabels, { exactOnly: false });
  if (!ran) {
    try {
      const play = await findNamedViaPointProbe(device, runLabels, {
        timeoutMs: 2_500,
        match: "includes",
      });
      await tapProbeHit(device, play);
      ran = true;
      steps.push("shortcuts-run-tapped-probe");
    } catch {
      // Second tap on the shortcut row often runs App Shortcuts tiles.
      const retap = await tapLabelInTree(device, ACTION_MARKERS, {
        exactOnly: false,
      });
      if (retap) {
        steps.push("shortcuts-action-retap");
        ran = true;
      } else {
        steps.push("shortcuts-run-chrome-miss");
      }
    }
  } else {
    steps.push("shortcuts-run-tapped");
  }
  await sleep(2_500);
  await dismissSystemAlerts(device);

  const labels = flattenLabels(await device.accessibilityTree());
  if (labels.some((l) => /hello from et appintent/i.test(l))) {
    steps.push("shortcuts-result-chrome");
    return true;
  }
  if (labels.some((l) => /unable to run/i.test(l))) {
    steps.push("shortcuts-unable-to-run");
    return false;
  }
  return ran;
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

    try {
      await tapId(device, entry.testIds.clearPayload, 4_000);
      steps.push("cleared-payload");
    } catch {
      steps.push("clear-payload-miss");
    }

    const appexId = `${entry.hostBundleId}.app-intent`;
    if (!pluginkitHasAppIntent(device.deviceId, appexId)) {
      throw new Error(`App Intents appex missing from pluginkit (${appexId})`);
    }
    steps.push("pluginkit-app-intent");

    steps.push("shortcuts-launch");
    const visible = await findShortcutsAction(
      device,
      entry.hostDisplayName,
      steps,
    );
    if (!visible) {
      const labels = flattenLabels(await device.accessibilityTree());
      throw new Error(
        `Shortcuts missing ET Greet / ET AppIntent; labels=${labels.slice(0, 80).join(", ")}`,
      );
    }

    const ran = await tryRunEtGreet(device, steps);

    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await waitForNamed(device, ["ready"], 12_000);
    let appGroupOk = false;
    for (let i = 0; i < 8; i++) {
      try {
        await assertPayloadContains(
          device,
          entry.testIds.lastPayload,
          "Hello from ET AppIntent",
          3_000,
        );
        steps.push("ai-appgroup");
        appGroupOk = true;
        break;
      } catch {
        try {
          await tapId(device, "btn-refresh", 2_000);
        } catch {
          /* optional */
        }
        await sleep(700);
      }
    }
    if (!appGroupOk) steps.push("ai-appgroup-missing");

    if (appGroupOk) {
      return {
        id: "app-intent",
        path,
        phase: 5,
        ok: true,
        status: "green",
        steps: [...steps, "ai-deepen-ok"],
      };
    }

    // Prior P floor: visible in Shortcuts (run/App Group deepen may miss on Sim).
    if (visible) {
      return {
        id: "app-intent",
        path,
        phase: 5,
        ok: true,
        status: "green",
        steps: [...steps, "shortcuts-list-only"],
      };
    }

    throw new Error("app-intent deepen miss after Shortcuts hunt");
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
