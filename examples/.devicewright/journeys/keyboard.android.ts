/**
 * Android dual of keyboard — full user story (parity with iOS typed:ET green).
 *
 * GREEN = enable + select ET Keyboard as current IME + software keyboard +
 * ET key → host `typed:ET` (not device.type). Listing alone is red.
 *
 * DeviceSession IME surfaces (DW ≥ 0.1.20): prefer `setInputMethod` for CI;
 * `showInputMethodPicker` + `imeAccessibilityTree` when UI select is required.
 * Soft-keyboard key nodes may be omitted by UiAutomator — prefer AX when
 * present; coord fallback only if needed.
 */
import type { AccessibilityNode, DeviceSession } from "@csark0812/devicewright";
import { hostLaunchId, TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  ANDROID_POST_TAP_MS,
  assertPayloadContains,
  dismissSystemAlerts,
  flattenLabels,
  hostReadyTestId,
  sleep,
  tapId,
  tapNamedAndroid,
  waitForId,
} from "./helpers";

function screenSize(tree: AccessibilityNode[]): { w: number; h: number } {
  let w = 720;
  let h = 1280;
  for (const n of tree) {
    if (!n.frame) continue;
    w = Math.max(w, n.frame.x + n.frame.width);
    h = Math.max(h, n.frame.y + n.frame.height);
  }
  return { w, h };
}

function isEtImeId(id: string): boolean {
  return (
    id.includes("com.expotargets.example.keyboard/") &&
    /KeyboardInputMethodService/i.test(id)
  );
}

async function resolveEtImeId(device: DeviceSession): Promise<string> {
  const all = await device.listInputMethods({ all: true });
  const hit = all.find(isEtImeId);
  if (!hit) {
    throw new Error(
      `IME list missing ET Keyboard; ids=${all.slice(0, 40).join(", ")}`,
    );
  }
  return hit;
}

async function tapImeTreeLabel(
  device: DeviceSession,
  tree: AccessibilityNode[],
  match: (label: string) => boolean,
): Promise<boolean> {
  for (const node of tree) {
    const label = (node.label ?? "").trim();
    if (!match(label) || !node.frame) continue;
    const f = node.frame;
    if (f.width < 8 || f.height < 8) continue;
    await device.tap({
      x: Math.round(f.x + f.width / 2),
      y: Math.round(f.y + f.height / 2),
    });
    await sleep(ANDROID_POST_TAP_MS);
    return true;
  }
  return false;
}

/** Pick ET from the system IME chooser via imeAccessibilityTree. */
async function selectEtFromImePicker(
  device: DeviceSession,
  steps: string[],
): Promise<boolean> {
  const tree = await device.imeAccessibilityTree();
  const labels = flattenLabels(tree);
  if (!labels.some((l) => /et keyboard/i.test(l))) {
    return false;
  }
  // Header "ET Keyboard Target" is not clickable — subtype row is.
  if (
    await tapImeTreeLabel(device, tree, (l) =>
      /^English \(United States\)$/i.test(l),
    )
  ) {
    steps.push("ime-picker-et-subtype");
    return true;
  }
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
 * Select ET as current IME. CI path: `setInputMethod`. Fallback: system
 * picker (no host activity) + AX tap.
 */
async function selectEtAsCurrentIme(
  device: DeviceSession,
  imeId: string,
  steps: string[],
): Promise<void> {
  try {
    await device.setInputMethod(imeId);
    steps.push("ime-set");
    const current = await device.currentInputMethod();
    if (current && isEtImeId(current)) {
      steps.push("ime-current-ok");
      return;
    }
    steps.push(`ime-current-unexpected:${current ?? "null"}`);
  } catch (e) {
    steps.push(`ime-set-miss:${String(e).slice(0, 120)}`);
  }

  await device.showInputMethodPicker();
  steps.push("ime-picker-shown");
  await sleep(ANDROID_POST_TAP_MS);

  for (let i = 0; i < 4; i++) {
    if (await selectEtFromImePicker(device, steps)) {
      const current = await device.currentInputMethod();
      if (current && isEtImeId(current)) {
        steps.push("ime-current-ok");
        return;
      }
      steps.push("ime-picker-selected");
      return;
    }
    await sleep(400);
  }

  steps.push("ime-select-miss");
  await device.pressButton({ button: "BACK" });
  await sleep(ANDROID_POST_TAP_MS);
}

async function tapLabeledEtKey(
  device: DeviceSession,
  tree: AccessibilityNode[],
  steps: string[],
  source: string,
): Promise<boolean> {
  for (const node of tree) {
    const label = (node.label ?? "").trim();
    if (label !== "ET" || !node.frame) continue;
    const f = node.frame;
    if (f.width < 8 || f.height < 8) continue;
    await device.tap({
      x: Math.round(f.x + f.width / 2),
      y: Math.round(f.y + f.height / 2),
    });
    steps.push(`ime-et-key:${source}`);
    return true;
  }
  return false;
}

/** Tap the ET key — IME AX first, then main tree, then bottom-band coords. */
async function tapEtKey(
  device: DeviceSession,
  steps: string[],
): Promise<boolean> {
  try {
    const imeTree = await device.imeAccessibilityTree();
    if (await tapLabeledEtKey(device, imeTree, steps, "ime-ax")) {
      return true;
    }
  } catch {
    steps.push("ime-ax-miss");
  }

  if (await tapNamedAndroid(device, ["ET"], 1_500)) {
    steps.push("ime-et-key:ax");
    return true;
  }

  const tree = await device.accessibilityTree();
  if (await tapLabeledEtKey(device, tree, steps, "main-ax")) {
    return true;
  }

  const { w, h } = screenSize(tree);
  // ExpoTargets IME wraps content and sits bottom-center; UiAutomator often
  // omits the IME window — probe left half of that band.
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
      steps.push("ime-et-key:coord");
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

    // AVDs with hw.keyboard=yes hide the soft IME unless this secure flag is on.
    await device.setShowImeWithHardKeyboard(true);
    steps.push("show-ime-with-hard-keyboard");

    const imeId = await resolveEtImeId(device);
    steps.push(`ime-listed:${imeId}`);

    await selectEtAsCurrentIme(device, imeId, steps);

    await device.launchApp(pkg, { terminateRunning: false });
    await waitForId(device, hostReadyTestId(entry.testIds), 10_000);
    await tapId(device, "btn-clear-payload", 5_000).catch(() => undefined);
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
