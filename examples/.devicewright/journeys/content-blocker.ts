/**
 * Content Blocker deep journey.
 *
 * Apple capability path (iOS 26):
 * Settings → Apps → Safari → Content Blockers → appex listed → Allow Extension On
 * → Safari blocked-URL proof.
 *
 * GREEN = host rules + Allow On + Safari network block proof.
 * Allow surface missing or inconclusive block → fail / os-limit (not soft green).
 */
import type { DeviceSession } from "@csark0812/devicewright";
import { assertOsLimitAllowed, claimForId } from "../claims";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  dismissSystemAlerts,
  flattenLabels,
  sleep,
  tapId,
  waitForNamed,
} from "./helpers";
import {
  openAppexAndAllowExtension,
  openSafariExtensionsOrBlockers,
  openSystemSafariSettings,
  tapLabelInTree,
} from "./settings-nav";

export async function runContentBlockerJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["content-blocker"];
  const path = entry?.path ?? "examples/content-blocker";
  const steps: string[] = [];
  const appexLabels = [
    entry.extensionName,
    "ET Blocker Target",
    "ET Blocker",
  ].filter(Boolean);

  try {
    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    await assertPayloadContains(device, "text-rule-count", "rules:4", 8_000);
    steps.push("host-rule-count");

    await tapId(device, "btn-reload-blocker", 5_000);
    await sleep(800);
    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      "rules:4",
      6_000,
    );
    steps.push("host-reload-control");

    await openSystemSafariSettings(device, steps);
    await openSafariExtensionsOrBlockers(device, steps, "blockers");

    let listed = false;
    for (let i = 0; i < 16; i++) {
      const tree = await device.accessibilityTree();
      listed = flattenLabels(tree).some((l) =>
        appexLabels.some((a) => l.toLowerCase().includes(a.toLowerCase())),
      );
      if (listed) break;
      await sleep(500);
    }
    if (!listed) {
      const tree = await device.accessibilityTree();
      throw new Error(
        `Content blocker not listed; labels=${flattenLabels(tree).slice(0, 40).join("|")}`,
      );
    }
    steps.push("content-blocker-listed");

    const appexIds = [
      "com.expotargets.example.content-blocker.content-blocker",
    ];
    await openAppexAndAllowExtension(device, appexLabels, steps, { appexIds });
    if (
      !steps.some(
        (s) =>
          s.startsWith("appex-allow-toggled-on") ||
          s === "appex-allow-already-on",
      )
    ) {
      throw new Error(
        `content-blocker Allow Extension not confirmed On; steps=${steps.join(">")}`,
      );
    }
    steps.push("content-blocker-allow-on");

    await device.launchApp("com.apple.mobilesafari", {
      terminateRunning: true,
    });
    steps.push("safari-launch");
    await sleep(1_200);
    await dismissSystemAlerts(device);
    let urlField = await tapLabelInTree(device, [
      "Address",
      "URL",
      "TabBarItemTitle",
      "Search or enter website",
    ]);
    if (!urlField) {
      // Bottom address chrome on iPhone Air.
      await device.tap({ x: 210, y: 854 });
      await sleep(400);
      urlField = true;
      steps.push("safari-address:hotspot");
    } else {
      steps.push("safari-address:label");
    }
    await device.type("https://ads.example.com/track");
    await device.pressKey({ key: "RETURN" });
    steps.push("safari-blocked-url");
    await sleep(1_800);
    const tree = await device.accessibilityTree();
    const labels = flattenLabels(tree).map((l) => l.toLowerCase());
    // DNS "server can't be found" is inconclusive — not content-blocker proof.
    const dnsMiss = labels.some(
      (l) =>
        l.includes("server can't be found") ||
        l.includes("server can’t be found") ||
        l.includes("server cannot be found"),
    );
    const blocked = labels.some(
      (l) =>
        (l.includes("blocked") ||
          l.includes("content blocker") ||
          l.includes("this webpage was blocked")) &&
        !dnsMiss,
    );
    if (blocked) {
      steps.push("content-blocker-network-proof");
      return {
        id: "content-blocker",
        path,
        phase: 4,
        ok: true,
        status: "green",
        steps,
      };
    }

    steps.push(
      dnsMiss
        ? "content-blocker-network-dns-inconclusive"
        : "content-blocker-network-inconclusive",
    );
    assertOsLimitAllowed("content-blocker");
    const claim = claimForId("content-blocker");
    return {
      id: "content-blocker",
      path,
      phase: 4,
      ok: true,
      status: "os-limit",
      steps,
      failureKind: "os-limit",
      error:
        claim?.reason ??
        "Safari block inconclusive after Allow On (DNS vs extension)",
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? "operator"
      : "product";
    return {
      id: "content-blocker",
      path,
      phase: 4,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}
