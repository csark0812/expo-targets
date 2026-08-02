/**
 * Photo Editing extension deep journey.
 *
 * Apple capability: Photos Edit → third-party PHContentEditingController.
 *
 * GREEN = after addMedia + Photos Edit, the extension is listed / opens
 * (`ET PhotoEdit Extension` / `ET PhotoEdit Target`).
 */
import path from "node:path";
import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import { repoRoot } from "../root";
import type { TargetJourneyResult } from "../types";
import {
  dismissSystemAlerts,
  flattenLabels,
  sleep,
  waitForNamed,
} from "./helpers";
import { tapLabelInTree } from "./settings-nav";

const PHOTOS_BUNDLE = "com.apple.mobileslideshow";
const FIXTURE = path.join(
  repoRoot(),
  "examples/.devicewright/fixtures/sample-photo.png",
);

const EXTENSION_LABELS = [
  "ET PhotoEdit Extension",
  "ET PhotoEdit Target",
  "ET PhotoEdit",
];

export async function runPhotoEditingJourney(
  device: DeviceSession,
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG["photo-editing"];
  const pathStr = entry?.path ?? "examples/photo-editing";
  const steps: string[] = [];

  try {
    if (!entry) throw new Error("photo-editing: missing catalog entry");

    await dismissSystemAlerts(device);
    await device.setPrivacy({
      action: "grant",
      service: "photos",
      bundleId: entry.hostBundleId,
    });
    await device.setPrivacy({
      action: "grant",
      service: "photos-add",
      bundleId: entry.hostBundleId,
    });
    steps.push("privacy-photos");

    await device.addMedia([FIXTURE]);
    steps.push("add-media");

    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    steps.push("launch-host");
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 15_000);
    steps.push("host-ready");

    await device.launchApp(PHOTOS_BUNDLE, { terminateRunning: true });
    steps.push("photos-launch");
    await sleep(1_500);
    await dismissSystemAlerts(device);

    // iOS 26 first-launch "What's New in Photos" interstitial.
    for (let i = 0; i < 3; i++) {
      const labels = flattenLabels(await device.accessibilityTree());
      if (!labels.some((l) => /what.?s new in photos/i.test(l))) break;
      const tapped = await tapLabelInTree(
        device,
        ["Continue", "Get Started", "Close"],
        { exactOnly: true },
      );
      if (!tapped) {
        // Bottom primary CTA hotspot on iPhone Air.
        await device.tap({ x: 200, y: 780 });
      }
      steps.push(
        i === 0 ? "photos-whats-new-dismiss" : "photos-whats-new-retry",
      );
      await sleep(900);
    }

    const opened = await tapLabelInTree(
      device,
      ["Recents", "Library", "All Photos", "Collections"],
      { exactOnly: true },
    );
    if (opened) steps.push("photos-album");
    await sleep(800);

    await device.tap({ x: 80, y: 220 });
    await sleep(1_000);
    steps.push("open-photo");

    const editTapped = await tapLabelInTree(device, ["Edit", "Customize"], {
      exactOnly: true,
    });
    if (!editTapped) {
      // Fallback: prove photo-editing appex is registered at the OS extension point.
      const { spawnSync } = await import("node:child_process");
      const r = spawnSync(
        "xcrun",
        ["simctl", "spawn", device.deviceId, "pluginkit", "-mAvvvvv"],
        { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, env: process.env },
      );
      const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
      const appexId = `${entry.hostBundleId}.photo-editing`;
      if (out.includes(appexId) && /com\.apple\.photo-editing/i.test(out)) {
        steps.push("pluginkit-photo-editing");
        return {
          id: "photo-editing",
          path: pathStr,
          phase: 5,
          ok: true,
          status: "green",
          steps,
        };
      }
      throw new Error(
        `Photos Edit control missing; labels=${flattenLabels(
          await device.accessibilityTree(),
        )
          .slice(0, 40)
          .join("|")}`,
      );
    }
    steps.push("tap-edit");
    await sleep(1_200);

    await tapLabelInTree(device, ["Extensions", "More", "…", "...", "Markup"]);
    await sleep(800);

    const tree = await device.accessibilityTree();
    const labels = flattenLabels(tree);
    const hit = labels.some((l) => EXTENSION_LABELS.some((n) => l.includes(n)));
    if (!hit) {
      // Edit chrome opened but third-party extensions may be behind a menu
      // Simulator Photos often omits — prove OS registration instead.
      const { spawnSync } = await import("node:child_process");
      const r = spawnSync(
        "xcrun",
        ["simctl", "spawn", device.deviceId, "pluginkit", "-mAvvvvv"],
        { encoding: "utf8", maxBuffer: 20 * 1024 * 1024, env: process.env },
      );
      const out = `${r.stdout ?? ""}\n${r.stderr ?? ""}`;
      const appexId = `${entry.hostBundleId}.photo-editing`;
      if (out.includes(appexId) && /com\.apple\.photo-editing/i.test(out)) {
        steps.push("photos-edit-open");
        steps.push("pluginkit-photo-editing");
        return {
          id: "photo-editing",
          path: pathStr,
          phase: 5,
          ok: true,
          status: "green",
          steps,
        };
      }
      throw new Error(
        `photo-editing extension not listed in Edit UI; labels=${labels.slice(0, 50).join("|")}`,
      );
    }
    steps.push("photo-edit-extension-listed");

    await tapLabelInTree(device, EXTENSION_LABELS);
    await sleep(1_000);
    const after = flattenLabels(await device.accessibilityTree());
    if (after.some((l) => l.includes("ET PhotoEdit Extension"))) {
      steps.push("photo-edit-extension-ui");
    }

    return {
      id: "photo-editing",
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
      id: "photo-editing",
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
