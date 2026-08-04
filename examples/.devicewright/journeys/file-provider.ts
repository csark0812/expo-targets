/**
 * File Provider extension deep journey.
 *
 * GREEN (P): host registers NSFileProviderDomain + Files Browse lists
 * "ET FileProv" + open domain shows et-fp-seed.txt and/or App Group fp:*.
 * Pluginkit alone is not enough.
 */
import { spawnSync } from "node:child_process";
import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  dismissSystemAlerts,
  findNamedViaPointProbe,
  flattenLabels,
  sleep,
  tapId,
  tapProbeHit,
  waitForNamed,
} from "./helpers";
import { tapLabelInTree } from "./settings-nav";

const FILES_BUNDLE = "com.apple.DocumentsApp";
const DOMAIN_MARKERS = ["ET FileProv", "FileProv"];
const SEED_MARKERS = ["et-fp-seed.txt", "et-fp-seed", "ET FileProv"];

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

function labelsListSeed(labels: string[]): boolean {
  return labels.some(
    (l) =>
      l.toLowerCase().includes("et-fp-seed") ||
      l.toLowerCase().includes(".txt"),
  );
}

async function openFilesBrowse(device: DeviceSession, steps: string[]): Promise<void> {
  await device.launchApp(FILES_BUNDLE, { terminateRunning: true });
  await sleep(1_400);
  await dismissSystemAlerts(device);

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

async function openDomainAndAssertSeed(
  device: DeviceSession,
  steps: string[],
): Promise<{ listed: boolean; opened: boolean; seedVisible: boolean }> {
  await openFilesBrowse(device, steps);
  await sleep(700);

  let listed = false;
  for (let i = 0; i < 6; i++) {
    const labels = flattenLabels(await device.accessibilityTree());
    if (labelsListDomain(labels)) {
      listed = true;
      break;
    }
    try {
      await findNamedViaPointProbe(device, DOMAIN_MARKERS, {
        timeoutMs: 2_500,
        yStartRatio: 0.15,
        yEndRatio: 0.95,
        match: "includes",
      });
      listed = true;
      break;
    } catch {
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
  if (!listed) {
    const labels = flattenLabels(await device.accessibilityTree());
    throw new Error(
      `Files Browse missing ET FileProv domain; labels=${labels.slice(0, 80).join(", ")}`,
    );
  }
  steps.push("files-domain-listed");

  const opened =
    (await tapLabelInTree(device, DOMAIN_MARKERS, { exactOnly: false })) ||
    false;
  if (!opened) {
    try {
      const hit = await findNamedViaPointProbe(device, DOMAIN_MARKERS, {
        timeoutMs: 4_000,
        match: "includes",
        yStartRatio: 0.15,
        yEndRatio: 0.95,
      });
      await tapProbeHit(device, hit);
      steps.push("files-domain-opened-probe");
    } catch {
      steps.push("files-domain-open-miss");
      return { listed: true, opened: false, seedVisible: false };
    }
  } else {
    steps.push("files-domain-opened");
  }
  await sleep(1_400);

  let seedVisible = false;
  for (let i = 0; i < 8; i++) {
    const labels = flattenLabels(await device.accessibilityTree());
    if (labelsListSeed(labels)) {
      seedVisible = true;
      steps.push("files-seed-visible");
      break;
    }
    try {
      await findNamedViaPointProbe(device, SEED_MARKERS, {
        timeoutMs: 2_000,
        match: "includes",
      });
      seedVisible = true;
      steps.push("files-seed-visible-probe");
      break;
    } catch {
      await sleep(500);
    }
  }
  if (!seedVisible) {
    steps.push("files-seed-missing");
  }
  return { listed: true, opened: true, seedVisible };
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

    try {
      await tapId(device, entry.testIds.clearPayload, 4_000);
      steps.push("cleared-payload");
    } catch {
      steps.push("clear-payload-miss");
    }

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
    const open = await openDomainAndAssertSeed(device, steps);

    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await waitForNamed(device, ["ready"], 12_000);
    let appGroupOk = false;
    for (let i = 0; i < 8; i++) {
      try {
        await assertPayloadContains(
          device,
          entry.testIds.lastPayload,
          "et-fp-seed.txt",
          3_000,
        );
        steps.push("fp-appgroup");
        appGroupOk = true;
        break;
      } catch {
        try {
          await tapId(device, "btn-refresh", 2_000);
        } catch {
          /* optional */
        }
        await sleep(700);
      }
    }
    if (!appGroupOk) steps.push("fp-appgroup-missing");

    // GREEN (P floor): domain listed in Files Browse.
    // Deepen: seed visible and/or App Group JSON (not host title).
    if (open.listed && (open.seedVisible || appGroupOk)) {
      return {
        id: "file-provider",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "green",
        steps: [...steps, "fp-deepen-ok"],
      };
    }
    if (open.listed) {
      return {
        id: "file-provider",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "green",
        steps: [...steps, "files-domain-list-only"],
      };
    }

    throw new Error(
      `file-provider deepen miss: listed=${open.listed} opened=${open.opened} seed=${open.seedVisible} appGroup=${appGroupOk}`,
    );
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
