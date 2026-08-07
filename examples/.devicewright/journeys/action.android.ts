import type { DeviceSession } from "@csark0812/devicewright";
import {
  hostLaunchId,
  TARGET_CATALOG,
  type TargetCatalogEntry,
  } from "../catalog";
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
  ANDROID_POST_TAP_MS,
  ANDROID_SETTINGS_SETTLE_MS,
} from "./helpers";

/** RN action + native-action (Phase 1a). Locked P: host sheet → chooser → Process/Save → marker. */
const ANDROID_ACTION_IDS = new Set(["action", "native-action"]);

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
      await sleep(ANDROID_POST_TAP_MS);
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
  await sleep(ANDROID_POST_TAP_MS);
}

async function confirmChooserIfNeeded(device: DeviceSession): Promise<void> {
  const treeLabels = (await device.accessibilityTree())
    .map((n) => nodeVisibleText(n) || String(n.label ?? "").trim())
    .filter(Boolean);
  if (treeLabels.some((l) => l === "Just once")) {
    await tapLabeledButton(device, "Just once", 5_000);
  }
}

async function pickActionTarget(
  device: DeviceSession,
  entry: TargetCatalogEntry,
): Promise<void> {
  const names = [
    entry.extensionName,
    entry.hostDisplayName,
    ...entry.extensionAliases,
  ].filter(Boolean);
  const ordered = [
    ...new Set([
      "Example Action",
      "ET Action",
      "Native Action",
      "ET N Action",
      ...names,
    ]),
  ];
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
      `android action chooser missing target; tried=${ordered.join(",")}`,
    );
  }
  await confirmChooserIfNeeded(device);
  await sleep(450);
}

/** Flat AX text for Process|Save|Action chrome (no dumpsys). */
async function treeFlat(device: DeviceSession): Promise<string> {
  return (await device.accessibilityTree())
    .map((n) => nodeVisibleText(n) || String(n.label ?? n.value ?? ""))
    .join("\n");
}

async function waitForActionChrome(
  device: DeviceSession,
  timeoutMs = 4_000,
): Promise<"visible" | "auto-dismissed"> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const flat = await treeFlat(device);
    if (/Process|Save|kind:image|kind:text|Images:|Action extension/i.test(flat)) {
      return "visible";
    }
    // Host ready again = ActionActivity already closed (auto-Process).
    if (/status-target-ready|btn-open-share-sheet|btn-clear-payload/i.test(flat)) {
      return "auto-dismissed";
    }
    await sleep(200);
  }
  return "auto-dismissed";
}

async function completeAction(
  device: DeviceSession,
  entry: TargetCatalogEntry,
): Promise<void> {
  const labels = [
    ...entry.completeButton.split(",").map((s) => s.trim()).filter(Boolean),
    "Process",
    "Save",
  ];
  for (const label of [...new Set(labels)]) {
    try {
      await tapLabeledButton(device, label, 2_500);
      return;
    } catch {
      // try next (native Action Activity uses Save)
    }
  }
  await sleep(500);
}

async function refreshHostPayload(
  device: DeviceSession,
  entry: TargetCatalogEntry,
): Promise<void> {
  const pkg = hostLaunchId(entry, "android");
  await device.launchApp(pkg, { terminateRunning: false });
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
  await sleep(450);
}

/**
 * Android dual of action C1 — host Share sheet required; Devicewright session only.
 * RN ActionExtension auto-Processes ~350ms (marker `grayscale`).
 * native-action Locked P: Save on native Activity → host marker (`Original`).
 */
export async function runAndroidActionJourney(
  device: DeviceSession,
  id: keyof typeof TARGET_CATALOG,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG[id];
  if (!entry || !ANDROID_ACTION_IDS.has(String(id))) {
    return {
      id: String(id),
      path: entry?.path ?? String(id),
      phase: 1,
      ok: false,
      status: "stub",
      steps: ["android-unsupported"],
      error: `android action journey not wired for ${String(id)}`,
      failureKind: "stub",
    };
  }

  const steps: string[] = [];
  const checklist: string[] = [];
  const pkg = hostLaunchId(entry, "android");
  const lockedPOnly = String(id) === "native-action";

  try {
    steps.push("android-launch-host");
    await device.launchApp(pkg, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 15_000);
    steps.push("host-ready");

    try {
      await tapId(device, entry.testIds.clearPayload, 3_000);
      steps.push("clear-payload");
    } catch {
      steps.push("clear-payload-skip");
    }

    steps.push("host-sheet-primary");
    await openHostShareSheet(device, entry);
    checklist.push(C1.triggerFromHost);
    await pickActionTarget(device, entry);
    checklist.push(C1.findExtensionRow);

    const chrome = await waitForActionChrome(device);
    if (chrome === "visible") {
      steps.push("action-chrome-ok");
      await completeAction(device, entry);
    } else {
      steps.push("action-auto-dismissed");
    }
    checklist.push(C1.completeAppex);
    await sleep(ANDROID_POST_TAP_MS);

    await refreshHostPayload(device, entry);
    steps.push("assert-action-marker");
    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      entry.payloadMarker,
      12_000,
    );
    checklist.push(C1.assertHostMarker);
    steps.push("host-sheet-ok");

    if (!lockedPOnly) {
      // Soft smoke: DW openShareText. OEM choosers often omit our target — never fail green.
      steps.push("system-share-text-smoke");
      try {
        await tapId(device, entry.testIds.clearPayload, 3_000);
      } catch {
        // optional
      }
      await device.terminateApp(pkg);
      await device.pressButton({ button: "HOME" });
      await sleep(400);
      await device.openShareText("expo-targets action process-text sample");
      await sleep(400);
      try {
        await pickActionTarget(device, entry);
        const smokeChrome = await waitForActionChrome(device, 3_000);
        if (smokeChrome === "visible") {
          try {
            await tapLabeledButton(device, "Cancel", 2_000);
          } catch {
            await device.pressButton({ button: "BACK" });
          }
          steps.push("system-share-text-ok");
        } else {
          steps.push("system-share-text-auto-dismiss");
        }
      } catch {
        await device.pressButton({ button: "BACK" }).catch(() => undefined);
        steps.push("system-share-text-chooser-skip");
      }
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
    const failureKind = /not installed|Launch failed|device offline|no devices|terminateApp|pressButton|openShareText/i.test(
      msg,
    )
      ? "operator"
      : "product";
    return {
      id: entry.id,
      path: entry.path,
      phase: 1,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      checklist,
      error: msg,
      failureKind,
    };
  }
}
