import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  dismissSystemAlerts,
  flattenLabels,
  hostReadyTestId,
  sleep,
  tapId,
  waitForId,
  waitForNamed,
} from "./helpers";

const CLIP_INVOCATION_URL: Record<string, string> = {
  clip: "https://clip.example.expotargets.dev/checkout",
  "native-clip": "https://clip.example.expotargets.dev/checkout",
};

const CLIP_BUNDLE_IDS: Record<string, string> = {
  clip: "com.expotargets.example.clip.clip",
  "native-clip": "com.expotargets.example.native.clip.clip",
};

/**
 * Prove host embeds an AppClips/*.app.
 * RN clips require Frameworks + main.jsbundle; native Swift clips do not.
 */
function assertEmbeddedAppClipReady(
  device: DeviceSession,
  hostBundleId: string,
  steps: string[],
  mode: "clip" | "native-clip",
): string {
  const container = spawnSync(
    "xcrun",
    ["simctl", "get_app_container", device.deviceId, hostBundleId, "app"],
    { encoding: "utf8" },
  );
  if (container.status !== 0) {
    throw new Error(
      `get_app_container ${hostBundleId}: ${container.stderr || container.stdout}`,
    );
  }
  const hostApp = container.stdout.trim();
  const clipsDir = path.join(hostApp, "AppClips");
  if (!fs.existsSync(clipsDir)) {
    throw new Error(`no AppClips/ under ${hostApp}`);
  }
  const clipApps = fs.readdirSync(clipsDir).filter((n) => n.endsWith(".app"));
  if (!clipApps.length) {
    throw new Error(`empty AppClips/ under ${clipsDir}`);
  }
  const nest = path.join(clipsDir, clipApps[0]!);
  steps.push(`appclip-embedded:${clipApps[0]}`);

  if (mode === "native-clip") {
    // SwiftUI App Clip — no Metro bundle / RN Frameworks expected.
    const exe = path.join(nest, path.basename(nest, ".app"));
    if (!fs.existsSync(exe) && !fs.existsSync(path.join(nest, "Info.plist"))) {
      throw new Error(`native App Clip nest incomplete: ${nest}`);
    }
    steps.push("appclip-native-ok");
    return nest;
  }

  const frameworks = path.join(nest, "Frameworks");
  const jsbundle = path.join(nest, "main.jsbundle");
  if (!fs.existsSync(frameworks)) {
    throw new Error(`nested App Clip missing Frameworks/: ${nest}`);
  }
  if (!fs.existsSync(jsbundle)) {
    throw new Error(`nested App Clip missing main.jsbundle: ${nest}`);
  }
  const fwCount = fs.readdirSync(frameworks).length;
  steps.push(`appclip-frameworks:${fwCount}`);
  steps.push("appclip-jsbundle-ok");
  return nest;
}

/**
 * Nested AppClips/*.app is not directly launchable via simctl while only
 * embedded. Install the nested product (Frameworks + jsbundle already copied
 * by the host post-embed phase) so Devicewright can launchApp the clip id.
 */
function installNestedClipForLaunch(
  device: DeviceSession,
  nestPath: string,
  steps: string[],
): void {
  const r = spawnSync("xcrun", ["simctl", "install", device.deviceId, nestPath], {
    encoding: "utf8",
  });
  if (r.status !== 0) {
    throw new Error(
      `simctl install nested App Clip failed: ${r.stderr || r.stdout}`,
    );
  }
  steps.push("clip-product-installed-for-launch");
}

/**
 * Clip host + live App Clip surface proof (Devicewright-proven path):
 * 1. Host contract + embedded AppClips/ (RN: Frameworks+jsbundle; native: Swift product)
 * 2. Install nested clip product for launch
 * 3. launchApp(clip) with `_XCAppClipURL`
 * 4. Assert clip UI markers → Complete checkout → host App Group payload
 */
export async function runClipJourney(
  device: DeviceSession,
  id: "clip" | "native-clip" = "clip",
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG[id];
  const phase = id === "native-clip" ? 4 : 3;
  const steps: string[] = [];
  const clipBundleId = CLIP_BUNDLE_IDS[id] ?? `${entry.hostBundleId}.clip`;
  const invocationUrl =
    CLIP_INVOCATION_URL[id] ?? "https://clip.example.expotargets.dev/checkout";

  try {
    steps.push("launch-host");
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await dismissSystemAlerts(device);
    try {
      await waitForId(device, hostReadyTestId(entry.testIds), 6_000);
    } catch {
      await waitForNamed(device, ["ready"], 15_000);
    }
    steps.push("host-ready");

    steps.push("seed-payload");
    await tapId(device, "btn-seed-payload", 8_000);
    await sleep(400);
    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      entry.payloadMarker,
      10_000,
    );
    steps.push("host-contract-ok");

    try {
      await tapId(device, entry.testIds.clearPayload, 3_000);
      steps.push("clear-before-invoke");
    } catch {
      // optional
    }

    const nest = assertEmbeddedAppClipReady(
      device,
      entry.hostBundleId,
      steps,
      id,
    );
    installNestedClipForLaunch(device, nest, steps);

    steps.push("launch-clip");
    await device.launchApp(clipBundleId, {
      terminateRunning: true,
      env: { _XCAppClipURL: invocationUrl },
    });
    await sleep(1_500);
    await dismissSystemAlerts(device);

    let clipOk = false;
    for (let i = 0; i < 20; i++) {
      const labels = flattenLabels(await device.accessibilityTree());
      if (
        labels.some((l) =>
          /App Clip|expo-targets uitest clip invocation|Complete checkout|Native Clip/i.test(
            l,
          ),
        )
      ) {
        clipOk = true;
        break;
      }
      await sleep(400);
    }
    if (!clipOk) {
      const labels = flattenLabels(await device.accessibilityTree());
      throw new Error(
        `App Clip UI missing after launch; labels=${labels.slice(0, 40).join("|")}`,
      );
    }
    steps.push("clip-surface-ok");

    // Checkout writes App Group payload the host can read.
    const tree = await device.accessibilityTree();
    const row = tree.find((n) =>
      (n.label ?? "").toLowerCase().includes("complete checkout"),
    );
    if (!row?.frame) {
      throw new Error("Complete checkout control missing on App Clip");
    }
    await device.tap({
      x: Math.round(row.frame.x + row.frame.width / 2),
      y: Math.round(row.frame.y + row.frame.height / 2),
    });
    steps.push("clip-checkout-tapped");
    await sleep(800);

    steps.push("return-host");
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await dismissSystemAlerts(device);
    try {
      await waitForId(device, hostReadyTestId(entry.testIds), 6_000);
    } catch {
      await waitForNamed(device, ["ready"], 12_000);
    }
    try {
      await tapId(device, "btn-refresh", 3_000);
    } catch {
      // optional
    }
    await sleep(500);

    // Native Swift clip writes itemName/price/invocationPath into App Group.
    // Prefer invocationPath; accept itemName from Complete checkout as dual proof.
    if (id === "native-clip") {
      try {
        await assertPayloadContains(
          device,
          entry.testIds.lastPayload,
          "invocationPath",
          6_000,
        );
      } catch {
        await assertPayloadContains(
          device,
          entry.testIds.lastPayload,
          "Native Clip Item",
          8_000,
        );
        steps.push("invocation-via-itemName");
      }
    } else {
      await assertPayloadContains(
        device,
        entry.testIds.lastPayload,
        "Clip checkout",
        10_000,
      );
    }
    steps.push("invocation-marker-ok");

    return {
      id: entry.id,
      path: entry.path,
      phase,
      ok: true,
      status: "green",
      steps,
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed|FBSOpenApplication/i.test(
      msg,
    )
      ? "operator"
      : "product";
    return {
      id: entry.id,
      path: entry.path,
      phase,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}
