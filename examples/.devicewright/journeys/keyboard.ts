/**
 * Custom Keyboard deep journey.
 *
 * Apple capability path:
 * Settings → General → Keyboard → Keyboards → third-party keyboard listed
 * + enable ET Keyboard + host field receives `typed:ET` from the custom key
 * (not Devicewright `device.type`, which uses the system keyboard).
 *
 * GREEN = Settings lists ET Keyboard + software keyboard + ET key → typed:ET.
 * Full Access is optional for textDocumentProxy.insertText (still toggled On
 * when the Settings row exposes it). Pluginkit alone is never green.
 *
 * Note: `App-prefs:…Keyboard` deep links are unreliable on iOS 26 (often land
 * on Siri). Navigate Settings → General → Keyboard instead.
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

function isToggleOn(value: unknown): boolean {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "on";
}

/**
 * Simulator often hides the software keyboard when hardware keyboard is
 * connected. Force ConnectHardwareKeyboard off + Cmd+K after field focus.
 */
function ensureSimulatorSoftwareKeyboard(steps: string[]): void {
  spawnSync(
    "defaults",
    [
      "write",
      "com.apple.iphonesimulator",
      "ConnectHardwareKeyboard",
      "-bool",
      "false",
    ],
    { encoding: "utf8" },
  );
  const toggled = spawnSync(
    "osascript",
    [
      "-e",
      'tell application "Simulator" to activate\ndelay 0.25\ntell application "System Events" to keystroke "k" using command down',
    ],
    { encoding: "utf8" },
  );
  steps.push(
    toggled.status === 0
      ? "sim-software-keyboard-toggle"
      : "sim-software-keyboard-toggle-skip",
  );
}

/** Keyboard is required green — no CLAIMS escape. */
function keyboardRed(
  path: string,
  steps: string[],
  detail: string,
): TargetJourneyResult {
  return {
    id: "keyboard",
    path,
    phase: 5,
    ok: false,
    status: "red",
    steps: [...steps, "keyboard-demo-failed"],
    failureKind: "product",
    error: detail,
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
  // BackButton is an identifier — tapLabelInTree only matches labels.
  for (let i = 0; i < 10; i++) {
    const labels = flattenLabels(await device.accessibilityTree());
    const onRoot =
      labels.some((l) => /^General$/i.test(l.trim())) &&
      !labels.some((l) => /^Voice$/i.test(l.trim())) &&
      !labels.some((l) => /^Siri$/i.test(l.trim()) && labels.includes("Voice"));
    if (onRoot) break;
    try {
      await device.getById("BackButton", { timeoutMs: 1_200 }).tap();
      steps.push("settings-back:id");
    } catch {
      const backed = await tapLabelInTree(device, ["Back"], { exactOnly: true });
      if (!backed) {
        await device.tap({ x: 40, y: 90 });
        steps.push("settings-back-hotspot");
      } else {
        steps.push("settings-back:label");
      }
    }
    await sleep(450);
  }

  // Still nested? Cold-relaunch Settings.
  {
    const labels = flattenLabels(await device.accessibilityTree());
    if (
      !labels.some((l) => /^General$/i.test(l.trim())) ||
      labels.some((l) => /^Voice$/i.test(l.trim()))
    ) {
      spawnSync(
        "xcrun",
        ["simctl", "terminate", device.deviceId, SETTINGS_BUNDLE],
        { encoding: "utf8", env: process.env },
      );
      await sleep(400);
      await device.launchApp(SETTINGS_BUNDLE, { terminateRunning: true });
      await sleep(900);
      await dismissSystemAlerts(device);
      steps.push("settings-relaunch-root");
    }
  }

  await scrollUntilVisible(device, ["General"], 10);
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

function etKeyVisible(
  tree: Awaited<ReturnType<DeviceSession["accessibilityTree"]>>,
): boolean {
  return tree.some((n) => {
    const id = String(n.identifier ?? "");
    const label = String(n.label ?? "").trim();
    return id === "keyboard-key-et" || label === "ET";
  });
}

function softwareKeyboardVisible(
  tree: Awaited<ReturnType<DeviceSession["accessibilityTree"]>>,
): boolean {
  return (
    isSystemQwertyVisible(tree) ||
    !!findNextKeyboardNode(tree) ||
    etKeyVisible(tree) ||
    tree.some((n) => /^(shift|delete|space|return|emoji)$/i.test((n.label ?? "").trim()))
  );
}

async function waitForSoftwareKeyboard(
  device: DeviceSession,
  steps: string[],
): Promise<boolean> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const tree = await device.accessibilityTree();
    if (softwareKeyboardVisible(tree)) {
      steps.push(`software-keyboard-visible:${attempt}`);
      return true;
    }
    ensureSimulatorSoftwareKeyboard(steps);
    await sleep(700);
    // Re-tap field — Simulator sometimes eats the first focus after Cmd+K.
    await tapLabelInTree(device, ["Type into field", "input-type-field"]);
    await sleep(600);
  }
  return softwareKeyboardVisible(await device.accessibilityTree());
}

/**
 * Cycle "Next keyboard" until ET key AX appears (or QWERTY disappears with
 * Next keyboard still present).
 */
async function switchToEtKeyboard(
  device: DeviceSession,
  steps: string[],
): Promise<boolean> {
  for (let i = 0; i < 8; i++) {
    const tree = await device.accessibilityTree();
    if (etKeyVisible(tree)) {
      steps.push("et-keyboard-chrome-visible");
      return true;
    }
    if (!isSystemQwertyVisible(tree) && findNextKeyboardNode(tree)) {
      // Likely a non-QWERTY keyboard (emoji / custom) — try tapping ET canvas.
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
        "Emoji",
      ]);
      if (!tapped) {
        // Globe / next-keyboard dock corners on iPhone Air.
        await device.tap({ x: 42, y: 878 });
        await sleep(200);
        await device.tap({ x: 56, y: 860 });
        steps.push("next-keyboard-hotspot");
      } else {
        steps.push("next-keyboard-tap");
      }
    }
    await sleep(700);
  }
  const tree = await device.accessibilityTree();
  if (etKeyVisible(tree)) {
    steps.push("et-keyboard-chrome-visible");
    return true;
  }
  if (!isSystemQwertyVisible(tree) && findNextKeyboardNode(tree)) {
    steps.push("et-keyboard-chrome-visible");
    return true;
  }
  return false;
}

/** Tap ET key — prefer AX id/label, else canvas above Next keyboard. */
async function tapEtKeyboardKey(device: DeviceSession): Promise<void> {
  const tree = await device.accessibilityTree();
  const et = tree.find((n) => {
    const id = String(n.identifier ?? "");
    const label = String(n.label ?? "").trim();
    return id === "keyboard-key-et" || label === "ET";
  });
  if (et?.frame) {
    const f = et.frame;
    await device.tap({
      x: Math.round(f.x + f.width / 2),
      y: Math.round(f.y + f.height / 2),
    });
    await sleep(400);
    await assertPayloadContains(device, "text-last-payload", "typed:ET", 3_000);
    return;
  }

  const next = findNextKeyboardNode(tree);
  const points: Array<{ x: number; y: number }> = [];
  if (next?.frame) {
    const f = next.frame;
    const cx = Math.round(f.x + f.width / 2);
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

/**
 * Best-effort Full Access On. Not required for insertText("ET") green, but we
 * flip it when the detail page exposes the switch (RequestsOpenAccess).
 */
async function ensureFullAccessOn(
  device: DeviceSession,
  steps: string[],
): Promise<void> {
  const tree = await device.accessibilityTree();
  const toggle =
    tree.find((n) => /Allow Full Access/i.test((n.label ?? "").trim())) ??
    tree.find((n) => /^Full Access$/i.test((n.label ?? "").trim()));
  if (!toggle?.frame) {
    // Still on the Keyboards list — open the ET Keyboard detail row first.
    const opened = await tapLabelInTree(device, [
      "ET Keyboard Target — ET Keyboard",
      "ET Keyboard Target",
      "ET Keyboard",
    ]);
    if (opened) {
      steps.push("keyboard-detail-open");
      await sleep(700);
    } else {
      steps.push("keyboard-full-access-absent");
      return;
    }
  }
  const after = await device.accessibilityTree();
  const switchNode =
    after.find((n) => /Allow Full Access/i.test((n.label ?? "").trim())) ??
    after.find((n) => /^Full Access$/i.test((n.label ?? "").trim()));
  if (!switchNode?.frame) {
    steps.push("keyboard-full-access-absent");
    return;
  }
  if (isToggleOn(switchNode.value)) {
    steps.push("keyboard-full-access-already-on");
    return;
  }
  const f = switchNode.frame;
  await device.tap({
    x: Math.round(f.x + f.width * 0.85),
    y: Math.round(f.y + f.height / 2),
  });
  await sleep(600);
  // Confirm alert — prefer exact Allow, avoid unrelated buttons.
  await tapLabelInTree(device, ["Allow"], { exactOnly: true });
  await sleep(400);
  const confirmed = await device.accessibilityTree();
  const again =
    confirmed.find((n) => /Allow Full Access/i.test((n.label ?? "").trim())) ??
    confirmed.find((n) => /^Full Access$/i.test((n.label ?? "").trim()));
  steps.push(
    isToggleOn(again?.value)
      ? "keyboard-full-access-on"
      : "keyboard-full-access-tap-unconfirmed",
  );
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
      await ensureFullAccessOn(device, steps);
      steps.push("keyboard-selected");
    } catch (settingsErr) {
      return keyboardRed(
        path,
        steps,
        `Settings enable failed: ${String(settingsErr).slice(0, 160)}`,
      );
    }

    if (!listedViaSettings) {
      return keyboardRed(
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
    ensureSimulatorSoftwareKeyboard(steps);
    await sleep(700);

    if (!(await waitForSoftwareKeyboard(device, steps))) {
      return keyboardRed(
        path,
        steps,
        "Software keyboard never appeared after field focus (Simulator hardware keyboard?)",
      );
    }

    // Detect system QWERTY (`q`) vs ET chrome, switch via "Next keyboard".
    const switched = await switchToEtKeyboard(device, steps);
    if (!switched) {
      return keyboardRed(
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
      return keyboardRed(
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
