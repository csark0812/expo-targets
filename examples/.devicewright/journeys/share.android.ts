import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG, type TargetCatalogEntry } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  C1,
  dismissSystemAlerts,
  findNamedViaPointProbe,
  hostReadyTestId,
  nodeVisibleText,
  sleep,
  tapCenter,
  tapId,
  tapProbeHit,
  waitForId,
  waitForNamed,
} from "./helpers";

const execFileAsync = promisify(execFile);

const ANDROID_SHARE_IDS = new Set(["share"]);

async function adb(
  serial: string,
  args: string[],
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync("adb", ["-s", serial, ...args], {
    encoding: "utf8",
    maxBuffer: 2 * 1024 * 1024,
  });
}

async function terminateHost(
  device: DeviceSession,
  packageName: string,
): Promise<void> {
  if (device.terminateApp) {
    await device.terminateApp(packageName);
  } else {
    await adb(device.deviceId, ["shell", "am", "force-stop", packageName]);
  }
  await sleep(400);
}

async function pressHome(device: DeviceSession): Promise<void> {
  if (device.pressButton) {
    await device.pressButton({ button: "HOME" });
  } else {
    await adb(device.deviceId, ["shell", "input", "keyevent", "KEYCODE_HOME"]);
  }
  await sleep(400);
}

async function pressBack(device: DeviceSession): Promise<void> {
  if (device.pressButton) {
    await device.pressButton({ button: "BACK" });
  } else {
    await adb(device.deviceId, ["shell", "input", "keyevent", "KEYCODE_BACK"]);
  }
  await sleep(500);
}

async function topResumedActivity(serial: string): Promise<string> {
  const { stdout } = await adb(serial, [
    "shell",
    "dumpsys",
    "activity",
    "activities",
  ]);
  const line = stdout.split("\n").find((l) => /topResumedActivity=/.test(l));
  return line?.trim() ?? "";
}

/** Image EXTRA_STREAM still needs a MediaStore URI — keep raw adb for that path. */
async function launchShareActivityWithImage(serial: string): Promise<void> {
  await adb(serial, [
    "shell",
    "am",
    "start",
    "-a",
    "android.intent.action.SEND",
    "-t",
    "image/png",
    "--eu",
    "android.intent.extra.STREAM",
    "content://media/external/images/media/34",
    "--grant-read-uri-permission",
    "-n",
    "com.expotargets.example.share/com.expotargets.example.share.target.share.ShareShareActivity",
  ]);
  await sleep(1_200);
}

async function tapLabeledButton(
  device: DeviceSession,
  label: string,
  timeoutMs = 10_000,
): Promise<void> {
  const start = Date.now();
  const needle = label.trim().toLowerCase();
  while (Date.now() - start < timeoutMs) {
    const tree = await device.accessibilityTree();
    const node = tree.find((n) => {
      const t = (
        nodeVisibleText(n) ||
        String(n.label ?? "") ||
        String((n as { value?: string }).value ?? "")
      ).trim();
      return t.toLowerCase() === needle;
    });
    if (node?.frame && node.frame.width >= 8 && node.frame.height >= 8) {
      await tapCenter(device, node);
      await sleep(600);
      return;
    }
    await sleep(250);
  }
  try {
    const node = await waitForNamed(device, [label], Math.min(timeoutMs, 2_000));
    await tapCenter(device, node);
  } catch {
    const hit = await findNamedViaPointProbe(device, [label], {
      timeoutMs: Math.min(timeoutMs, 4_000),
      match: "exact",
      yStartRatio: 0.2,
      yEndRatio: 0.95,
    });
    await tapProbeHit(device, hit);
  }
  await sleep(600);
}

async function confirmChooserIfNeeded(device: DeviceSession): Promise<void> {
  const treeLabels = (await device.accessibilityTree())
    .map((n) => nodeVisibleText(n) || String(n.label ?? "").trim())
    .filter(Boolean);
  if (treeLabels.some((l) => l === "Just once")) {
    await tapLabeledButton(device, "Just once", 5_000);
  }
}

async function pickShareTarget(
  device: DeviceSession,
  entry: TargetCatalogEntry,
): Promise<void> {
  const names = [
    entry.extensionName,
    entry.hostDisplayName,
    ...entry.extensionAliases,
  ].filter((n) => n && n !== "Share");
  const ordered = [...new Set(["Example Share", "ET Share", ...names])];
  let tapped = false;
  for (const name of ordered) {
    try {
      await tapLabeledButton(device, name, 4_000);
      tapped = true;
      break;
    } catch {
      // try next
    }
  }
  if (!tapped) {
    throw new Error(
      `android share chooser missing target; tried=${ordered.join(",")}`,
    );
  }
  await confirmChooserIfNeeded(device);
  await sleep(1_000);
}

async function assertShareActivityUi(device: DeviceSession): Promise<void> {
  const flat = (await device.accessibilityTree())
    .map((n) => nodeVisibleText(n) || String(n.label ?? n.value ?? ""))
    .join("\n");
  if (!/Open main app/i.test(flat)) {
    throw new Error(
      `expected Share Activity (Open main app); got=${flat.slice(0, 400)}`,
    );
  }
  if (!/Save/i.test(flat)) {
    throw new Error(`expected Save on Share Activity; got=${flat.slice(0, 400)}`);
  }
}

async function refreshHostPayload(
  device: DeviceSession,
  entry: TargetCatalogEntry,
): Promise<void> {
  await device.launchApp(entry.hostBundleId, { terminateRunning: false });
  await waitForId(device, hostReadyTestId(entry.testIds), 12_000);
  if (entry.testIds.refresh) {
    try {
      await tapId(device, entry.testIds.refresh, 3_000);
    } catch {
      // optional
    }
  }
}

async function openHostShareSheet(
  device: DeviceSession,
  entry: TargetCatalogEntry,
): Promise<void> {
  if (!entry.testIds.openShareSheet) {
    throw new Error("catalog missing openShareSheet testID");
  }
  await tapId(device, entry.testIds.openShareSheet, 8_000);
  await sleep(1_000);
}

/**
 * Android dual of share C1 — user-facing bar requires host Share sheet.
 * Cold `am start` / MediaStore image remain secondary coverage only.
 */
export async function runAndroidShareJourney(
  device: DeviceSession,
  id: keyof typeof TARGET_CATALOG,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG[id];
  if (!entry || !ANDROID_SHARE_IDS.has(String(id))) {
    return {
      id: String(id),
      path: entry?.path ?? String(id),
      phase: 1,
      ok: false,
      status: "stub",
      steps: ["android-unsupported"],
      error: `android share journey not wired for ${String(id)}`,
      failureKind: "stub",
    };
  }

  const steps: string[] = [];
  const checklist: string[] = [];
  const serial = device.deviceId;

  try {
    steps.push("android-launch-host");
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
    steps.push("host-ready");

    try {
      await tapId(device, entry.testIds.clearPayload, 3_000);
      steps.push("clear-payload");
    } catch {
      steps.push("clear-payload-skip");
    }

    // --- Authoritative: host Share sheet → chooser → Save → host marker ---
    steps.push("host-sheet-primary");
    await openHostShareSheet(device, entry);
    checklist.push(C1.triggerFromHost);
    await pickShareTarget(device, entry);
    checklist.push(C1.findExtensionRow);
    await assertShareActivityUi(device);
    let top = await topResumedActivity(serial);
    if (!/(ShareShareActivity|ExpoTargets(React)?ShareActivity)/.test(top)) {
      throw new Error(`expected ShareActivity after host sheet; got ${top}`);
    }
    steps.push("top=ShareActivity");

    await tapLabeledButton(device, "Save", 8_000);
    checklist.push(C1.completeAppex);
    await sleep(800);
    // Host-sheet path: ShareActivity finishes onto the still-living host
    // MainActivity — that is expected (unlike cold am-start with no host under it).
    top = await topResumedActivity(serial);
    steps.push(
      /MainActivity/.test(top)
        ? "host-sheet-save-returned-host"
        : "host-sheet-save-still-share",
    );

    await refreshHostPayload(device, entry);
    steps.push("assert-text-payload");
    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      entry.payloadMarker,
      12_000,
    );
    checklist.push(C1.assertHostMarker);
    steps.push("host-sheet-ok");

    // --- Secondary: image via system Intent (MediaStore) ---
    steps.push("cold-image-share");
    try {
      await tapId(device, entry.testIds.clearPayload, 3_000);
    } catch {
      // optional
    }
    await terminateHost(device, entry.hostBundleId);
    await pressHome(device);
    await sleep(400);
    await launchShareActivityWithImage(serial);
    await assertShareActivityUi(device);
    const imageFlat = (await device.accessibilityTree())
      .map((n) => nodeVisibleText(n) || String(n.label ?? ""))
      .join(" ");
    if (!/Images:\s*1/i.test(imageFlat)) {
      throw new Error(
        `expected Images: 1 on Share Activity; got=${imageFlat.slice(0, 300)}`,
      );
    }
    await tapLabeledButton(device, "Save", 8_000);
    await refreshHostPayload(device, entry);
    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      '"kind":"image"',
      12_000,
    );
    steps.push("image-path-ok");

    // --- Open main app (from Share Activity after host sheet) ---
    steps.push("open-main-app");
    await openHostShareSheet(device, entry);
    await pickShareTarget(device, entry);
    await assertShareActivityUi(device);
    await tapLabeledButton(device, "Open main app", 8_000);
    await sleep(1_200);
    top = await topResumedActivity(serial);
    if (!/MainActivity/.test(top)) {
      throw new Error(`Open main app must show MainActivity; top=${top}`);
    }
    await waitForId(device, hostReadyTestId(entry.testIds), 12_000);
    steps.push("open-main-ok");

    // Optional: system ACTION_SEND chooser smoke (DW 0.1.15)
    if (device.openShareText) {
      steps.push("system-share-text-smoke");
      await terminateHost(device, entry.hostBundleId);
      await pressHome(device);
      await device.openShareText(entry.payloadMarker);
      await sleep(800);
      await pickShareTarget(device, entry);
      await assertShareActivityUi(device);
      try {
        await tapLabeledButton(device, "Cancel", 5_000);
      } catch {
        await pressBack(device);
      }
      steps.push("system-share-text-ok");
    }

    return {
      id: entry.id,
      path: entry.path,
      phase: 1,
      ok: true,
      status: "green",
      steps,
      checklist,
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Launch failed|device offline|no devices/i.test(
      msg,
    )
      ? "operator"
      : /adb|dumpsys|content:\/\//i.test(msg)
        ? "infra"
        : "product";
    return {
      id: entry.id,
      path: entry.path,
      phase: 1,
      ok: false,
      status:
        failureKind === "operator"
          ? "operator"
          : failureKind === "infra"
            ? "infra"
            : "red",
      steps,
      checklist,
      error: msg,
      failureKind,
    };
  }
}
