import type { AccessibilityNode, DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
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
  for (let page = 0; page < 4; page++) {
    try {
      return await waitForNamed(device, names, { timeoutMs: 2_500 });
    } catch {
      await device.swipe({
        xStart: 360,
        yStart: 400,
        xEnd: 60,
        yEnd: 400,
        duration: 0.3,
      });
      await sleep(500);
    }
  }
  const tree = await device.accessibilityTree();
  throw new Error(
    `host icon not on SpringBoard; labels=${flattenLabels(tree).slice(0, 60).join(", ")}`,
  );
}

/**
 * Widgets A: host App-Group seed (message + family) + SpringBoard Small widget.
 * Soft constant markers alone are not green — seed-derived asserts required.
 */
export async function runWidgetsJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
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

    // Require seeded message (App Group → host UI).
    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      "Hello from host",
      8_000,
    );
    steps.push("host-contract-ok");

    // Family must appear in the seeded payload (not only constant intent-note).
    const familyOk = async () => {
      try {
        await assertPayloadContains(
          device,
          "text-seed-family",
          "seed:family:systemSmall",
          2_000,
        );
        return "seed-family";
      } catch {
        /* fall through */
      }
      try {
        await assertPayloadContains(
          device,
          entry.testIds.lastPayload,
          "family:systemSmall",
          2_000,
        );
        return "payload";
      } catch {
        return null;
      }
    };
    const familyHow = await familyOk();
    if (!familyHow) {
      throw new Error(
        "widgets seed missing family:systemSmall (rebuild host if App.tsx seed changed)",
      );
    }
    steps.push(`marker-ok:family:systemSmall:${familyHow}`);

    await assertPayloadContains(
      device,
      "text-widget-families",
      "systemMedium",
      4_000,
    );
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
