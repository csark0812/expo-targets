/**
 * One-shot probe: Messages filter Settings surfaces + Spotlight CSImport invoke.
 * Run: bun examples/.devicewright/artifacts/spikes/probe-mf-spotlight.ts
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { devices } from "@csark0812/devicewright";

const UDID = process.env.DEVICEWRIGHT_UDID!;
const SETTINGS = "com.apple.Preferences";
const FILES = "com.apple.DocumentsApp";
const SPOT = "com.expotargets.example.spotlight";

function labels(tree: Array<Record<string, unknown>>): string[] {
  return tree
    .map((n) => String(n.label ?? n.name ?? "").trim())
    .filter(Boolean);
}

function dump(tag: string, tree: Array<Record<string, unknown>>): void {
  const labs = labels(tree);
  console.log(`\n=== ${tag} (${labs.length} labels) ===`);
  console.log(labs.slice(0, 100).join(" | "));
  const hit = labs.filter((l) =>
    /message|filter|spam|unknown|sender|sms|mms|block|spotlight|import|etspot|et-import|search/i.test(
      l,
    ),
  );
  console.log("hits:", hit.slice(0, 50).join(" | ") || "(none)");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function tapText(
  device: Awaited<ReturnType<typeof devices.launch>>,
  name: string,
  exact = false,
): Promise<boolean> {
  try {
    if (exact) {
      await device.getByText(name, { exact: true }).first().tap();
    } else {
      await device.getByText(name).first().tap();
    }
    return true;
  } catch {
    return false;
  }
}

const device = await devices.launch({
  platform: "ios",
  deviceId: UDID,
  lock: true,
});
try {
  for (const url of [
    "App-prefs:MESSAGES",
    "prefs:root=MESSAGES",
    "App-prefs:root=MESSAGES",
  ]) {
    try {
      await device.openUrl(url);
      await sleep(1200);
      dump(`openUrl:${url}`, await device.accessibilityTree());
    } catch (e) {
      console.log(`openUrl fail ${url}:`, String(e).slice(0, 160));
    }
  }

  await device.launchApp(SETTINGS, { terminateRunning: true });
  await sleep(800);
  dump("settings-root", await device.accessibilityTree());
  await tapText(device, "Apps");
  await sleep(800);
  dump("settings-apps", await device.accessibilityTree());
  if (!(await tapText(device, "Search Apps"))) {
    await tapText(device, "Search");
  }
  await sleep(400);
  await device.type("Messages");
  await sleep(1100);
  dump("apps-search-Messages", await device.accessibilityTree());
  if (!(await tapText(device, "Messages", true))) {
    await tapText(device, "Messages");
  }
  await sleep(1600);
  dump("messages-settings", await device.accessibilityTree());
  for (let i = 0; i < 5; i++) {
    await device
      .swipe({ xStart: 210, yStart: 720, xEnd: 210, yEnd: 220, duration: 0.35 })
      .catch(() => undefined);
    await sleep(650);
    dump(`messages-scroll-${i}`, await device.accessibilityTree());
  }

  const prefs = spawnSync(
    "xcrun",
    ["simctl", "spawn", UDID, "defaults", "read", "com.apple.MobileSMS"],
    { encoding: "utf8", maxBuffer: 5 * 1024 * 1024 },
  );
  const prefHits = `${prefs.stdout}\n${prefs.stderr}`
    .split("\n")
    .filter((l) => /filter|spam|unknown|junk|block|ILMessage/i.test(l))
    .slice(0, 50);
  console.log("\n=== MobileSMS defaults hits ===\n", prefHits.join("\n") || "(none)");

  const pk = spawnSync(
    "xcrun",
    ["simctl", "spawn", UDID, "pluginkit", "-mAvvvvv"],
    { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
  );
  const mf = `${pk.stdout}\n${pk.stderr}`
    .split("\n")
    .filter((l) => /message-filter|MsgFilter|identitylookup|spotlight\.import|etspot/i.test(l));
  console.log("\n=== pluginkit hits ===\n", mf.slice(0, 40).join("\n"));

  // Spotlight fixture + Files
  const container = spawnSync(
    "xcrun",
    ["simctl", "get_app_container", UDID, SPOT, "data"],
    { encoding: "utf8" },
  ).stdout.trim();
  const docs = path.join(container, "Documents");
  fs.mkdirSync(docs, { recursive: true });
  const fixture = path.join(docs, "et-import.etspot");
  fs.writeFileSync(fixture, "expo-targets spotlight importer fixture\n");
  console.log("\nfixture", fixture);

  for (const cmd of [
    ["mdls", "-name", "kMDItemContentType", "-name", "kMDItemContentTypeTree", fixture],
    ["xcrun", "simctl", "spawn", UDID, "mdimport", "-i", fixture],
  ] as string[][]) {
    const r = spawnSync(cmd[0]!, cmd.slice(1), { encoding: "utf8" });
    console.log(
      `\n$ ${cmd.join(" ")}\n`,
      (r.stdout || r.stderr || "").slice(0, 600),
      "status",
      r.status,
    );
  }

  await device.launchApp(FILES, { terminateRunning: true });
  await sleep(1400);
  await device.tap({ x: 315, y: 880 });
  await sleep(900);
  dump("files-browse", await device.accessibilityTree());
  await tapText(device, "On My iPhone");
  await sleep(900);
  dump("files-on-my", await device.accessibilityTree());
  if (!(await tapText(device, "ET Spotlight"))) {
    await tapText(device, "Spotlight");
  }
  await sleep(900);
  dump("files-spotlight-folder", await device.accessibilityTree());
  if (!(await tapText(device, "et-import.etspot"))) {
    await tapText(device, "et-import");
  }
  await sleep(2500);
  dump("after-open-etspot", await device.accessibilityTree());

  await device.launchApp(SPOT, { terminateRunning: true });
  await sleep(1800);
  dump("spotlight-host", await device.accessibilityTree());
  const tree = await device.accessibilityTree();
  const payload = tree.find((n) =>
    String(n.identifier ?? "").includes("text-last-payload"),
  );
  console.log("payload node:", JSON.stringify(payload, null, 2));

  const find = spawnSync(
    "find",
    [
      path.join(process.env.HOME!, "Library/Developer/CoreSimulator/Devices", UDID),
      "-name",
      "*spotlight*",
      "-path",
      "*AppGroup*",
    ],
    { encoding: "utf8", timeout: 20_000 },
  );
  console.log("appgroup paths:\n", find.stdout.split("\n").slice(0, 30).join("\n"));
} finally {
  await device.close().catch(() => undefined);
}
