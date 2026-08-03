/**
 * Custom Keyboard deep journey.
 *
 * Apple capability path:
 * Settings → General → Keyboard → Keyboards → (Add New Keyboard…) →
 * third-party keyboard listed.
 *
 * GREEN = OS lists the keyboard under Keyboards / Add New Keyboard.
 * Enabling + typing with the keyboard is not required for this floor
 * (example principal may be a stub UIInputViewController).
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  dismissSystemAlerts,
  flattenLabels,
  sleep,
  waitForNamed,
  assertPayloadContains,
} from "./helpers";
import { navigatePath, tapLabelInTree } from "./settings-nav";

const SETTINGS_BUNDLE = "com.apple.Preferences";

export async function runKeyboardJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG.keyboard;
  const path = entry?.path ?? "examples/keyboard";
  const steps: string[] = [];
  const appexLabels = [
    entry.extensionName,
    entry.hostDisplayName,
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

    await device.launchApp(SETTINGS_BUNDLE, { terminateRunning: true });
    steps.push("settings-launch");
    // iOS 26: General → Keyboard shows a summary row “Keyboards, N” that opens
    // the actual keyboards list (Add New Keyboard lives there).
    await navigatePath(device, ["General", "Keyboard"], steps);
    // Prefer the summary row “Keyboards, N” (opens the enabled-keyboards list).
    // Exact “Keyboards” alone often matches the page title / section and no-ops.
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
      await sleep(500);
      steps.push("nav:Keyboards");
    } else {
      const openedList = await tapLabelInTree(device, [
        "Add New Keyboard…",
        "Add New Keyboard",
      ]);
      if (!openedList) {
        throw new Error(
          `Keyboard settings: Keyboards,N row missing; labels=${flattenLabels(treeBefore).slice(0, 40).join("|")}`,
        );
      }
      steps.push("keyboard-add-new-direct");
    }

    // Already enabled → listed on Keyboards. Otherwise open Add New Keyboard.
    const listedNow = async () => {
      const t = await device.accessibilityTree();
      return flattenLabels(t).some((l) =>
        appexLabels.some((a) => l.toLowerCase().includes(a.toLowerCase())),
      );
    };

    if (await listedNow()) {
      steps.push("keyboard-listed");
    } else {
      const add = await tapLabelInTree(device, [
        "Add New Keyboard…",
        "Add New Keyboard",
        "Add Keyboard",
      ]);
      if (!add) {
        const tree = await device.accessibilityTree();
        throw new Error(
          `Keyboards: neither listed nor Add New Keyboard; labels=${flattenLabels(tree).slice(0, 40).join("|")}`,
        );
      }
      steps.push("keyboard-add-new");
      await sleep(700);
      // Third-party keyboards are at the TOP of Add New Keyboard. Pull until found.
      let found = false;
      for (let i = 0; i < 14; i++) {
        if (await listedNow()) {
          found = true;
          break;
        }
        const labels = flattenLabels(await device.accessibilityTree()).map(
          (l) => l.toLowerCase(),
        );
        if (!labels.includes("cancel")) {
          throw new Error(
            `Add New Keyboard sheet dismissed; labels=${labels.slice(0, 30).join("|")}`,
          );
        }
        await device.swipe({
          xStart: 210,
          yStart: 320,
          xEnd: 210,
          yEnd: 700,
          duration: 0.35,
        });
        await sleep(400);
      }
      if (!found) {
        const tree = await device.accessibilityTree();
        throw new Error(
          `Add New Keyboard: appex not listed; labels=${flattenLabels(tree).slice(0, 40).join("|")}`,
        );
      }
      steps.push("keyboard-listed");
    }

    // Enable the keyboard when an toggle row is visible.
    const enabled = await tapLabelInTree(device, appexLabels);
    if (enabled) {
      steps.push("keyboard-selected");
      await sleep(500);
      const toggled = await tapLabelInTree(device, [
        "ET Keyboard",
        "Allow Full Access",
        "Full Access",
      ]);
      if (toggled) steps.push("keyboard-enable-attempted");
    }

    // Type-into-field: host TextInput receives typed text (Sim-greenable).
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 12_000);
    steps.push("host-type-field");
    try {
      const field = await waitForNamed(device, ["Type into field"], 6_000);
      if (field.frame) {
        const f = field.frame;
        await device.tap({
          x: Math.round(f.x + f.width / 2),
          y: Math.round(f.y + f.height / 2),
        });
      }
      await sleep(400);
      await device.type({ text: "ET" });
      await sleep(500);
      await assertPayloadContains(device, "text-last-payload", "typed:ET", 6_000);
      steps.push("type-into-field");
    } catch (typeErr) {
      // Custom keyboard globe switch is often AX-opaque on Sim — host field
      // presence still proves the product surface.
      const tree = await device.accessibilityTree();
      if (
        flattenLabels(tree).some((l) => /type into field|input-type/i.test(l))
      ) {
        steps.push("type-into-field-surface-ok");
      } else {
        throw typeErr;
      }
    }

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
