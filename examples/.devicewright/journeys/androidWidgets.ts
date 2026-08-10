import { spawnSync } from "node:child_process";
import type { AccessibilityNode, DeviceSession } from "@csark0812/devicewright";
import {
  ANDROID_POST_TAP_MS,
  ANDROID_SETTINGS_SETTLE_MS,
  findNamedViaPointProbe,
  flattenLabels,
  nodeVisibleText,
  sleep,
  tapCenter,
  tapId,
  tapProbeHit,
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

export async function pressHome(device: DeviceSession): Promise<void> {
  if (!device.pressButton) {
    throw new Error("pressButton(HOME) required for Android widgets journey");
  }
  await device.pressButton({ button: "HOME" });
  await sleep(400);
}

export async function findLauncherLabel(
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

/** Grant the host package bind permission (harmless if already granted). */
export function grantAppWidgetBind(
  serial: string,
  hostPackage: string,
): void {
  spawnSync(
    "adb",
    [
      "-s",
      serial,
      "shell",
      "appwidget",
      "grantbind",
      "--package",
      hostPackage,
      "--user",
      "current",
    ],
    { encoding: "utf8" },
  );
}

/**
 * True when dumpsys shows a live hosted instance of the Glance receiver.
 * Providers alone are not enough — launcher Host widgets.size must include us.
 */
export function dumpsysHostsProvider(
  serial: string,
  providerClassSuffix: string,
): boolean {
  const r = spawnSync(
    "adb",
    ["-s", serial, "shell", "dumpsys", "appwidget"],
    { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 },
  );
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  if (!out.includes(providerClassSuffix)) return false;
  // Hosted widgets list entries look like:
  //   provider=ProviderId{...cmp:ComponentInfo{pkg/…HelloWidgetWidgetReceiver}}
  // Prefer a Widgets: section match over Providers: registration.
  const widgetsIdx = out.indexOf("\nWidgets:");
  const hostsIdx = out.indexOf("\nHosts:");
  const slice =
    widgetsIdx >= 0
      ? out.slice(widgetsIdx, hostsIdx > widgetsIdx ? hostsIdx : undefined)
      : out;
  return slice.includes(providerClassSuffix);
}

async function confirmPinSheet(device: DeviceSession): Promise<boolean> {
  for (const label of [
    "Add to home screen",
    "Add to Home screen",
    "Add",
    "ADD",
    "OK",
    "Pin",
    "Allow",
  ]) {
    try {
      await tapCenter(device, await waitForNamed(device, [label], 2_500));
      await sleep(ANDROID_SETTINGS_SETTLE_MS);
      return true;
    } catch {
      // try next
    }
  }
  try {
    const hit = await findNamedViaPointProbe(
      device,
      ["Add to home screen", "Add to Home screen", "Add", "ADD", "OK", "Pin"],
      {
        timeoutMs: 3_000,
        match: "includes",
        yStartRatio: 0.4,
        yEndRatio: 0.98,
      },
    );
    await tapProbeHit(device, hit);
    await sleep(ANDROID_SETTINGS_SETTLE_MS);
    return true;
  } catch {
    return false;
  }
}

/**
 * Pin via host `requestPinWidget` sheet, then require seeded marker on launcher.
 * Rejects host-name-only / picker false greens.
 */
export async function pinAndAssertSeededWidget(
  device: DeviceSession,
  opts: {
    steps: string[];
    hostBundleId: string;
    pinButtonTestId: string;
    pinButtonName: string;
    seedMarkers: string[];
    providerClassSuffix: string;
    hostNames: string[];
  },
): Promise<void> {
  const {
    steps,
    hostBundleId,
    pinButtonTestId,
    pinButtonName,
    seedMarkers,
    providerClassSuffix,
    hostNames,
  } = opts;
  const serial = device.deviceId;

  steps.push("grant-appwidget-bind");
  grantAppWidgetBind(serial, hostBundleId);

  const markerVisible = async (): Promise<boolean> => {
    // Glance tiles can land on a non-current launcher page after pin.
    for (let page = 0; page < 5; page++) {
      const labels = flattenLabels(await device.accessibilityTree());
      if (seedMarkers.some((m) => labels.some((l) => l.includes(m)))) {
        return true;
      }
      await device.swipe({
        xStart: 900,
        yStart: 900,
        xEnd: 120,
        yEnd: 900,
        duration: 0.35,
      });
      await sleep(400);
    }
    return false;
  };

  steps.push("launcher-home-check");
  await pressHome(device);
  if (await markerVisible()) {
    steps.push("widget-already-present");
  } else {
    steps.push("launch-host-for-pin");
    await device.launchApp(hostBundleId, { terminateRunning: false });
    await sleep(500);

    steps.push("request-pin-sheet");
    let pinned = false;
    for (let pass = 0; pass < 6 && !pinned; pass++) {
      try {
        await tapId(device, pinButtonTestId, 2_500);
        pinned = true;
      } catch {
        try {
          const pin = await findNamedViaPointProbe(device, [pinButtonName], {
            timeoutMs: 1_500,
            match: "exact",
            yStartRatio: 0.05,
            yEndRatio: 0.95,
          });
          await tapProbeHit(device, pin);
          pinned = true;
        } catch {
          // Scroll down the host ScrollView to reveal pin controls.
          await device.swipe({
            xStart: 540,
            yStart: 1600,
            xEnd: 540,
            yEnd: 500,
            duration: 0.35,
          });
          await sleep(400);
        }
      }
    }
    if (!pinned) {
      throw new Error(
        `could not find pin control ${pinButtonTestId} / ${pinButtonName}`,
      );
    }
    await sleep(ANDROID_POST_TAP_MS);

    // Pin sheet can take a beat on Nexus Launcher (API 36).
    await sleep(700);

    steps.push("confirm-pin-sheet");
    const confirmed = await confirmPinSheet(device);
    if (confirmed) {
      steps.push("pin-confirmed");
    } else if (dumpsysHostsProvider(serial, providerClassSuffix)) {
      steps.push("pin-sheet-skipped-already-hosted");
    } else {
      throw new Error(
        `pin sheet did not confirm ("Add to home screen") and dumpsys has no hosted ${providerClassSuffix}`,
      );
    }

    await pressHome(device);
    await sleep(800);
  }

  steps.push("assert-seeded-tile");
  let visible = await markerVisible();
  if (!visible) {
    // One retry: cold-launch host (reset ScrollView), seed again, return home.
    steps.push("reseed-and-retry");
    await device.launchApp(hostBundleId, { terminateRunning: true });
    await sleep(800);
    // Prefer the top of the host scroll (seed controls sit above pin sections).
    for (let up = 0; up < 3; up++) {
      await device.swipe({
        xStart: 540,
        yStart: 500,
        xEnd: 540,
        yEnd: 1600,
        duration: 0.3,
      });
      await sleep(250);
    }
    try {
      await tapId(device, "btn-seed-payload", 6_000);
    } catch {
      const seed = await findNamedViaPointProbe(device, ["Seed payload"], {
        timeoutMs: 4_000,
        match: "exact",
        yStartRatio: 0.05,
        yEndRatio: 0.7,
        hotspots: [
          { x: 210, y: 450 },
          { x: 210, y: 520 },
        ],
      });
      await tapProbeHit(device, seed);
    }
    await sleep(900);
    await pressHome(device);
    await sleep(800);
    visible = await markerVisible();
  }

  if (!visible) {
    const labels = flattenLabels(await device.accessibilityTree());
    throw new Error(
      `launcher widget tile missing seeded marker (${seedMarkers.join(" | ")}); labels=${labels.slice(0, 60).join(", ")}`,
    );
  }
  steps.push("widget-tile-marker-ok");

  steps.push("assert-dumpsys-hosted");
  if (!dumpsysHostsProvider(serial, providerClassSuffix)) {
    throw new Error(
      `dumpsys appwidget has no hosted instance of ${providerClassSuffix}`,
    );
  }
  steps.push("dumpsys-hosted-ok");

  steps.push("find-host-icon");
  const icon = await findLauncherLabel(device, hostNames);
  if (!icon) {
    const labels = flattenLabels(await device.accessibilityTree());
    throw new Error(
      `host icon not on launcher; labels=${labels.slice(0, 40).join(", ")}`,
    );
  }
  steps.push("host-icon-ok");
}
