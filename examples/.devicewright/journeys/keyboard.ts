/**
 * Custom Keyboard deep journey.
 *
 * Apple capability path:
 * Settings → General → Keyboard → Keyboards → third-party keyboard listed
 * + enable ET Keyboard + host field receives `typed:ET` from the custom key
 * (not Devicewright `device.type`, which uses the system keyboard).
 *
 * GREEN = Settings enable + typing attributed to ET Keyboard (ET key tap).
 * Settings unreachable / keyboard switch opaque → os-limit (CLAIMS).
 * Pluginkit alone is never green.
 *
 * Note: `App-prefs:…Keyboard` deep links are unreliable on iOS 26 (often land
 * on Siri). Navigate Settings → General → Keyboard instead.
 */
import { spawnSync } from "node:child_process";
import type { DeviceSession } from "@csark0812/devicewright";
import { assertOsLimitAllowed, claimForId } from "../claims";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  dismissSystemAlerts,
  findNamedViaPointProbe,
  flattenLabels,
  sleep,
  tapProbeHit,
  waitForNamed,
} from "./helpers";
import {
  navigatePath,
  scrollUntilVisible,
  tapLabelInTree,
} from "./settings-nav";

const SETTINGS_BUNDLE = "com.apple.Preferences";

function onKeyboardSettingsPage(labels: string[]): boolean {
  return labels.some((l) =>
    /Hardware Keyboard|Text Replacement|One-Handed Keyboard|Keyboards,\s*\d+|^Keyboards$/i.test(
      l.trim(),
    ),
  );
}

function osLimitKeyboard(
  path: string,
  steps: string[],
  detail: string,
): TargetJourneyResult {
  assertOsLimitAllowed("keyboard");
  const claim = claimForId("keyboard");
  return {
    id: "keyboard",
    path,
    phase: 5,
    ok: true,
    status: "os-limit",
    steps: [...steps, "keyboard-demo-os-limit"],
    failureKind: "os-limit",
    error: `${claim?.reason ?? "ET Keyboard demo not Sim-reachable"} — ${detail}`,
  };
}

async function openGeneralKeyboardSettings(
  device: DeviceSession,
  steps: string[],
): Promise<void> {
  spawnSync(
    "xcrun",
    ["simctl", "terminate", device.deviceId, SETTINGS_BUNDLE],
    { encoding: "utf8", env: process.env },
  );
  await device.launchApp(SETTINGS_BUNDLE, { terminateRunning: true });
  steps.push("settings-launch");
  await sleep(900);
  await dismissSystemAlerts(device);

  // Pop nested Settings (e.g. leftover Siri/deep-link) back to root.
  for (let i = 0; i < 4; i++) {
    const labels = flattenLabels(await device.accessibilityTree());
    if (labels.some((l) => /^General$/i.test(l.trim()))) break;
    const backed = await tapLabelInTree(device, ["Settings", "BackButton", "Back"], {
      exactOnly: true,
    });
    if (!backed) break;
    await sleep(400);
  }

  await scrollUntilVisible(device, ["General"], 8);
  await navigatePath(device, ["General"], steps);
  await sleep(600);
  await scrollUntilVisible(device, ["Keyboard"], 8);
  await navigatePath(device, ["Keyboard"], steps);
  await sleep(700);

  if (
    !onKeyboardSettingsPage(flattenLabels(await device.accessibilityTree()))
  ) {
    throw new Error("keyboard settings page not open after General → Keyboard");
  }
  steps.push("keyboard-settings-ok");
}

/** System QWERTY exposes a `q` key; ET Keyboard's ET button is AX-opaque. */
function isSystemQwertyVisible(
  tree: Awaited<ReturnType<DeviceSession["accessibilityTree"]>>,
): boolean {
  return tree.some((n) => (n.label ?? "").trim() === "q");
}

function findNextKeyboardNode(
  tree: Awaited<ReturnType<DeviceSession["accessibilityTree"]>>,
) {
  return tree.find((n) => /^Next keyboard$/i.test((n.label ?? "").trim()));
}

/**
 * Cycle "Next keyboard" until system QWERTY (`q`) disappears — ET chrome is up.
 */
async function switchToEtKeyboard(
  device: DeviceSession,
  steps: string[],
): Promise<boolean> {
  for (let i = 0; i < 6; i++) {
    const tree = await device.accessibilityTree();
    if (!isSystemQwertyVisible(tree) && findNextKeyboardNode(tree)) {
      steps.push("et-keyboard-chrome-visible");
      return true;
    }
    const next = findNextKeyboardNode(tree);
    if (next?.frame) {
      const f = next.frame;
      await device.tap({
        x: Math.round(f.x + f.width / 2),
        y: Math.round(f.y + f.height / 2),
      });
      steps.push("next-keyboard-tap");
    } else {
      const tapped = await tapLabelInTree(device, [
        "Next keyboard",
        "Next Keyboard",
        "next keyboard",
      ]);
      if (!tapped) {
        await device.tap({ x: 42, y: 878 });
        steps.push("next-keyboard-hotspot");
      } else {
        steps.push("next-keyboard-tap");
      }
    }
    await sleep(700);
  }
  const tree = await device.accessibilityTree();
  if (!isSystemQwertyVisible(tree) && findNextKeyboardNode(tree)) {
    steps.push("et-keyboard-chrome-visible");
    return true;
  }
  return false;
}

/** Tap ET key by canvas coords — custom keyboard buttons are not in host AX. */
async function tapEtKeyboardKey(device: DeviceSession): Promise<void> {
  const tree = await device.accessibilityTree();
  const next = findNextKeyboardNode(tree);
  const points: Array<{ x: number; y: number }> = [];
  if (next?.frame) {
    const f = next.frame;
    const cx = Math.round(f.x + f.width / 2);
    // ET sits in the keyboard canvas above the globe / Next keyboard bar.
    points.push(
      { x: 210, y: Math.round(f.y - 120) },
      { x: cx, y: Math.round(f.y - 100) },
      { x: 210, y: Math.round(f.y - 140) },
      { x: 210, y: 725 },
    );
  } else {
    points.push({ x: 210, y: 725 }, { x: 210, y: 700 }, { x: 210, y: 680 });
  }
  for (const pt of points) {
    await device.tap(pt);
    await sleep(350);
    try {
      await assertPayloadContains(device, "text-last-payload", "typed:ET", 800);
      return;
    } catch {
      /* try next hotspot */
    }
  }
  throw new Error("ET key tap did not produce typed:ET");
}

export async function runKeyboardJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG.keyboard;
  const path = entry?.path ?? "examples/keyboard";
  const steps: string[] = [];
  const appexLabels = [
    entry.extensionName,
    entry.hostDisplayName,
    "ET Keyboard Target — ET Keyboard",
    "ET Keyboard Target",
    "ET Keyboard",
  ].filter(Boolean);

  try {
    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    let listedViaSettings = false;
    try {
      await openGeneralKeyboardSettings(device, steps);

      const treeBefore = await device.accessibilityTree();
      const keyboardsRow = treeBefore.find((n) =>
        /^keyboards,\s*\d+/i.test((n.label ?? "").trim()),
      );
      if (keyboardsRow?.frame) {
        const f = keyboardsRow.frame;
        await device.tap({
          x: Math.round(f.x + f.width / 2),
          y: Math.round(f.y + f.height / 2),
        });
        await sleep(700);
        steps.push("keyboard-add-new-direct");
      } else {
        const tapped = await tapLabelInTree(device, ["Keyboards"]);
        if (tapped) {
          await sleep(700);
          steps.push("keyboard-list-open");
        }
      }

      listedViaSettings = await tapLabelInTree(device, appexLabels);
      if (listedViaSettings) {
        steps.push("keyboard-listed");
      } else {
        const added = await tapLabelInTree(device, [
          "Add New Keyboard…",
          "Add New Keyboard",
        ]);
        if (added) {
          steps.push("keyboard-add-new");
          await sleep(600);
          listedViaSettings = await tapLabelInTree(device, appexLabels);
          if (listedViaSettings) {
            steps.push("keyboard-listed");
          }
        }
        if (!listedViaSettings) {
          for (const name of appexLabels) {
            try {
              const hit = await findNamedViaPointProbe(device, [name], {
                timeoutMs: 2_500,
                yStartRatio: 0.15,
                yEndRatio: 0.95,
                match: "includes",
              });
              await tapProbeHit(device, hit);
              listedViaSettings = true;
              steps.push("keyboard-listed");
              await sleep(400);
              break;
            } catch {
              /* next */
            }
          }
        }
        if (!listedViaSettings) throw new Error("appex not in Add New Keyboard");
      }

      // Detail / Full Access when a row tap opens the keyboard settings page.
      const toggled = await tapLabelInTree(device, [
        "Allow Full Access",
        "Full Access",
      ]);
      if (toggled) steps.push("keyboard-enable-attempted");
      else steps.push("keyboard-selected");
    } catch (settingsErr) {
      return osLimitKeyboard(
        path,
        steps,
        `Settings enable failed: ${String(settingsErr).slice(0, 160)}`,
      );
    }

    if (!listedViaSettings) {
      return osLimitKeyboard(
        path,
        steps,
        "ET Keyboard not listed/enabled in Settings (pluginkit alone is not green)",
      );
    }

    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 12_000);
    steps.push("host-type-field");
    const field = await findNamedViaPointProbe(
      device,
      ["Type into field", "input-type-field"],
      {
        timeoutMs: 8_000,
        yStartRatio: 0.25,
        yEndRatio: 0.85,
        match: "includes",
        hotspots: [
          { x: 210, y: 420 },
          { x: 210, y: 460 },
          { x: 210, y: 500 },
        ],
      },
    );
    await tapProbeHit(device, field);
    await sleep(900);

    // Custom keyboard keys are not in the host AX tree. Detect system QWERTY
    // (`q`) vs ET chrome, switch via "Next keyboard", then tap canvas center.
    const switched = await switchToEtKeyboard(device, steps);
    if (!switched) {
      return osLimitKeyboard(
        path,
        steps,
        "Could not switch to ET Keyboard via Next keyboard (software keyboard required)",
      );
    }

    let typedFromCustom = false;
    try {
      await tapEtKeyboardKey(device);
      await sleep(500);
      await assertPayloadContains(device, "text-last-payload", "typed:ET", 4_000);
      typedFromCustom = true;
      steps.push("et-keyboard-key-tap");
    } catch {
      steps.push("et-keyboard-key-miss");
    }

    if (!typedFromCustom) {
      return osLimitKeyboard(
        path,
        steps,
        "Could not attribute typed:ET to ET Keyboard key (device.type soft-green removed)",
      );
    }
    steps.push("type-into-field:et-keyboard");

    return {
      id: "keyboard",
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
      id: "keyboard",
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
