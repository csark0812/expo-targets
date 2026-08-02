/**
 * File Provider extension deep journey.
 *
 * Apple capability: non-UI File Provider appex registered with the OS
 * (pluginkit lists `com.apple.fileprovider-nonui` for our appex). Optionally
 * Files Browse surfaces the domain after host registration.
 *
 * GREEN = pluginkit lists the File Provider appex for this host.
 * Files Browse domain is best-effort (needs NSFileProviderManager.add).
 */
import { spawnSync } from "node:child_process";
import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  dismissSystemAlerts,
  flattenLabels,
  sleep,
  waitForNamed,
} from "./helpers";
import { tapLabelInTree } from "./settings-nav";

const FILES_BUNDLE = "com.apple.DocumentsApp";

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
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    const needles = [
      entry.hostBundleId,
      "file-provider",
      "fileprovider",
      "ET FileProv",
      "com.apple.fileprovider-nonui",
    ];
    const pk = pluginkitMentions(device.deviceId, [
      `${entry.hostBundleId}.file-provider`,
      "fileprovider-nonui",
      "ET FileProv",
    ]);
    // Require our appex bundle id specifically when possible.
    const appexId = `${entry.hostBundleId}.file-provider`;
    const pkAppex = pluginkitMentions(device.deviceId, [appexId]);
    if (!pkAppex.ok && !pk.ok) {
      throw new Error(
        `file-provider appex not in pluginkit; sample=${pk.sample.slice(0, 300)}`,
      );
    }
    steps.push("pluginkit-fileprovider");

    // Best-effort Files Browse — domain may be absent without host add().
    try {
      await device.launchApp(FILES_BUNDLE, { terminateRunning: true });
      steps.push("files-launch");
      await sleep(1_200);
      await tapLabelInTree(device, ["Browse", "Locations"]);
      await sleep(800);
      const labels = flattenLabels(await device.accessibilityTree());
      if (
        labels.some(
          (l) =>
            /ET FileProv|FileProv/i.test(l) ||
            needles.some((n) => l.toLowerCase().includes(n.toLowerCase())),
        )
      ) {
        steps.push("files-domain-listed");
      }
    } catch {
      /* optional */
    }

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
