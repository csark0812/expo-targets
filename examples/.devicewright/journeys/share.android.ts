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
} from "./helpers";

/** RN share + native-share (Phase 1a). Locked P: host sheet → chooser → Save → marker. */
const ANDROID_SHARE_IDS = new Set(["share", "native-share"]);

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
  const ordered = [
    ...new Set([
      "Example Share",
      "ET Share",
      "Native Share",
      "ET N Share",
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
      `android share chooser missing target; tried=${ordered.join(",")}`,
    );
  }
  await confirmChooserIfNeeded(device);
  await sleep(1_000);
}

/** Android native Activity primary is "Save"; iOS catalog may say "Save to App". */
async function tapSave(device: DeviceSession, entry: TargetCatalogEntry): Promise<void> {
  const labels = [
    ...entry.completeButton.split(",").map((s) => s.trim()).filter(Boolean),
    "Save",
  ];
  let lastErr: unknown;
  for (const label of [...new Set(labels)]) {
    try {
      await tapLabeledButton(device, label, 4_000);
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr instanceof Error
    ? lastErr
    : new Error(`android share Save missing; tried=${labels.join(",")}`);
}

async function treeFlat(device: DeviceSession): Promise<string> {
  return (await device.accessibilityTree())
    .map((n) => nodeVisibleText(n) || String(n.label ?? n.value ?? ""))
    .join("\n");
}

async function assertShareActivityUi(device: DeviceSession): Promise<void> {
  const flat = await treeFlat(device);
  if (!/Open main app/i.test(flat)) {
    throw new Error(
      `expected Share Activity (Open main app); got=${flat.slice(0, 400)}`,
    );
  }
  if (!/Save/i.test(flat)) {
    throw new Error(`expected Save on Share Activity; got=${flat.slice(0, 400)}`);
  }
}

async function waitForShareChrome(
  device: DeviceSession,
  timeoutMs = 8_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let last = "";
  while (Date.now() < deadline) {
    last = await treeFlat(device);
    if (/Open main app/i.test(last) && /Save/i.test(last)) {
      return;
    }
    await sleep(250);
  }
  throw new Error(
    `Share Activity chrome not visible; got=${last.slice(0, 400)}`,
  );
}

async function waitForHostMain(
  device: DeviceSession,
  entry: TargetCatalogEntry,
  timeoutMs = 12_000,
): Promise<void> {
  await waitForId(device, hostReadyTestId(entry.testIds), timeoutMs);
}

async function refreshHostPayload(
  device: DeviceSession,
  entry: TargetCatalogEntry,
): Promise<void> {
  const pkg = hostLaunchId(entry, "android");
  await device.launchApp(pkg, { terminateRunning: false });
  await waitForHostMain(device, entry);
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
 * Android dual of share C1 — host Share sheet required; Devicewright session only.
 * No raw adb: HOME/BACK/terminate/openShareText are DW 0.1.15+ session APIs.
 * (EXTRA_STREAM image cold-start has no DW peer yet — not required for green.)
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
  const pkg = hostLaunchId(entry, "android");
  /** native-share Locked P is host-sheet only; RN share keeps open-main + soft smoke. */
  const lockedPOnly = String(id) === "native-share";

  try {
    steps.push("android-launch-host");
    await device.launchApp(pkg, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForHostMain(device, entry, 15_000);
    steps.push("host-ready");

    try {
      await tapId(device, entry.testIds.clearPayload, 3_000);
      steps.push("clear-payload");
    } catch {
      steps.push("clear-payload-skip");
    }

    // --- Authoritative Locked P: host sheet → chooser → Save → host marker ---
    steps.push("host-sheet-primary");
    await openHostShareSheet(device, entry);
    checklist.push(C1.triggerFromHost);
    await pickShareTarget(device, entry);
    checklist.push(C1.findExtensionRow);
    await waitForShareChrome(device);
    await assertShareActivityUi(device);
    steps.push("share-chrome-ok");

    await tapSave(device, entry);
    checklist.push(C1.completeAppex);
    await sleep(800);
    // Host may already be under the sheet — relaunch/refresh for payload.
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

    if (!lockedPOnly) {
      // --- Open main app (DW session only) ---
      steps.push("open-main-app");
      await openHostShareSheet(device, entry);
      await pickShareTarget(device, entry);
      await waitForShareChrome(device);
      await tapLabeledButton(device, "Open main app", 8_000);
      await sleep(1_200);
      await waitForHostMain(device, entry);
      steps.push("open-main-ok");

      // Soft smoke: DW openShareText. OEM choosers often omit our target — never fail green.
      steps.push("system-share-text-smoke");
      await device.terminateApp(pkg);
      await device.pressButton({ button: "HOME" });
      await sleep(400);
      await device.openShareText(entry.payloadMarker);
      await sleep(800);
      try {
        await pickShareTarget(device, entry);
        await waitForShareChrome(device, 6_000);
        try {
          await tapLabeledButton(device, "Cancel", 5_000);
        } catch {
          await device.pressButton({ button: "BACK" });
        }
        steps.push("system-share-text-ok");
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
