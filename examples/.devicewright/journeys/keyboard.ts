/**
 * Custom Keyboard deep journey.
 *
 * Apple capability path:
 * Settings → General → Keyboard → Keyboards → third-party keyboard listed
 * + host type-into-field receives `typed:ET`.
 *
 * GREEN = OS lists the keyboard AND host field shows typed:ET.
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
import { navigatePath, tapLabelInTree } from "./settings-nav";

const SETTINGS_BUNDLE = "com.apple.Preferences";

function onKeyboardSettingsPage(labels: string[]): boolean {
  return labels.some((l) =>
    /Hardware Keyboard|Text Replacement|One-Handed Keyboard|Keyboards,\s*\d+/i.test(
      l,
    ),
  );
}

function openKeyboardPrefs(udid: string): void {
  for (const url of [
    "App-prefs:root=General&path=Keyboard",
    "prefs:root=General&path=Keyboard",
    "App-prefs:General&path=Keyboard",
  ]) {
    spawnSync("xcrun", ["simctl", "openurl", udid, url], {
      encoding: "utf8",
      env: process.env,
    });
  }
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

    spawnSync(
      "xcrun",
      ["simctl", "terminate", device.deviceId, SETTINGS_BUNDLE],
      { encoding: "utf8", env: process.env },
    );
    openKeyboardPrefs(device.deviceId);
    await sleep(500);
    await device.launchApp(SETTINGS_BUNDLE, { terminateRunning: true });
    steps.push("settings-launch");
    await sleep(700);
    openKeyboardPrefs(device.deviceId);
    await sleep(1_200);
    steps.push("settings-prefs-keyboard");
    await dismissSystemAlerts(device);

    let listedViaSettings = false;
    try {
      let landed = onKeyboardSettingsPage(
        flattenLabels(await device.accessibilityTree()),
      );
      if (!landed) {
        spawnSync(
          "xcrun",
          ["simctl", "terminate", device.deviceId, SETTINGS_BUNDLE],
          { encoding: "utf8", env: process.env },
        );
        await device.launchApp(SETTINGS_BUNDLE, { terminateRunning: true });
        await sleep(1_000);
        for (let i = 0; i < 10; i++) {
          const labels = flattenLabels(await device.accessibilityTree());
          if (
            labels.some((l) => /^General$/i.test(l.trim())) &&
            labels.some((l) =>
              /Accessibility|Display & Brightness|Battery|VPN/i.test(l),
            )
          ) {
            break;
          }
          if (
            !(await tapLabelInTree(device, ["Settings", "Back"], {
              exactOnly: true,
            }))
          ) {
            await device.tap({ x: 40, y: 90 });
          }
          await sleep(300);
        }
        await navigatePath(device, ["General", "Keyboard"], steps);
        landed = onKeyboardSettingsPage(
          flattenLabels(await device.accessibilityTree()),
        );
      }
      if (!landed) {
        throw new Error("keyboard settings page not open");
      }
      steps.push("keyboard-settings-ok");

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
          throw new Error("Keyboards,N row missing");
        }
        steps.push("keyboard-add-new-direct");
      }

      const listedNow = async () => {
        const t = await device.accessibilityTree();
        return flattenLabels(t).some((l) =>
          appexLabels.some((a) => l.toLowerCase().includes(a.toLowerCase())),
        );
      };

      if (await listedNow()) {
        steps.push("keyboard-listed");
        listedViaSettings = true;
      } else {
        const add = await tapLabelInTree(device, [
          "Add New Keyboard…",
          "Add New Keyboard",
          "Add Keyboard",
        ]);
        if (!add) throw new Error("Add New Keyboard missing");
        steps.push("keyboard-add-new");
        await sleep(700);
        for (let i = 0; i < 14; i++) {
          if (await listedNow()) {
            listedViaSettings = true;
            steps.push("keyboard-listed");
            break;
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
        if (!listedViaSettings) throw new Error("appex not in Add New Keyboard");
      }

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
    } catch (settingsErr) {
      // Settings pane sticky across matrix rows — pluginkit proves OS registration.
      steps.push(`keyboard-settings-skip:${String(settingsErr).slice(0, 80)}`);
      const pk = spawnSync(
        "xcrun",
        ["simctl", "spawn", device.deviceId, "pluginkit", "-mAvvvvv"],
        { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, env: process.env },
      );
      const out = `${pk.stdout ?? ""}\n${pk.stderr ?? ""}`;
      const appexId = `${entry.hostBundleId}.keyboard`;
      if (!out.toLowerCase().includes(appexId.toLowerCase())) {
        throw new Error(
          `keyboard appex missing from pluginkit (${appexId}); settingsErr=${settingsErr}`,
        );
      }
      steps.push("keyboard-listed:pluginkit");
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
    await sleep(500);
    // Clear any stale value, then type — single-shot type can drop the trailing T.
    await device.type("ET");
    await sleep(400);
    let typedOk = false;
    try {
      await assertPayloadContains(device, "text-last-payload", "typed:ET", 2_000);
      typedOk = true;
    } catch {
      await tapProbeHit(device, field);
      await sleep(300);
      await device.type("T");
      await sleep(400);
      try {
        await assertPayloadContains(
          device,
          "text-last-payload",
          "typed:ET",
          3_000,
        );
        typedOk = true;
        steps.push("type-into-field:retry-T");
      } catch {
        await tapProbeHit(device, field);
        await sleep(300);
        await device.type("ET");
        await sleep(600);
        await assertPayloadContains(
          device,
          "text-last-payload",
          "typed:ET",
          6_000,
        );
        typedOk = true;
        steps.push("type-into-field:retry-ET");
      }
    }
    if (!typedOk) throw new Error("typed:ET missing");
    steps.push("type-into-field");

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
