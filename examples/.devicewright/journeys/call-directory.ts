/**
 * Call Directory deep journey.
 *
 * Apple capability path:
 * Settings → Phone → Call Blocking & Identification → extension listed → enable.
 *
 * GREEN = OS lists ET CallDir Target under Call Blocking & Identification.
 * Live lookup proof is os-limit (Call Directory Settings enablement varies).
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  dismissSystemAlerts,
  flattenLabels,
  sleep,
  waitForNamed,
} from "./helpers";
import { navigatePath, tapLabelInTree } from "./settings-nav";

const SETTINGS_BUNDLE = "com.apple.Preferences";

export async function runCallDirectoryJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["call-directory"];
  const path = entry?.path ?? "examples/call-directory";
  const steps: string[] = [];
  const appexLabels = [
    entry.extensionName,
    entry.hostDisplayName,
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

    await device.launchApp(SETTINGS_BUNDLE, { terminateRunning: true });
    steps.push("settings-launch");
    await sleep(700);

    // iOS 26: Phone settings may live under Apps or top-level Phone.
    let opened = await tapLabelInTree(device, ["Phone"]);
    if (!opened) {
      await navigatePath(device, ["Apps", "Phone"], steps);
    } else {
      steps.push("nav:Phone");
    }

    await navigatePath(
      device,
      ["Call Blocking & Identification", "Call Blocking and Identification"],
      steps,
    );

    let listed = false;
    for (let i = 0; i < 12; i++) {
      const tree = await device.accessibilityTree();
      listed = flattenLabels(tree).some((l) =>
        appexLabels.some((a) => l.toLowerCase().includes(a.toLowerCase())),
      );
      if (listed) break;
      await sleep(450);
    }
    if (!listed) {
      const tree = await device.accessibilityTree();
      throw new Error(
        `Call Directory extension not listed; labels=${flattenLabels(tree).slice(0, 40).join("|")}`,
      );
    }
    steps.push("call-directory-listed");

    // Best-effort enable toggle if present.
    const enabled = await tapLabelInTree(device, appexLabels);
    if (enabled) steps.push("call-directory-opened");

    return {
      id: "call-directory",
      path,
      phase: 5,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error: "Call Directory Settings enablement — full lookup proof os-limit",
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
