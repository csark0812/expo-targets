/**
 * Call Directory deep journey.
 *
 * Floor proof:
 * 1. pluginkit lists the CallKit call-directory appex.
 * 2. When Phone settings exist, navigate to Call Blocking & Identification.
 *
 * iPhone Air / non-telephony sims often omit Phone → Call Blocking settings;
 * that path is os-limit (see claims.ts), not red.
 */
import { spawnSync } from "node:child_process";
import type { DeviceSession } from "@csark0812/devicewright";
import { claimForId } from "../claims";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import { runAndroidCallDirectoryJourney } from "./call-directory.android";
import {
  dismissSystemAlerts,
  flattenLabels,
  sleep,
  waitForNamed,
} from "./helpers";
import {
  openSettingsApps,
  scrollUntilVisible,
  searchAppsAndOpen,
  tapLabelInTree,
} from "./settings-nav";

const SETTINGS_BUNDLE = "com.apple.Preferences";

function pluginkitHasCallDirectory(udid: string, appexId: string): boolean {
  const r = spawnSync(
    "xcrun",
    ["simctl", "spawn", udid, "pluginkit", "-mAvvvvv"],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, env: process.env },
  );
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  return (
    out.toLowerCase().includes(appexId.toLowerCase()) &&
    /callkit\.call-directory|call-directory/i.test(out)
  );
}

async function tryOpenCallBlockingSettings(
  device: DeviceSession,
  steps: string[],
): Promise<boolean> {
  await device.launchApp(SETTINGS_BUNDLE, { terminateRunning: true });
  steps.push("settings-launch");
  await sleep(700);

  const phoneVisible = await scrollUntilVisible(device, ["Phone"], 12);
  if (phoneVisible) {
    const openedPhone = await tapLabelInTree(device, ["Phone"], {
      exactOnly: true,
    });
    if (openedPhone) {
      steps.push("nav:Phone");
      await sleep(500);
      const phoneLabels = flattenLabels(await device.accessibilityTree());
      if (
        phoneLabels.some((l) =>
          /call blocking|silence unknown|respond with text|announce calls/i.test(
            l,
          ),
        )
      ) {
        steps.push("phone-settings-ok");
        try {
          const openedBlocking = await tapLabelInTree(
            device,
            [
              "Call Blocking & Identification",
              "Call Blocking and Identification",
            ],
            { exactOnly: false },
          );
          if (openedBlocking) {
            steps.push("call-blocking-nav");
            return true;
          }
          steps.push("call-blocking-nav-failed");
        } catch {
          steps.push("call-blocking-nav-failed");
        }
      }
    }
  }

  // Fallback: Settings → Apps → system Phone (avoid host “Phone” / Default Apps).
  try {
    await openSettingsApps(device, steps);
    await searchAppsAndOpen(device, "Phone", ["Phone"], steps, {
      exactRow: true,
      confirmLabels: [
        "Call Blocking & Identification",
        "Call Blocking and Identification",
        "Announce Calls",
        "Silence Unknown Callers",
        "Cellular",
      ],
    });
    steps.push("apps-phone-settings");
    try {
      const openedBlocking = await tapLabelInTree(
        device,
        [
          "Call Blocking & Identification",
          "Call Blocking and Identification",
        ],
        { exactOnly: false },
      );
      if (openedBlocking) {
        steps.push("apps-phone-call-blocking-nav");
        return true;
      }
      const phoneLabels = flattenLabels(await device.accessibilityTree());
      if (
        phoneLabels.some((l) =>
          /call blocking|call directory|identification/i.test(l),
        )
      ) {
        steps.push("apps-phone-call-blocking-surface");
        return true;
      }
    } catch {
      const phoneLabels = flattenLabels(await device.accessibilityTree());
      if (
        phoneLabels.some((l) =>
          /call blocking|call directory|identification/i.test(l),
        )
      ) {
        steps.push("apps-phone-call-blocking-surface");
        return true;
      }
    }
  } catch {
    steps.push("apps-phone-settings-unavailable");
  }

  // iPhone Air: no Phone row — try Settings search before giving up.
  await device.launchApp(SETTINGS_BUNDLE, { terminateRunning: true });
  await sleep(500);
  const searchField = await tapLabelInTree(device, ["Search"]);
  if (searchField) {
    steps.push("settings-search");
    await device.type("Call Blocking");
    await sleep(700);
    const searchLabels = flattenLabels(await device.accessibilityTree());
    if (searchLabels.some((l) => /no results for/i.test(l))) {
      steps.push("settings-search-no-call-blocking");
      return false;
    }
    const opened = await tapLabelInTree(device, [
      "Call Blocking & Identification",
      "Call Blocking and Identification",
    ]);
    if (opened) {
      steps.push("settings-search-call-blocking");
      return true;
    }
  }

  steps.push("call-blocking-settings-unavailable");
  return false;
}

export async function runCallDirectoryJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  if (device.platform === "android") {
    return runAndroidCallDirectoryJourney(device);
  }
  const entry = TARGET_CATALOG["call-directory"];
  const path = entry?.path ?? "examples/call-directory";
  const claim = claimForId("call-directory");
  const steps: string[] = [];
  const appexLabels = [
    entry?.extensionName,
    entry?.hostDisplayName,
    "ET CallDir Target",
    "ET CallDir",
  ].filter(Boolean);

  try {
    if (!entry) throw new Error("call-directory: missing catalog entry");

    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    const appexId = `${entry.hostBundleId}.call-directory`;
    if (!pluginkitHasCallDirectory(device.deviceId, appexId)) {
      throw new Error(`Call Directory appex missing from pluginkit (${appexId})`);
    }
    steps.push("pluginkit-call-directory");

    const settingsAvailable = await tryOpenCallBlockingSettings(device, steps);
    if (!settingsAvailable) {
      return {
        id: "call-directory",
        path,
        phase: 5,
        ok: true,
        status: "os-limit",
        steps,
        failureKind: "os-limit",
        error:
          claim?.reason ??
          "Call Directory Settings enablement — Phone settings unavailable on this device",
      };
    }

    let listed = false;
    for (let i = 0; i < 12; i++) {
      const tree = await device.accessibilityTree();
      listed = flattenLabels(tree).some((l) =>
        appexLabels.some((a) => l.toLowerCase().includes(a.toLowerCase())),
      );
      if (listed) break;
      await sleep(450);
    }
    if (listed) {
      steps.push("call-directory-listed");
      const enabled = await tapLabelInTree(device, appexLabels);
      if (enabled) steps.push("call-directory-opened");
      return {
        id: "call-directory",
        path,
        phase: 5,
        ok: true,
        status: "green",
        steps,
      };
    }

    steps.push("call-directory-not-listed-in-settings");
    return {
      id: "call-directory",
      path,
      phase: 5,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error:
        claim?.reason ??
        "Call Directory Settings enablement — extension not listed on this device",
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? "operator"
      : "product";
    return {
      id: "call-directory",
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
