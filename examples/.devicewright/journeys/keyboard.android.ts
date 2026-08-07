/**
 * Android dual of keyboard — full user story (parity with iOS typed:ET green).
 *
 * GREEN = IME settings lists ET Keyboard + enable + select as current +
 * software keyboard + ET key → host `typed:ET` (not device.type).
 * Listing alone is red.
 *
 * DeviceSession only. UiAutomator often omits the IME window, so ET may be
 * tapped via bottom-band coordinates when the label is not in the AX tree.
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { hostLaunchId, TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  ANDROID_POST_TAP_MS,
  ANDROID_SETTINGS_SETTLE_MS,
  assertPayloadContains,
  dismissSystemAlerts,
  flattenLabels,
  hostReadyTestId,
  sleep,
  tapId,
  tapNamedAndroid,
  waitForId,
} from "./helpers";

const ET_IME_MARKERS = ["ET Keyboard", "ET Keyboard Target"] as const;
const SETTINGS_PKG = "com.android.settings";

function labelsHit(labels: string[], needles: readonly string[]): boolean {
  const lower = labels.map((l) => l.toLowerCase());
  return needles.some((n) =>
    lower.some((l) => l === n.toLowerCase() || l.includes(n.toLowerCase())),
  );
}

function isImeSwitchNode(node: {
  type?: string;
  identifier?: string;
}): boolean {
  if (/Switch/i.test(String(node.type ?? ""))) return true;
  return String(node.identifier ?? "").includes("switchWidget");
}

/** UiAutomator `checked` lives on raw attrs — not a first-class AccessibilityNode field. */
function isNodeChecked(node: {
  checked?: boolean;
  value?: string;
  raw?: string;
}): boolean {
  if (node.checked === true) return true;
  if (/^(1|true|on|checked)$/i.test(String(node.value ?? ""))) return true;
  return /\bchecked="true"/i.test(String(node.raw ?? ""));
}

function screenSize(tree: Awaited<ReturnType<DeviceSession["accessibilityTree"]>>): {
  w: number;
  h: number;
} {
  let w = 720;
  let h = 1280;
  for (const n of tree) {
    if (!n.frame) continue;
    w = Math.max(w, n.frame.x + n.frame.width);
    h = Math.max(h, n.frame.y + n.frame.height);
  }
  return { w, h };
}

async function enableEtImeSwitch(
  device: DeviceSession,
  steps: string[],
): Promise<boolean> {
  const markers = ["ET Keyboard Target", "ET Keyboard"];
  const tree = await device.accessibilityTree();
  const { w: screenW } = screenSize(tree);

  for (const node of tree) {
    const label = (node.label ?? "").trim();
    if (!markers.some((m) => label.toLowerCase() === m.toLowerCase())) {
      continue;
    }
    const f = node.frame;
    if (!f || f.width < 8 || f.height < 8) continue;
    const looksLikeSwitch =
      isImeSwitchNode(node) && f.x > screenW * 0.55;
    if (!looksLikeSwitch) continue;
    if (isNodeChecked(node as { checked?: boolean; value?: string; raw?: string })) {
      steps.push("ime-switch-already-on");
      return true;
    }
    await device.tap({
      x: Math.round(f.x + f.width / 2),
      y: Math.round(f.y + f.height / 2),
    });
    await sleep(ANDROID_POST_TAP_MS);
    steps.push("ime-switch-tapped");
    await sleep(700);
    await dismissImeEnableDialogs(device, steps);
    return true;
  }

  // Fallback: title label → tap switch slot to its right.
  for (const node of tree) {
    const label = (node.label ?? "").trim();
    if (!markers.some((m) => label.toLowerCase().includes(m.toLowerCase()))) {
      continue;
    }
    const f = node.frame;
    if (!f || f.width < 40) continue;
    if (f.width < 220 && f.x > screenW * 0.55) continue;
    const x = Math.min(
      Math.round(screenW - 40),
      Math.round(f.x + f.width + Math.max(80, screenW * 0.08)),
    );
    const y = Math.round(f.y + f.height / 2);
    await device.tap({ x, y });
    await sleep(ANDROID_POST_TAP_MS);
    steps.push("ime-switch-slot-tapped");
    await dismissImeEnableDialogs(device, steps);
    return true;
  }
  return false;
}

/** AOSP may show Attention then a reboot-note dialog — accept up to a few OK/Allow. */
async function dismissImeEnableDialogs(
  device: DeviceSession,
  steps: string[],
): Promise<void> {
  for (let i = 0; i < 5; i++) {
    let hit = false;
    for (const en of ["OK", "Allow", "Enable", "Turn on"]) {
      if (await tapNamedAndroid(device, [en], 2_000)) {
        steps.push(`ime-enable-dialog:${en}`);
        hit = true;
        break;
      }
    }
    if (!hit) return;
    await sleep(350);
  }
}

async function waitForImeListed(
  device: DeviceSession,
  timeoutMs = 8_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const labels = flattenLabels(await device.accessibilityTree());
    if (
      labelsHit(labels, ET_IME_MARKERS) ||
      labels.some((l) => /et keyboard/i.test(l))
    ) {
      return true;
    }
    await sleep(250);
  }
  return false;
}

/**
 * Soft IME with a hardware keyboard: emulators often hide the on-screen IME
 * unless `show_ime_with_hard_keyboard=1`. Full Settings hunt is slow/flaky on
 * API 34 — leave a short breadcrumb; operator/CI can pre-set the secure flag.
 */
async function ensureShowImeWithHardKeyboard(
  device: DeviceSession,
  steps: string[],
): Promise<void> {
  // Best-effort only: if Physical keyboard / show-on-screen is already open
  // from a prior drill, flip it; otherwise continue (typed:ET is the gate).
  for (const label of [
    "Show on-screen keyboard",
    "Use on-screen keyboard",
    "Show virtual keyboard",
  ]) {
    if (await tapNamedAndroid(device, [label], 800)) {
      steps.push(`hard-keyboard:${label}`);
      await sleep(ANDROID_POST_TAP_MS);
      return;
    }
  }
  steps.push("show-ime-toggle-skip");
}

/** Pick ET from the system IME chooser (AX-visible dialog). */
async function selectEtFromImePicker(
  device: DeviceSession,
  steps: string[],
): Promise<boolean> {
  const tree = await device.accessibilityTree();
  const labels = flattenLabels(tree);
  if (!labels.some((l) => /et keyboard target/i.test(l))) {
    return false;
  }
  // Header "ET Keyboard Target" is not clickable — subtype row is.
  if (await tapNamedAndroid(device, ["English (United States)"], 2_500)) {
    steps.push("ime-picker-et-subtype");
    await sleep(ANDROID_POST_TAP_MS);
    return true;
  }
  // Fallback: tap just below the ET Keyboard Target header label.
  for (const node of tree) {
    const label = (node.label ?? "").trim();
    if (!/^ET Keyboard Target$/i.test(label) || !node.frame) continue;
    const f = node.frame;
    await device.tap({
      x: Math.round(f.x + f.width / 2),
      y: Math.round(f.y + f.height + 60),
    });
    steps.push("ime-picker-et-below-header");
    await sleep(ANDROID_POST_TAP_MS);
    return true;
  }
  return false;
}

/**
 * Select ET as the current IME via host `etkeyboard://ime-picker`
 * (InputMethodManager.showInputMethodPicker) — floating Gboard chrome is
 * opaque to UiAutomator / unreliable for globe taps.
 */
async function selectEtAsCurrentIme(
  device: DeviceSession,
  steps: string[],
): Promise<void> {
  try {
    await device.openUrl("etkeyboard://ime-picker");
    steps.push("ime-picker-url");
    await sleep(ANDROID_SETTINGS_SETTLE_MS);
  } catch {
    steps.push("ime-picker-url-miss");
    try {
      await tapId(device, "btn-show-ime-picker", 3_000);
      steps.push("ime-picker-button");
      await sleep(ANDROID_SETTINGS_SETTLE_MS);
    } catch {
      steps.push("ime-picker-button-miss");
    }
  }

  // Picker can take a beat to populate enabled IMEs.
  for (let i = 0; i < 4; i++) {
    if (await selectEtFromImePicker(device, steps)) return;
    await sleep(400);
  }

  const tree = await device.accessibilityTree();
  const { w, h } = screenSize(tree);
  await device.tap({
    x: Math.round(w * 0.92),
    y: Math.round(h * 0.97),
  });
  await sleep(ANDROID_POST_TAP_MS);
  steps.push("ime-switcher-tapped");

  if (!(await selectEtFromImePicker(device, steps))) {
    steps.push("ime-select-miss");
    // Dismiss leftover chooser so the next host tapId can see the field.
    await device.pressButton({ button: "BACK" });
    await sleep(ANDROID_POST_TAP_MS);
  }
}

/** Tap the ET key — AX label first, then bottom-left IME band (uiautomator omits IME). */
async function tapEtKey(
  device: DeviceSession,
  steps: string[],
): Promise<boolean> {
  if (await tapNamedAndroid(device, ["ET"], 1_500)) {
    steps.push("ime-et-key");
    return true;
  }

  const tree = await device.accessibilityTree();
  const { w, h } = screenSize(tree);
  // ExpoTargets IME wraps content and sits bottom-center (~400×126 on 1080×2400).
  // UiAutomator omits the IME window — probe left half of that band.
  const points = [
    { x: Math.round(w * 0.41), y: Math.round(h - 80) },
    { x: Math.round(w * 0.45), y: Math.round(h - 95) },
    { x: Math.round(w * 0.35), y: Math.round(h - 70) },
    { x: Math.round(w * 0.24), y: Math.round(h - 90) },
  ];
  for (const p of points) {
    await device.tap(p);
    await sleep(200);
    steps.push(`ime-et-key-coord:${p.x},${p.y}`);
    try {
      await assertPayloadContains(device, "text-last-payload", "typed:ET", 1_200);
      steps.push("ime-et-key");
      return true;
    } catch {
      // try next point
    }
  }
  steps.push("ime-et-key-miss");
  return false;
}

export async function runAndroidKeyboardJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG.keyboard;
  const pathStr = entry?.path ?? "examples/keyboard";
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("keyboard: missing catalog entry");
    const pkg = hostLaunchId(entry, "android");

    steps.push("android-launch-host");
    await device.launchApp(pkg, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 12_000);
    steps.push("host-ready");

    // Settings may be stuck on Physical keyboard from a prior intent delivery —
    // force a clean Settings process before INPUT_METHOD_SETTINGS.
    await device.launchApp(SETTINGS_PKG, { terminateRunning: true });
    await sleep(200);
    await device.pressButton({ button: "HOME" });
    await sleep(200);
    await device.launchApp(pkg, { terminateRunning: false });
    await waitForId(device, hostReadyTestId(entry.testIds), 10_000);

    await tapId(device, "btn-open-ime-settings", 8_000);
    steps.push("open-ime-settings");
    await sleep(ANDROID_SETTINGS_SETTLE_MS);
    await dismissSystemAlerts(device);

    // Avoid bare "Keyboards" — substring-matches "Physical keyboard".
    for (const label of [
      "On-screen keyboard",
      "Virtual keyboard",
      "Manage on-screen keyboards",
      "Managed keyboards",
    ]) {
      if (await tapNamedAndroid(device, [label], 2_000)) {
        steps.push(`settings-drill:${label}`);
      }
    }

    // If we landed on Physical keyboard, back out and re-open IME settings.
    {
      const labels = flattenLabels(await device.accessibilityTree());
      if (
        labels.some((l) => /^Physical keyboard$/i.test(l)) &&
        !labelsHit(labels, ET_IME_MARKERS)
      ) {
        steps.push("settings-wrong-page:physical-keyboard");
        await device.pressButton({ button: "BACK" });
        await sleep(ANDROID_POST_TAP_MS);
        await device.launchApp(SETTINGS_PKG, { terminateRunning: true });
        await sleep(200);
        await device.pressButton({ button: "HOME" });
        await sleep(200);
        await device.launchApp(pkg, { terminateRunning: false });
        await waitForId(device, hostReadyTestId(entry.testIds), 10_000);
        await tapId(device, "btn-open-ime-settings", 8_000);
        steps.push("open-ime-settings-retry");
        await sleep(ANDROID_SETTINGS_SETTLE_MS);
      }
    }

    let listed = await waitForImeListed(device, 8_000);
    if (!listed) {
      for (let i = 0; i < 4 && !listed; i++) {
        await device.swipe({
          xStart: 540,
          yStart: 1600,
          xEnd: 540,
          yEnd: 600,
          duration: 0.3,
        });
        await sleep(300);
        listed = await waitForImeListed(device, 2_500);
      }
    }

    if (!listed) {
      const labels = flattenLabels(await device.accessibilityTree());
      throw new Error(
        `IME settings missing ET Keyboard; labels=${labels.slice(0, 80).join(", ")}`,
      );
    }
    steps.push("ime-listed");

    const enabled = await enableEtImeSwitch(device, steps);
    if (!enabled) {
      if (
        await tapNamedAndroid(device, ["ET Keyboard", "ET Keyboard Target"], 2_500)
      ) {
        steps.push("ime-row-opened");
        for (const en of [
          "Use ET Keyboard",
          "Enable",
          "OK",
          "Allow",
          "Turn on",
        ]) {
          if (await tapNamedAndroid(device, [en], 1_200)) {
            steps.push(`ime-enable:${en}`);
          }
        }
      } else {
        throw new Error("Could not enable ET Keyboard IME switch");
      }
    }

    // Confirm Attention was accepted — otherwise picker will omit ET.
    if (!steps.some((s) => s.startsWith("ime-enable-dialog:") || s === "ime-switch-already-on" || s.startsWith("ime-enable:"))) {
      await sleep(500);
      await dismissImeEnableDialogs(device, steps);
    }

    await ensureShowImeWithHardKeyboard(device, steps);

    await device.pressButton({ button: "HOME" });
    await sleep(200);
    await device.launchApp(pkg, { terminateRunning: false });
    await waitForId(device, hostReadyTestId(entry.testIds), 10_000);
    await tapId(device, "input-type-field", 5_000);
    await sleep(ANDROID_POST_TAP_MS);

    await selectEtAsCurrentIme(device, steps);
    // Picker activity can drop us to launcher — bring host back.
    await device.launchApp(pkg, { terminateRunning: false });
    await waitForId(device, hostReadyTestId(entry.testIds), 10_000);
    await tapId(device, "input-type-field", 5_000);
    await sleep(ANDROID_POST_TAP_MS);

    const tapped = await tapEtKey(device, steps);
    if (!tapped) {
      throw new Error(
        "ET key tap did not produce typed:ET (IME not selected, soft keyboard hidden, or key miss)",
      );
    }
    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      "typed:ET",
      5_000,
    );
    steps.push("typed-et-ok");

    return {
      id: "keyboard",
      path: pathStr,
      phase: 5,
      ok: true,
      status: "green",
      steps: [...steps, "keyboard-android-deepen-ok"],
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
      id: "keyboard",
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
