import type { AccessibilityNode, DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  dismissSystemAlerts,
  findNamedViaPointProbe,
  flattenLabels,
  findSpringBoardHostIcon,
  hostReadyTestId,
  sleep,
  tapCenter,
  tapId,
  tapProbeHit,
  waitForId,
  waitForNamed,
} from "./helpers";
import { runAndroidWidgetsJourney } from "./widgets.android";

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

async function findSpringBoardHost(
  device: DeviceSession,
  names: string[],
): Promise<AccessibilityNode> {
  return findSpringBoardHostIcon(device, names);
}

/**
 * Widgets A: host App-Group seed (message + family) + SpringBoard Small widget.
 * Soft constant markers alone are not green — seed-derived asserts required.
 */
export async function runWidgetsJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  if (device.platform === "android") {
    return runAndroidWidgetsJourney(device);
  }

  const entry = TARGET_CATALOG.widgets;
  const hostNames = [entry.hostDisplayName, "ET Widgets"].filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  const steps: string[] = [];
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
    try {
      await tapId(device, "btn-seed-payload", 8_000);
    } catch {
      const seed = await findNamedViaPointProbe(device, ["Seed payload"], {
        timeoutMs: 6_000,
        yStartRatio: 0.35,
        yEndRatio: 0.75,
        match: "exact",
        hotspots: [
          { x: 210, y: 450 },
          { x: 210, y: 480 },
        ],
      });
      await tapProbeHit(device, seed);
    }
    await sleep(500);

    // iOS 26: Text testIDs often lack AXUniqueId — assert via visible labels
    // (same pattern as widgets-expo-ui), with testID path as a fast path.
    const seedLabels = async () => flattenLabels(await device.accessibilityTree());
    try {
      await assertPayloadContains(
        device,
        entry.testIds.lastPayload,
        "Hello from host",
        2_000,
      );
    } catch {
      const labels = await seedLabels();
      if (
        !labels.some((l) => l.includes("Hello from host")) &&
        !labels.some((l) => l.includes("seed:Hello from host"))
      ) {
        throw new Error(
          `host seed missing; labels=${labels.slice(0, 50).join(", ")}`,
        );
      }
    }
    steps.push("host-contract-ok");

    try {
      await assertPayloadContains(device, "text-expo-ui-seed", "seed:expo-ui", 2_000);
    } catch {
      const labels = await seedLabels();
      if (!labels.some((l) => l.includes("seed:expo-ui"))) {
        throw new Error(
          `expo-ui seed missing; labels=${labels.slice(0, 50).join(", ")}`,
        );
      }
    }
    steps.push("expo-ui-host-contract-ok");

    // Family must appear in the seeded payload (not only constant intent-note).
    // Avoid bare "family:systemSmall" — Hero intent note always contains that substring.
    const labelsAfterSeed = await seedLabels();
    const familyHow = labelsAfterSeed.some((l) =>
      l.includes("seed:family:systemSmall"),
    )
      ? "seed-family"
      : labelsAfterSeed.some((l) =>
            l.includes("Hello from host · family:systemSmall"),
          )
        ? "payload"
        : null;
    if (!familyHow) {
      throw new Error(
        "widgets seed missing family:systemSmall (rebuild host if App.tsx seed changed)",
      );
    }
    steps.push(`marker-ok:family:systemSmall:${familyHow}`);

    if (!labelsAfterSeed.some((l) => l.includes("families:systemSmall,systemMedium"))) {
      try {
        await assertPayloadContains(
          device,
          "text-widget-families",
          "systemMedium",
          4_000,
        );
      } catch {
        throw new Error(
          `widgets families marker missing; labels=${labelsAfterSeed.slice(0, 40).join(", ")}`,
        );
      }
    }
    steps.push("families-medium-ok");

    steps.push("springboard-home");
    await device.pressButton({ button: "HOME" });
    await sleep(1_000);

    steps.push("find-host-icon");
    let hostNode = await findSpringBoardHost(device, hostNames);
    steps.push("host-icon-ok");

    const alreadyWidget =
      String(hostNode.value ?? "").toLowerCase() === "widget";
    if (!alreadyWidget) {
      steps.push("add-small-widget");
      const f = hostNode.frame;
      if (!f) throw new Error("host icon has no frame");
      await device.tap({
        x: Math.round(f.x + f.width / 2),
        y: Math.round(f.y + f.height / 2),
        duration: 1.2,
      });
      await sleep(900);

      try {
        const small = await waitForNamed(device, ["Small widget"], {
          timeoutMs: 4_000,
        });
        await tapCenter(device, small);
      } catch {
        const small = await findNamedViaPointProbe(device, ["Small widget"], {
          timeoutMs: 4_000,
          yStartRatio: 0.2,
          yEndRatio: 0.55,
          match: "exact",
          hotspots: [
            { x: 241, y: 309 },
            { x: 220, y: 300 },
          ],
        });
        await tapProbeHit(device, small);
      }
      await sleep(1_500);
      steps.push("small-widget-added");
      hostNode = await findSpringBoardHost(device, hostNames);
    } else {
      steps.push("small-widget-already-present");
    }

    steps.push("assert-widget-tile");
    const flat = walk(await device.accessibilityTree());
    const widgetTile = flat.find(
      (n) =>
        hostNames.includes(n.label ?? "") &&
        String(n.value ?? "").toLowerCase() === "widget",
    );
    const labels = flattenLabels(await device.accessibilityTree());
    // Prefer tile AX; also accept seeded message if WidgetKit exposes it.
    if (
      !widgetTile &&
      !labels.some((l) => l.includes("Hello from host"))
    ) {
      throw new Error(
        `Hello Widget tile missing after add; labels=${labels.slice(0, 60).join(", ")}`,
      );
    }
    steps.push("widget-tile-ok");

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
      /not installed|Unable to find|Launch failed|failed to launch|FBSOpenApplication|No such file or directory/i.test(
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
