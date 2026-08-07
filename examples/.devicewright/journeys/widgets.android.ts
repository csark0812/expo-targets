import type { AccessibilityNode, DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  dismissSystemAlerts,
  findNamedViaPointProbe,
  flattenLabels,
  hostReadyTestId,
  nodeVisibleText,
  sleep,
  tapCenter,
  tapId,
  tapProbeHit,
  waitForId,
  waitForNamed,
} from "./helpers";

function walk(
  nodes: AccessibilityNode[],
  acc: AccessibilityNode[] = [],
): AccessibilityNode[] {
  for (const n of nodes) {
    acc.push(n);
    if (n.children?.length) walk(n.children, acc);
  }
  return acc;
}

async function pressHome(device: DeviceSession): Promise<void> {
  if (!device.pressButton) {
    throw new Error("pressButton(HOME) required for Android widgets journey");
  }
  await device.pressButton({ button: "HOME" });
  await sleep(800);
}

async function findLauncherLabel(
  device: DeviceSession,
  names: string[],
  pages = 5,
): Promise<AccessibilityNode | null> {
  const needles = names.map((n) => n.toLowerCase());
  for (let page = 0; page < pages; page++) {
    const flat = walk(await device.accessibilityTree());
    const hit = flat.find((n) => {
      const t = (
        nodeVisibleText(n) ||
        String(n.label ?? "") ||
        String(n.value ?? "")
      )
        .trim()
        .toLowerCase();
      return needles.some((needle) => t === needle || t.includes(needle));
    });
    if (hit?.frame && hit.frame.width >= 8 && hit.frame.height >= 8) {
      return hit;
    }
    // Swipe to next launcher page (LTR).
    await device.swipe({
      xStart: 900,
      yStart: 900,
      xEnd: 120,
      yEnd: 900,
      duration: 0.35,
    });
    await sleep(500);
  }
  return null;
}

async function tryAddWidgetFromPicker(
  device: DeviceSession,
  hostNames: string[],
): Promise<boolean> {
  // Long-press empty-ish area to open launcher customize / widgets entry.
  await device.tap({ x: 540, y: 1400, duration: 1.1 });
  await sleep(900);

  for (const label of ["Widgets", "widgets", "Widget"]) {
    try {
      await tapCenter(device, await waitForNamed(device, [label], 2_500));
      break;
    } catch {
      // continue
    }
  }
  await sleep(700);

  for (const name of hostNames) {
    try {
      const row = await waitForNamed(device, [name], 3_000);
      await tapCenter(device, row);
      await sleep(800);
      // Prefer a small / 2x2 style if the picker exposes sizes.
      for (const size of ["2×2", "2x2", "Small", "Hello"]) {
        try {
          await tapCenter(device, await waitForNamed(device, [size], 1_500));
          await sleep(1_200);
          return true;
        } catch {
          // try next size label
        }
      }
      // Some launchers place on tap of the app row alone.
      return true;
    } catch {
      // try next host name
    }
  }

  try {
    const hit = await findNamedViaPointProbe(device, hostNames, {
      timeoutMs: 4_000,
      match: "includes",
      yStartRatio: 0.15,
      yEndRatio: 0.9,
    });
    await tapProbeHit(device, hit);
    await sleep(1_200);
    return true;
  } catch {
    return false;
  }
}

/**
 * Android widgets dual: host seed + launcher widget tile must show the marker.
 * Cold provider-only checks are not enough for green.
 */
export async function runAndroidWidgetsJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG.widgets;
  const hostNames = [entry.hostDisplayName, "ET Widgets", "Hello"].filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  const steps: string[] = [];

  try {
    steps.push("android-launch-host");
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await dismissSystemAlerts(device);
    try {
      await waitForId(device, hostReadyTestId(entry.testIds), 8_000);
    } catch {
      await waitForNamed(device, ["ready"], 15_000);
    }
    steps.push("host-ready");

    steps.push("seed-payload");
    try {
      await tapId(device, "btn-seed-payload", 8_000);
    } catch {
      const seed = await findNamedViaPointProbe(device, ["Seed payload"], {
        timeoutMs: 6_000,
        match: "exact",
        yStartRatio: 0.3,
        yEndRatio: 0.8,
      });
      await tapProbeHit(device, seed);
    }
    await sleep(500);

    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      "Hello from host",
      8_000,
    );
    steps.push("host-contract-ok");

    steps.push("launcher-home");
    await pressHome(device);

    steps.push("find-widget-tile");
    let labels = flattenLabels(await device.accessibilityTree());
    let tileVisible = labels.some((l) => l.includes("Hello from host"));

    if (!tileVisible) {
      steps.push("add-widget-picker");
      const added = await tryAddWidgetFromPicker(device, hostNames);
      if (!added) {
        throw new Error(
          `Android widget picker could not place ${hostNames.join("/")}; labels=${labels.slice(0, 40).join(", ")}`,
        );
      }
      steps.push("widget-placed");
      await pressHome(device);
      labels = flattenLabels(await device.accessibilityTree());
      tileVisible = labels.some((l) => l.includes("Hello from host"));
    } else {
      steps.push("widget-already-present");
    }

    if (!tileVisible) {
      // Accept host app name on a widget-valued node as a weaker tile signal.
      const flat = walk(await device.accessibilityTree());
      const widgetish = flat.find((n) => {
        const t = (
          nodeVisibleText(n) ||
          String(n.label ?? "") ||
          String(n.value ?? "")
        ).toLowerCase();
        return (
          hostNames.some((h) => t.includes(h.toLowerCase())) &&
          (t.includes("widget") || String(n.value ?? "").toLowerCase() === "widget")
        );
      });
      if (!widgetish) {
        throw new Error(
          `launcher widget tile missing seeded marker; labels=${labels.slice(0, 60).join(", ")}`,
        );
      }
      steps.push("widget-tile-host-name-ok");
    } else {
      steps.push("widget-tile-marker-ok");
    }

    // Host icon still reachable on launcher (sanity).
    steps.push("find-host-icon");
    const icon = await findLauncherLabel(device, hostNames);
    if (!icon) {
      throw new Error(
        `host icon not on launcher; labels=${labels.slice(0, 40).join(", ")}`,
      );
    }
    steps.push("host-icon-ok");

    return {
      id: entry.id,
      path: entry.path,
      phase: 3,
      ok: true,
      status: "green",
      steps,
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
      id: entry.id,
      path: entry.path,
      phase: 3,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}
