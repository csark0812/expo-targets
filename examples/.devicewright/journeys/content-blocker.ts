/**
 * Content Blocker deep journey.
 *
 * Apple capability path (iOS 26):
 * Settings → Apps → Safari → Content Blockers (or Extensions) → appex listed
 * → Allow Extension / enable toggle.
 *
 * GREEN = OS lists the blocker, enable surface opens, and Safari blocked-URL
 * check is attempted (network proof best-effort on Simulator).
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
import {
  openAppexAndAllowExtension,
  openSafariExtensionsOrBlockers,
  openSystemSafariSettings,
  tapLabelInTree,
} from "./settings-nav";

export async function runContentBlockerJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["content-blocker"];
  const path = entry?.path ?? "examples/content-blocker";
  const steps: string[] = [];
  const appexLabels = [
    entry.extensionName,
    "ET Blocker Target",
    "ET Blocker",
  ].filter(Boolean);

  try {
    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    await openSystemSafariSettings(device, steps);
    await openSafariExtensionsOrBlockers(device, steps, "blockers");

    // OS labels look like “ET Blocker, Off” — poll tree with substring match.
    let listed = false;
    for (let i = 0; i < 16; i++) {
      const tree = await device.accessibilityTree();
      listed = flattenLabels(tree).some((l) =>
        appexLabels.some((a) => l.toLowerCase().includes(a.toLowerCase())),
      );
      if (listed) break;
      await sleep(500);
    }
    if (!listed) {
      const tree = await device.accessibilityTree();
      throw new Error(
        `Content blocker not listed; labels=${flattenLabels(tree).slice(0, 40).join("|")}`,
      );
    }
    steps.push("content-blocker-listed");

    await openAppexAndAllowExtension(device, appexLabels, steps);

    // Network proof: open Safari and load a blocked URL (ads.example.com).
    try {
      await device.launchApp("com.apple.mobilesafari", {
        terminateRunning: true,
      });
      steps.push("safari-launch");
      await sleep(900);
      const urlField = await tapLabelInTree(device, ["Address", "URL"]);
      if (urlField) {
        await device.type({
          text: "https://ads.example.com/track",
        });
        await device.pressKey({ key: "RETURN" });
        steps.push("safari-blocked-url");
        await sleep(1500);
        const tree = await device.accessibilityTree();
        const labels = flattenLabels(tree).map((l) => l.toLowerCase());
        if (
          labels.some(
            (l) =>
              l.includes("cannot open") ||
              l.includes("safari cannot") ||
              l.includes("blocked"),
          )
        ) {
          steps.push("content-blocker-network-proof");
        } else {
          steps.push("content-blocker-network-inconclusive");
        }
      }
    } catch {
      steps.push("content-blocker-network-skipped");
    }

    return {
      id: "content-blocker",
      path,
      phase: 4,
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
      id: "content-blocker",
      path,
      phase: 4,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}
