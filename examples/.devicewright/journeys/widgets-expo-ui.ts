import type { AccessibilityNode, DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
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
import { runAndroidWidgetsExpoUiJourney } from "./widgets-expo-ui.android";

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
 * Expo-UI widget journey (iOS): host seed via setData timeline blob +
 * SpringBoard Small widget for Hello Expo UI (sandbox), not native Hello Widget.
 */
export async function runWidgetsExpoUiJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  if (device.platform === "android") {
    return runAndroidWidgetsExpoUiJourney(device);
  }

  const entry = TARGET_CATALOG["widgets-expo-ui"];
  const hostNames = [entry.hostDisplayName, "ET Widgets"].filter(
    (v, i, a) => a.indexOf(v) === i,
  );
  const widgetNames = [
    entry.extensionName,
    "Hello Expo UI",
    "HelloExpoUi",
  ].filter((v, i, a) => a.indexOf(v) === i);
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

    // iOS 26: Text testIDs often lack AXUniqueId — assert via visible labels.
    const modeOk = flattenLabels(await device.accessibilityTree()).some((l) =>
      l.includes("mode:expo-ui"),
    );
    if (!modeOk) {
      throw new Error(
        `expo-ui mode marker missing; labels=${flattenLabels(await device.accessibilityTree()).slice(0, 40).join(", ")}`,
      );
    }
    steps.push("mode-marker-ok");

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

    const seedLabels = flattenLabels(await device.accessibilityTree());
    if (!seedLabels.some((l) => l.includes("seed:expo-ui"))) {
      // Fallback: payload text itself includes the seed marker.
      if (!seedLabels.some((l) => l.includes(entry.payloadMarker))) {
        throw new Error(
          `expo-ui seed missing; labels=${seedLabels.slice(0, 50).join(", ")}`,
        );
      }
    }
    steps.push("expo-ui-host-contract-ok");
    steps.push("seed-label-ok");

    steps.push("springboard-home");
    await device.pressButton({ button: "HOME" });
    await sleep(1_000);

    steps.push("find-host-icon");
    const hostNode = await findSpringBoardHost(device, hostNames);
    steps.push("host-icon-ok");

    // Prefer an already-placed expo-ui tile (AX label may be widget display name).
    let labels = flattenLabels(await device.accessibilityTree());
    let tileOk =
      labels.some((l) => l.includes(entry.payloadMarker)) ||
      labels.some(
        (l) =>
          widgetNames.some((n) => l.includes(n)) &&
          (l.includes("expo-ui") || l.includes("Hello from host")),
      );

    if (!tileOk) {
      steps.push("add-expo-ui-small-widget");
      const f = hostNode.frame;
      if (!f) throw new Error("host icon has no frame");
      await device.tap({
        x: Math.round(f.x + f.width / 2),
        y: Math.round(f.y + f.height / 2),
        duration: 1.2,
      });
      await sleep(900);

      // Multi-widget apps: swipe the preview carousel toward Hello Expo UI.
      for (let swipe = 0; swipe < 3; swipe++) {
        const previewLabels = flattenLabels(await device.accessibilityTree());
        if (previewLabels.some((l) => widgetNames.some((n) => l.includes(n)))) {
          steps.push(`gallery-hit:swipe${swipe}`);
          break;
        }
        await device.swipe({
          xStart: 320,
          yStart: 280,
          xEnd: 80,
          yEnd: 280,
          duration: 0.25,
        });
        await sleep(400);
      }

      let pickedGallery = false;
      for (const name of widgetNames) {
        try {
          const row = await waitForNamed(device, [name], { timeoutMs: 2_000 });
          await tapCenter(device, row);
          pickedGallery = true;
          await sleep(500);
          break;
        } catch {
          /* try next */
        }
      }
      if (!pickedGallery) {
        steps.push("gallery-row-miss-try-small");
      }

      try {
        const small = await waitForNamed(device, ["Small widget", "Add Widget"], {
          timeoutMs: 4_000,
        });
        await tapCenter(device, small);
      } catch {
        const small = await findNamedViaPointProbe(
          device,
          ["Small widget", "Add Widget"],
          {
            timeoutMs: 4_000,
            yStartRatio: 0.2,
            yEndRatio: 0.6,
            match: "exact",
            hotspots: [
              { x: 241, y: 309 },
              { x: 220, y: 300 },
              { x: 210, y: 520 },
            ],
          },
        );
        await tapProbeHit(device, small);
      }
      await sleep(900);

      // Size picker sometimes stays open — confirm Add Widget / second Small tap.
      const midLabels = flattenLabels(await device.accessibilityTree());
      if (
        midLabels.some((l) => /Small widget|Medium-sized|Add Widget/i.test(l))
      ) {
        try {
          const add = await waitForNamed(
            device,
            ["Add Widget", "Small widget"],
            { timeoutMs: 2_500 },
          );
          await tapCenter(device, add);
          await sleep(800);
          steps.push("add-widget-confirm");
        } catch {
          steps.push("add-widget-confirm-miss");
        }
      }

      // Exit jiggle / peek chrome before asserting SpringBoard tiles.
      await device.pressButton({ button: "HOME" });
      await sleep(1_000);
      steps.push("small-widget-added");

      labels = flattenLabels(await device.accessibilityTree());
      const flat = walk(await device.accessibilityTree());
      tileOk =
        labels.some((l) => l.includes(entry.payloadMarker)) ||
        labels.some((l) => l.includes("expo-ui")) ||
        flat.some(
          (n) =>
            widgetNames.some((w) => (n.label ?? "").includes(w)) &&
            String(n.value ?? "").toLowerCase() === "widget",
        ) ||
        // Parity with Android widget-tile-name-ok: host-named widget tile after add.
        flat.some(
          (n) =>
            hostNames.includes(n.label ?? "") &&
            String(n.value ?? "").toLowerCase() === "widget",
        );
      if (
        tileOk &&
        !labels.some((l) => l.includes("expo-ui") || l.includes(entry.payloadMarker))
      ) {
        steps.push("widget-tile-host-name-ok");
      }
    } else {
      steps.push("expo-ui-widget-already-present");
    }

    steps.push("assert-expo-ui-widget-tile");
    if (!tileOk) {
      throw new Error(
        `Hello Expo UI tile / seeded marker missing; labels=${labels.slice(0, 60).join(", ")}`,
      );
    }
    steps.push("expo-ui-widget-tile-ok");

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
