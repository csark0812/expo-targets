/**
 * Content Blocker deep journey.
 *
 * Apple capability path (iOS 26):
 * Settings → Apps → Safari → Content Blockers (All Websites master On)
 * → Extensions (individual blockers list here) → ET Blocker Allow On
 * → Safari local fixture proves css-display-none (not DNS-ambiguous URL nav).
 *
 * GREEN = host rules + master On + Allow On + fixture hides .et-blocked-ad.
 */
import { spawnSync } from "node:child_process";
import type { DeviceSession } from "@csark0812/devicewright";
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
  assertFixtureViaMaestro,
  startContentBlockerFixture,
} from "./content-blocker-fixture";
import {
  openAppexAndAllowExtension,
  openSafariExtensionsOrBlockers,
  openSystemSafariSettings,
  tapLabelInTree,
} from "./settings-nav";

function isOn(value: unknown): boolean {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true" || v === "on";
}

/** iOS 26 Content Blockers page: master CheckBox id/label "All Websites". */
async function ensureAllWebsitesBlockersOn(
  device: DeviceSession,
  steps: string[],
): Promise<void> {
  const tree = await device.accessibilityTree();
  const toggle =
    tree.find((n) => String(n.identifier ?? "") === "All Websites") ??
    tree.find((n) => (n.label ?? "").trim() === "All Websites");
  if (!toggle?.frame) {
    throw new Error(
      `Content Blockers missing All Websites toggle; labels=${flattenLabels(tree).slice(0, 30).join("|")}`,
    );
  }
  if (isOn(toggle.value)) {
    steps.push("content-blockers-all-websites-already-on");
    return;
  }
  const f = toggle.frame;
  await device.tap({
    x: Math.round(f.x + f.width * 0.85),
    y: Math.round(f.y + f.height / 2),
  });
  await sleep(500);
  const after = await device.accessibilityTree();
  const again =
    after.find((n) => String(n.identifier ?? "") === "All Websites") ??
    after.find((n) => (n.label ?? "").trim() === "All Websites");
  if (!isOn(again?.value)) {
    throw new Error(
      `Content Blockers All Websites did not turn On; value=${again?.value}`,
    );
  }
  steps.push("content-blockers-all-websites-on");
}

async function backToSafariSettings(
  device: DeviceSession,
  steps: string[],
): Promise<void> {
  try {
    await device.getById("BackButton", { timeoutMs: 2_000 }).tap();
    steps.push("back:safari-settings");
    await sleep(600);
    return;
  } catch {
    /* fall through */
  }
  if (await tapLabelInTree(device, ["Safari"], { exactOnly: true })) {
    steps.push("back:safari-label");
    await sleep(600);
    return;
  }
  // iOS 26 Content Blockers nav chrome is often AX-thin — chevron hotspot.
  await device.tap({ x: 40, y: 90 });
  await sleep(700);
  const labels = flattenLabels(await device.accessibilityTree());
  if (
    labels.some((l) => /Search Engine|Extensions|WEB_EXTENSIONS/i.test(l))
  ) {
    steps.push("back:safari-hotspot");
    return;
  }
  // Last resort: re-enter Safari settings from Apps search.
  await openSystemSafariSettings(device, steps);
  steps.push("back:reopen-safari-settings");
}

async function openSafariUrl(
  device: DeviceSession,
  url: string,
  steps: string[],
): Promise<void> {
  // Prefer simctl openurl — AX typing corrupts `://` into Google search.
  spawnSync(
    "xcrun",
    ["simctl", "terminate", device.deviceId, "com.apple.mobilesafari"],
    { encoding: "utf8", env: process.env },
  );
  await sleep(400);

  const opened = spawnSync(
    "xcrun",
    ["simctl", "openurl", device.deviceId, url],
    { encoding: "utf8", env: process.env },
  );
  if (opened.status === 0) {
    await sleep(2_500);
    steps.push("safari-simctl-openurl");
    await dismissSystemAlerts(device);
    return;
  }
  steps.push(`safari-simctl-fail:${(opened.stderr || "").slice(0, 80)}`);

  await device.launchApp("com.apple.mobilesafari", {
    terminateRunning: true,
  });
  steps.push("safari-launch");
  await sleep(1_000);
  await dismissSystemAlerts(device);

  if (typeof device.openUrl === "function") {
    try {
      await device.openUrl(url);
      await sleep(2_000);
      steps.push("safari-openurl");
      return;
    } catch {
      steps.push("safari-openurl-skip");
    }
  }

  throw new Error(
    `content-blocker could not open fixture URL via simctl/openUrl: ${url}`,
  );
}

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
  let fixtureClose: (() => Promise<void>) | undefined;

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
    // iOS 26: Content Blockers page is master toggle only; appex rows live under Extensions.
    await openSafariExtensionsOrBlockers(device, steps, "blockers");
    await ensureAllWebsitesBlockersOn(device, steps);
    await backToSafariSettings(device, steps);
    await openSafariExtensionsOrBlockers(device, steps, "extensions");

    const appexIds = [
      "com.expotargets.example.content-blocker.content-blocker",
    ];
    let listed = false;
    for (let i = 0; i < 16; i++) {
      const tree = await device.accessibilityTree();
      listed =
        tree.some((n) => appexIds.includes(String(n.identifier ?? ""))) ||
        flattenLabels(tree).some((l) =>
          appexLabels.some((a) => l.toLowerCase().includes(a.toLowerCase())),
        );
      if (listed) break;
      await sleep(500);
    }
    if (!listed) {
      const tree = await device.accessibilityTree();
      throw new Error(
        `Content blocker not listed under Extensions; labels=${flattenLabels(tree).slice(0, 40).join("|")}`,
      );
    }
    steps.push("content-blocker-listed");

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

    // Reload after Allow On so Safari picks up rules before the fixture load.
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 10_000);
    try {
      await tapId(device, "btn-reload-blocker", 5_000);
      steps.push("host-reload-after-allow");
    } catch {
      steps.push("host-reload-after-allow-skip");
    }
    await sleep(800);

    const fixture = await startContentBlockerFixture();
    fixtureClose = fixture.close;
    steps.push(`fixture-url:${fixture.url}`);

    await openSafariUrl(device, fixture.url, steps);

    // idb AX cannot see Safari web text; Maestro hierarchy can.
    const proof = assertFixtureViaMaestro(device.deviceId, steps);
    if (!proof.ok) {
      throw new Error(
        `content-blocker css-display-none fixture failed: ${proof.detail}`,
      );
    }

    steps.push("content-blocker-css-proof");
    return {
      id: "content-blocker",
      path,
      phase: 4,
      ok: true,
      status: "green",
      steps,
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed|no LAN IPv4/i.test(
      msg,
    )
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
  } finally {
    try {
      await fixtureClose?.();
    } catch {
      /* ignore */
    }
  }
}
