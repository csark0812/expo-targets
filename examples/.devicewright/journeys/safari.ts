/**
 * Safari Web Extension deep journey.
 *
 * Apple capability path (iOS 26):
 * Settings → Apps → Safari → Extensions → extension listed → Allow Extension.
 * Soft follow-on: Safari loads example.com (browser surface alive).
 *
 * GREEN proves OS lists the appex under Safari Extensions and exposes the
 * enable surface when present — not mere Settings → Apps host registration.
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
} from "./settings-nav";

const SAFARI_BUNDLE = "com.apple.mobilesafari";

const EXTENSION_LABELS: Record<string, string[]> = {
  safari: ["ET Safari Target", "ET Safari"],
  "native-safari": ["ET Safari Target", "ET Safari N", "ET Safari"],
};

export async function runSafariJourney(
  device: DeviceSession,
  id: "safari" | "native-safari",
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG[id];
  const path = entry?.path ?? `examples/${id}`;
  const steps: string[] = [];
  const appexLabels = [
    ...(EXTENSION_LABELS[id] ?? []),
    entry.extensionName,
  ].filter(Boolean);

  try {
    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    await openSystemSafariSettings(device, steps);
    await openSafariExtensionsOrBlockers(device, steps, "extensions");

    let listed = false;
    for (let i = 0; i < 16; i++) {
      const t = await device.accessibilityTree();
      listed = flattenLabels(t).some((l) =>
        appexLabels.some((a) => l.toLowerCase().includes(a.toLowerCase())),
      );
      if (listed) break;
      await sleep(500);
    }
    if (!listed) {
      const t = await device.accessibilityTree();
      throw new Error(
        `Web extension not listed; labels=${flattenLabels(t).slice(0, 40).join("|")}`,
      );
    }
    steps.push("web-extension-listed");

    await openAppexAndAllowExtension(device, appexLabels, steps);

    await device.launchApp(SAFARI_BUNDLE, { terminateRunning: true });
    await sleep(700);
    if (typeof device.openUrl === "function") {
      await device.openUrl("https://example.com");
      await sleep(1_200);
      steps.push("safari-openurl");
    }
    const tree = await device.accessibilityTree();
    const labels = flattenLabels(tree);
    if (tree.length === 0) {
      throw new Error("Safari accessibility tree empty after open");
    }
    if (
      !labels.some((l) => /example|Safari|Address|Tab|Reload|Share/i.test(l))
    ) {
      throw new Error(
        `Safari surface missing expected chrome; labels=${labels.slice(0, 20).join("|")}`,
      );
    }
    steps.push("safari-surface-ok");

    return {
      id,
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
      id,
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
