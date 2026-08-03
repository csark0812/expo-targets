/**
 * Safari Web Extension deep journey.
 *
 * Apple capability path (iOS 26):
 * Settings → Apps → Safari → Extensions → extension listed → Allow Extension
 * → allow example.com → Safari loads example.com → content script native-ping
 * → host App Group `safari:lastNativeMsg` updates.
 *
 * GREEN proves registration + Allow On + Safari Page Menu opens the extension
 * popup + content/native App Group runtime signal (not host scaffolding alone).
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  dismissSystemAlerts,
  flattenLabels,
  sleep,
  tapId,
  waitForNamed,
} from "./helpers";
import {
  allowAppexOnWebsite,
  openAppexAndAllowExtension,
  openSafariExtensionPopup,
  openSafariExtensionsOrBlockers,
  openSystemSafariSettings,
} from "./settings-nav";

const SAFARI_BUNDLE = "com.apple.mobilesafari";

const EXTENSION_LABELS: Record<string, string[]> = {
  safari: ["ET Safari Target", "ET Safari"],
  "native-safari": ["ET Safari Target", "ET Safari N", "ET Safari"],
};

/** Appex bundle ids — display names collide across RN / native / trick hosts. */
const EXTENSION_BUNDLE_IDS: Record<string, string[]> = {
  safari: ["com.expotargets.example.safari.safari"],
  "native-safari": ["com.expotargets.example.native.safari.safari"],
};

const NATIVE_MARKER = "expo-targets uitest safari native-msg";
const POPUP_MARKERS: Record<string, string> = {
  safari: "expo-targets uitest safari rn",
  "native-safari": "expo-targets uitest safari popup",
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

    // Clear prior App Group native pings so post-Safari assert is fresh.
    try {
      await tapId(device, entry.testIds.clearPayload, 3_000);
      steps.push("host-cleared");
    } catch {
      steps.push("host-clear-skip");
    }

    // Popup scaffolding only — content/native must come from appex runtime.
    const popup = POPUP_MARKERS[id];
    if (popup) {
      await assertPayloadContains(
        device,
        "text-safari-popup",
        popup,
        5_000,
      );
    }
    steps.push("host-popup-marker");

    await openSystemSafariSettings(device, steps);
    await openSafariExtensionsOrBlockers(device, steps, "extensions");

    const appexIds = EXTENSION_BUNDLE_IDS[id] ?? [];
    let listed = false;
    for (let i = 0; i < 16; i++) {
      const t = await device.accessibilityTree();
      listed =
        t.some((n) =>
          appexIds.some((a) => (n.identifier ?? "") === a),
        ) ||
        flattenLabels(t).some((l) =>
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

    await openAppexAndAllowExtension(device, appexLabels, steps, { appexIds });
    await allowAppexOnWebsite(device, "example.com", steps);

    await device.launchApp(SAFARI_BUNDLE, { terminateRunning: true });
    await sleep(700);
    if (typeof device.openUrl === "function") {
      await device.openUrl("https://example.com");
      await sleep(2_000);
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

    await openSafariExtensionPopup(device, appexLabels, steps);

    // Content script / popup → background → native handler → App Group.
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 12_000);
    try {
      await tapId(device, "btn-refresh-safari", 4_000);
    } catch {
      try {
        await tapId(device, "btn-refresh", 2_000);
      } catch {
        /* optional */
      }
    }
    await sleep(500);

    let nativeOk = false;
    for (let i = 0; i < 16; i++) {
      try {
        await assertPayloadContains(
          device,
          "text-native-msg-status",
          NATIVE_MARKER,
          1_500,
        );
        nativeOk = true;
        break;
      } catch {
        try {
          await tapId(device, "btn-refresh-safari", 1_500);
        } catch {
          /* retry */
        }
        await sleep(500);
      }
    }
    if (!nativeOk) {
      const t = await device.accessibilityTree();
      throw new Error(
        `Safari native-msg App Group marker missing after example.com; labels=${flattenLabels(t).slice(0, 40).join("|")}`,
      );
    }
    steps.push("safari-runtime-native-msg");

    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      "content-script:expo-targets uitest safari content",
      5_000,
    );
    steps.push("safari-runtime-content-marker");

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
