/**
 * Spotlight import deep journey.
 *
 * GREEN (P): pluginkit lists spotlight.import + importer writes App Group
 * marker and/or Spotlight search shows "ET Spotlight Import".
 *
 * System indexer timing is often opaque on Simulator — exhausted honest
 * attempts exit os-limit (CLAIMS).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { DeviceSession } from "@csark0812/devicewright";
import { claimForId } from "../claims";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  dismissSystemAlerts,
  findNamedViaPointProbe,
  sleep,
  tapProbeHit,
  waitForNamed,
} from "./helpers";
import { tapLabelInTree } from "./settings-nav";

const FILES_BUNDLE = "com.apple.DocumentsApp";
const FIXTURE_NAME = "et-import.etspot";

function pluginkitHasSpotlightImport(udid: string, appexId: string): boolean {
  const r = spawnSync(
    "xcrun",
    ["simctl", "spawn", udid, "pluginkit", "-mAvvvvv"],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, env: process.env },
  );
  const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
  return (
    out.toLowerCase().includes(appexId.toLowerCase()) &&
    /spotlight\.import/i.test(out)
  );
}

function writeFixtureToDocuments(
  udid: string,
  hostBundleId: string,
  steps: string[],
): void {
  const container = spawnSync(
    "xcrun",
    ["simctl", "get_app_container", udid, hostBundleId, "data"],
    { encoding: "utf8" },
  );
  if (container.status !== 0) {
    throw new Error(
      `get_app_container data failed: ${container.stderr || container.stdout}`,
    );
  }
  const docs = path.join(container.stdout.trim(), "Documents");
  fs.mkdirSync(docs, { recursive: true });
  fs.writeFileSync(
    path.join(docs, FIXTURE_NAME),
    "expo-targets spotlight importer fixture\n",
    "utf8",
  );
  steps.push(`fixture-written:${FIXTURE_NAME}`);
}

async function touchFileInFiles(device: DeviceSession, steps: string[]): Promise<void> {
  // Opening the file in Files can nudge Spotlight / Quick Look pipelines.
  await device.launchApp(FILES_BUNDLE, { terminateRunning: true });
  await sleep(1_200);
  await dismissSystemAlerts(device);
  await tapLabelInTree(device, ["Browse"], { exactOnly: true });
  await sleep(600);
  await tapLabelInTree(device, ["On My iPhone", "On My iPad"], {
    exactOnly: false,
  });
  await sleep(700);
  await tapLabelInTree(device, ["ET Spotlight", "ET Spotlight Target"], {
    exactOnly: false,
  });
  await sleep(700);
  const opened = await tapLabelInTree(device, [FIXTURE_NAME, "et-import"], {
    exactOnly: false,
  });
  if (opened) steps.push("files-fixture-touched");
  else steps.push("files-fixture-touch-skip");
  await sleep(800);
}

async function trySpotlightSearch(
  device: DeviceSession,
  steps: string[],
): Promise<boolean> {
  // SpringBoard Spotlight: HOME then swipe down from mid-screen.
  await device.pressButton({ button: "HOME" }).catch(() => undefined);
  await sleep(700);
  try {
    await device.swipe({
      xStart: 210,
      yStart: 120,
      xEnd: 210,
      yEnd: 700,
      duration: 0.35,
    });
  } catch {
    /* optional */
  }
  await sleep(900);
  steps.push("spotlight-gesture");

  try {
    const search = await findNamedViaPointProbe(
      device,
      ["Search", "SpotlightSearchField", "search"],
      { timeoutMs: 4_000, yStartRatio: 0.0, yEndRatio: 0.35, match: "includes" },
    );
    await tapProbeHit(device, search);
    await sleep(400);
  } catch {
    await tapLabelInTree(device, ["Search"]);
    await sleep(400);
  }

  await device.type("ET Spotlight Import");
  await sleep(2_000);
  steps.push("spotlight-typed");

  for (let i = 0; i < 10; i++) {
    const tree = await device.accessibilityTree();
    // Do NOT count the search field value (what we typed) as a hit.
    const hit = tree.some((n) => {
      const type = String((n as { type?: string }).type ?? "").toLowerCase();
      if (/search|textfield|field/i.test(type)) return false;
      const id = String(n.identifier ?? "");
      if (/search/i.test(id)) return false;
      const label = String(n.label ?? "");
      const value = String(n.value ?? "");
      // Exact-ish result row: importer displayName, not host app "ET Spotlight".
      return (
        /^ET Spotlight Import$/i.test(label.trim()) ||
        /expo-targets spotlight importer/i.test(label) ||
        /expo-targets spotlight importer/i.test(value)
      );
    });
    if (hit) {
      steps.push("spotlight-result-visible");
      return true;
    }
    await sleep(500);
  }
  return false;
}

export async function runSpotlightJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG.spotlight;
  const pathStr = entry?.path ?? "examples/spotlight";
  const claim = claimForId("spotlight");
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("spotlight: missing catalog entry");

    await dismissSystemAlerts(device);
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    const appexId = `${entry.hostBundleId}.spotlight`;
    if (!pluginkitHasSpotlightImport(device.deviceId, appexId)) {
      throw new Error(`spotlight.import appex missing from pluginkit (${appexId})`);
    }
    steps.push("pluginkit-spotlight-import");

    writeFixtureToDocuments(device.deviceId, entry.hostBundleId, steps);
    await touchFileInFiles(device, steps);

    // Poll App Group for importer side-effect (may take a while / never on Sim).
    let imported = false;
    for (let i = 0; i < 12; i++) {
      await device.launchApp(entry.hostBundleId, { terminateRunning: true });
      await sleep(600);
      try {
        await assertPayloadContains(
          device,
          entry.testIds.lastPayload,
          "ET Spotlight Import",
          2_500,
        );
        imported = true;
        steps.push("spotlight-import-appgroup");
        break;
      } catch {
        await sleep(1_000);
      }
    }

    const searchOk = await trySpotlightSearch(device, steps);
    // App Group marker is the only trusted importer proof on Sim.
    // Spotlight search alone is too easy to false-positive (typed query chrome).
    if (imported) {
      if (searchOk) steps.push("spotlight-search-corroborated");
      return {
        id: "spotlight",
        path: pathStr,
        phase: 5,
        ok: true,
        status: "green",
        steps,
      };
    }

    return {
      id: "spotlight",
      path: pathStr,
      phase: 5,
      ok: true,
      status: "os-limit",
      steps: [
        ...steps,
        searchOk ? "spotlight-search-untrusted" : "spotlight-import-unproven",
      ],
      failureKind: "os-limit",
      error:
        claim?.reason ??
        "Spotlight import registered but indexer did not write App Group marker on Simulator",
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? "operator"
      : "product";
    return {
      id: "spotlight",
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
