/**
 * File Provider extension deep journey.
 *
 * GREEN (P): host registers NSFileProviderDomain + Files Browse lists
 * "ET FileProv". Pluginkit alone is no longer enough.
 */
import { spawnSync } from "node:child_process";
import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  dismissSystemAlerts,
  findNamedViaPointProbe,
  flattenLabels,
  sleep,
  tapProbeHit,
} from "./helpers";
import { tapLabelInTree } from "./settings-nav";

const FILES_BUNDLE = "com.apple.DocumentsApp";
const DOMAIN_MARKERS = ["ET FileProv", "FileProv"];

function pluginkitMentions(
  udid: string,
  needles: string[],
): { ok: boolean; sample: string } {
  const r = spawnSync(
    "xcrun",
    ["simctl", "spawn", udid, "pluginkit", "-mAvvvvv"],
    {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      env: process.env,
    },
  );
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  const lower = out.toLowerCase();
  const ok = needles.some((n) => lower.includes(n.toLowerCase()));
  const sample = out
    .split("\n")
    .filter((line) =>
      needles.some((n) => line.toLowerCase().includes(n.toLowerCase())),
    )
    .slice(0, 8)
    .join(" | ");
  return { ok, sample: sample || out.slice(0, 400) };
}

function labelsListDomain(labels: string[]): boolean {
  return labels.some((l) =>
    DOMAIN_MARKERS.some((m) => l.toLowerCase().includes(m.toLowerCase())),
  );
}

async function openFilesBrowse(device: DeviceSession, steps: string[]): Promise<void> {
  await device.launchApp(FILES_BUNDLE, { terminateRunning: true });
  await sleep(1_400);
  await dismissSystemAlerts(device);

  // iOS 26 Files often lands on Recents — force the Browse tab.
  for (let i = 0; i < 4; i++) {
    const labels = flattenLabels(await device.accessibilityTree());
    const onBrowse =
      labels.some((l) => /^Locations$/i.test(l.trim())) ||
      labels.some((l) => /On My iPhone|iCloud Drive|Shared/i.test(l));
    if (onBrowse) {
      steps.push("files-browse-surface");
      return;
    }
    const tapped = await tapLabelInTree(device, ["Browse", "Locations"], {
      exactOnly: true,
    });
    if (!tapped) {
      // Tab bar hotspot (iPhone Air): Browse is typically the right tab.
      try {
        await findNamedViaPointProbe(device, ["Browse"], {
          timeoutMs: 2_000,
          yStartRatio: 0.85,
          yEndRatio: 1.0,
          match: "includes",
        }).then((hit) => tapProbeHit(device, hit));
      } catch {
        await device.tap({ x: 315, y: 880 });
        steps.push("files-browse-tab-hotspot");
      }
    } else {
      steps.push("files-browse-tab");
    }
    await sleep(800);
  }
}

async function assertFilesListsDomain(
  device: DeviceSession,
  steps: string[],
): Promise<void> {
  await openFilesBrowse(device, steps);
  await sleep(700);

  for (let i = 0; i < 6; i++) {
    const labels = flattenLabels(await device.accessibilityTree());
    if (labelsListDomain(labels)) return;
    try {
      await findNamedViaPointProbe(device, DOMAIN_MARKERS, {
        timeoutMs: 2_500,
        yStartRatio: 0.15,
        yEndRatio: 0.95,
        match: "includes",
      });
      return;
    } catch {
      // Sidebar / Locations list may need scroll; also re-tap Browse if Recents stuck.
      if (labels.some((l) => /No Recents|Recently opened/i.test(l))) {
        await tapLabelInTree(device, ["Browse"], { exactOnly: true });
        await sleep(600);
      }
      await device.swipe({
        xStart: 210,
        yStart: 700,
        xEnd: 210,
        yEnd: 250,
        duration: 0.35,
      });
      await sleep(600);
    }
  }
  const labels = flattenLabels(await device.accessibilityTree());
  throw new Error(
    `Files Browse missing ET FileProv domain; labels=${labels.slice(0, 80).join(", ")}`,
  );
}

export async function runFileProviderJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["file-provider"];
  const pathStr = entry?.path ?? "examples/file-provider";
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("file-provider: missing catalog entry");

    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 20_000);
    steps.push("host-ready");

    // Prefer auto-register on boot; tap Register if domain status still pending/error.
    // waitForNamed / point-probe often miss long labels — also accept flattenLabels.
    const domainStatus = async (): Promise<string | undefined> => {
      const labels = flattenLabels(await device.accessibilityTree());
      return labels.find((l) => /files-domain:/i.test(l));
    };
    const isRegistered = (s?: string) =>
      !!s && /files-domain:registered/i.test(s);

    let status = await domainStatus();
    for (let i = 0; i < 8 && !isRegistered(status); i++) {
      await sleep(500);
      status = await domainStatus();
    }
    steps.push(`domain-status:${status ?? "missing"}`);

    if (!isRegistered(status)) {
      try {
        const reg = await findNamedViaPointProbe(
          device,
          ["Register domain", "btn-register-domain"],
          {
            timeoutMs: 8_000,
            yStartRatio: 0.25,
            yEndRatio: 0.95,
            match: "includes",
          },
        );
        await tapProbeHit(device, reg);
        await sleep(1_500);
        for (let i = 0; i < 12 && !isRegistered(status); i++) {
          await sleep(500);
          status = await domainStatus();
        }
        steps.push(`domain-status-after-register:${status ?? "missing"}`);
      } catch (e) {
        throw new Error(
          `file-provider domain register failed (rebuild host if Register/domain UI missing): ${String(e)}; status=${status ?? "missing"}`,
        );
      }
    }
    if (!isRegistered(status)) {
      throw new Error(
        `file-provider domain not registered after boot/register; status=${status ?? "missing"}`,
      );
    }
    steps.push("domain-registered");

    const appexId = `${entry.hostBundleId}.file-provider`;
    const pkAppex = pluginkitMentions(device.deviceId, [appexId]);
    const pk = pluginkitMentions(device.deviceId, [
      appexId,
      "fileprovider-nonui",
      "ET FileProv",
    ]);
    if (!pkAppex.ok && !pk.ok) {
      throw new Error(
        `file-provider appex not in pluginkit; sample=${pk.sample.slice(0, 300)}`,
      );
    }
    steps.push("pluginkit-fileprovider");

    steps.push("files-launch");
    await assertFilesListsDomain(device, steps);
    steps.push("files-domain-listed");

    return {
      id: "file-provider",
      path: pathStr,
      phase: 5,
      ok: true,
      status: "green",
      steps,
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? "operator"
      : "product";
    return {
      id: "file-provider",
      path: pathStr,
      phase: 5,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}
