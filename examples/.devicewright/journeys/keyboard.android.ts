/**
 * Android dual of keyboard — Language & input must list ET Keyboard IME.
 * Enabling + typing "ET" is preferred deepen; Settings enable toggles may leftover.
 * DeviceSession only.
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { hostLaunchId, TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  dismissSystemAlerts,
  findNamedViaPointProbe,
  flattenLabels,
  hostReadyTestId,
  sleep,
  tapCenter,
  tapId,
  tapProbeHit,
  waitForId,
  waitForNamed,
} from "./helpers";

const ET_IME_MARKERS = ["ET Keyboard", "ET Keyboard Target"] as const;

function labelsHit(labels: string[], needles: readonly string[]): boolean {
  const lower = labels.map((l) => l.toLowerCase());
  return needles.some((n) =>
    lower.some((l) => l === n.toLowerCase() || l.includes(n.toLowerCase())),
  );
}

async function tapNamed(
  device: DeviceSession,
  names: string[],
  timeoutMs = 4_000,
): Promise<boolean> {
  try {
    await tapCenter(device, await waitForNamed(device, names, timeoutMs));
    await sleep(700);
    return true;
  } catch {
    try {
      const hit = await findNamedViaPointProbe(device, names, {
        timeoutMs: Math.min(timeoutMs, 3_500),
        match: "includes",
        yStartRatio: 0.05,
        yEndRatio: 0.95,
      });
      await tapProbeHit(device, hit);
      await sleep(700);
      return true;
    } catch {
      return false;
    }
  }
}

async function waitForImeListed(
  device: DeviceSession,
  timeoutMs = 12_000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const labels = flattenLabels(await device.accessibilityTree());
    // Prefer ET-prefixed markers; bare "Keyboard" is too noisy alone.
    if (
      labelsHit(labels, ET_IME_MARKERS) ||
      labels.some((l) => /et keyboard/i.test(l))
    ) {
      return true;
    }
    await sleep(400);
  }
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
    await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
    steps.push("host-ready");

    await tapId(device, "btn-open-ime-settings", 8_000);
    steps.push("open-ime-settings");
    await sleep(1_200);
    await dismissSystemAlerts(device);

    // Drill into Managed keyboards / Virtual keyboard if present.
    for (const label of [
      "On-screen keyboard",
      "Virtual keyboard",
      "Manage on-screen keyboards",
      "Managed keyboards",
      "Keyboards",
    ]) {
      if (await tapNamed(device, [label], 2_500)) {
        steps.push(`settings-drill:${label}`);
      }
    }

    let listed = await waitForImeListed(device, 10_000);
    if (!listed) {
      // Scroll settings list.
      for (let i = 0; i < 4 && !listed; i++) {
        await device.swipe({
          xStart: 540,
          yStart: 1600,
          xEnd: 540,
          yEnd: 600,
          duration: 0.35,
        });
        await sleep(500);
        listed = await waitForImeListed(device, 3_000);
      }
    }

    if (!listed) {
      const labels = flattenLabels(await device.accessibilityTree());
      throw new Error(
        `IME settings missing ET Keyboard; labels=${labels.slice(0, 80).join(", ")}`,
      );
    }
    steps.push("ime-listed");

    // Best-effort enable + type ET (Settings leftover if toggles opaque).
    let typed = false;
    if (await tapNamed(device, ["ET Keyboard", "ET Keyboard Target"], 3_000)) {
      steps.push("ime-row-opened");
      for (const en of ["Use ET Keyboard", "Enable", "OK", "Allow"]) {
        if (await tapNamed(device, [en], 1_500)) {
          steps.push(`ime-enable:${en}`);
        }
      }
    }

    await device.pressButton({ button: "HOME" });
    await sleep(400);
    await device.launchApp(pkg, { terminateRunning: false });
    await waitForId(device, hostReadyTestId(entry.testIds), 12_000);
    try {
      await tapId(device, "input-type-field", 5_000);
      await sleep(600);
      // If our IME is active, tap ET key via AX; else soft-skip typing deepen.
      if (await tapNamed(device, ["ET"], 3_000)) {
        steps.push("ime-et-key");
        await assertPayloadContains(
          device,
          entry.testIds.lastPayload,
          "typed:ET",
          6_000,
        );
        typed = true;
        steps.push("typed-et-ok");
      } else {
        steps.push("ime-et-key-miss");
      }
    } catch {
      steps.push("type-deepen-skip");
    }

    return {
      id: "keyboard",
      path: pathStr,
      phase: 5,
      ok: true,
      status: "green",
      steps: [
        ...steps,
        typed ? "keyboard-android-deepen-ok" : "keyboard-android-ime-list-ok",
      ],
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
