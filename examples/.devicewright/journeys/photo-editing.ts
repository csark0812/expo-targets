/**
 * Photo Editing extension deep journey.
 *
 * Apple capability: Photos Edit → More → Extensions → ET PhotoEdit → Done
 * → App Group persistence on host.
 *
 * GREEN = extension UI opens AND Done writes App Group marker
 * (`expo-targets uitest photo-edit done`). Pluginkit alone is not green.
 */
import path from "node:path";
import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import { repoRoot } from "../root";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
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
  "ET PhotoEdit",
  "ET PhotoEdit Extension",
  "ET PhotoEdit Target",
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

    await assertPayloadContains(
      device,
      "text-done-persistence",
      "done-persistence:ready",
      6_000,
    );
    steps.push("done-persistence-surface");

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

    // One-up chrome auto-hides — tap photo center to reveal toolbar before Edit.
    await device.tap({ x: 210, y: 450 });
    await sleep(500);

    // Prefer Photos identifier (iOS 26); label tap often misses when chrome fades.
    let editTapped = false;
    try {
      await device
        .getById("PUOneUpBarButtonItemIdentifierEdit", { timeoutMs: 3_000 })
        .tap();
      editTapped = true;
      steps.push("tap-edit:id");
    } catch {
      /* fall through */
    }

    const inEditChrome = (labels: string[]) =>
      labels.some((l) =>
        /^(Adjust|Filters|Crop|Crop and Rotate|Markup|Done|Cancel)$/i.test(
          l.trim(),
        ),
      );
    const inInfoPanel = (labels: string[]) =>
      labels.some((l) =>
        /Creation Date|Caption Entry|infoPanel|Filename|Camera Description/i.test(
          l,
        ),
      );

    if (!editTapped) {
      editTapped = await tapLabelInTree(device, ["Edit", "Customize"], {
        exactOnly: true,
      });
      if (editTapped) steps.push("tap-edit:label");
    }
    if (editTapped) {
      await sleep(900);
      let labels = flattenLabels(await device.accessibilityTree());
      if (inInfoPanel(labels) && !inEditChrome(labels)) {
        await device.tap({ x: 40, y: 90 }).catch(() => undefined);
        await sleep(500);
        editTapped = false;
      }
    }
    if (!editTapped) {
      // Reveal chrome again, then tap Edit frame coords (MCP: ~243,841 on Air).
      await device.tap({ x: 210, y: 450 });
      await sleep(400);
      for (const pt of [
        { x: 263, y: 860 },
        { x: 243, y: 841 },
        { x: 280, y: 860 },
      ]) {
        await device.tap(pt);
        await sleep(800);
        const labels = flattenLabels(await device.accessibilityTree());
        if (inInfoPanel(labels) && !inEditChrome(labels)) {
          await device.tap({ x: 40, y: 90 }).catch(() => undefined);
          await sleep(400);
          continue;
        }
        if (inEditChrome(labels)) {
          editTapped = true;
          steps.push(`tap-edit:hotspot:${pt.x},${pt.y}`);
          break;
        }
      }
    }
    if (!editTapped) {
      throw new Error(
        `Photos Edit control missing; labels=${flattenLabels(
          await device.accessibilityTree(),
        )
          .slice(0, 40)
          .join("|")}`,
      );
    }
    if (!steps.some((s) => s.startsWith("tap-edit"))) {
      steps.push("tap-edit");
    }
    await sleep(800);

    // Edit chrome More (…) at top (MCP/Maestro: ~304,72 on Air) → Extensions.
    let moreOpened = await tapLabelInTree(device, ["More"], { exactOnly: true });
    if (moreOpened) {
      steps.push("edit-chrome:More");
    } else {
      for (const pt of [
        { x: 322, y: 90 },
        { x: 304, y: 90 },
        { x: 340, y: 90 },
      ]) {
        await device.tap(pt);
        await sleep(600);
        const labels = flattenLabels(await device.accessibilityTree());
        if (labels.some((l) => /^Extensions$/i.test(l.trim()))) {
          moreOpened = true;
          steps.push(`edit-chrome:More:hotspot:${pt.x},${pt.y}`);
          break;
        }
        // Dismiss stray menu
        await device.tap({ x: 210, y: 450 }).catch(() => undefined);
        await sleep(300);
      }
    }
    if (!moreOpened) {
      throw new Error(
        `Photos Edit More missing; labels=${flattenLabels(
          await device.accessibilityTree(),
        )
          .slice(0, 40)
          .join("|")}`,
      );
    }
    await sleep(500);

    const extensionsTapped = await tapLabelInTree(device, ["Extensions"], {
      exactOnly: true,
    });
    if (!extensionsTapped) {
      throw new Error(
        `Photos Edit More menu missing Extensions; labels=${flattenLabels(
          await device.accessibilityTree(),
        )
          .slice(0, 40)
          .join("|")}`,
      );
    }
    steps.push("edit-chrome:Extensions");
    await sleep(900);

    const listed = flattenLabels(await device.accessibilityTree());
    const hit = listed.some((l) =>
      EXTENSION_LABELS.some((n) => l.includes(n)),
    );
    if (!hit) {
      throw new Error(
        `photo-editing extension not listed in Extensions sheet; labels=${listed.slice(0, 50).join("|")}`,
      );
    }
    steps.push("photo-edit-extension-listed");

    const openedExt = await tapLabelInTree(device, EXTENSION_LABELS);
    if (!openedExt) {
      throw new Error(
        `Could not tap photo-editing extension; labels=${flattenLabels(
          await device.accessibilityTree(),
        )
          .slice(0, 40)
          .join("|")}`,
      );
    }
    await sleep(1_200);

    const after = flattenLabels(await device.accessibilityTree());
    const uiVisible =
      after.some((l) => /ET PhotoEdit/i.test(l)) ||
      after.some((n) => n.includes("photo-edit-marker"));
    // AX often omits the marker label; nav-bar identifier "ET PhotoEdit" is enough.
    const tree = await device.accessibilityTree();
    const navHit = tree.some(
      (n) =>
        String(n.identifier ?? "").includes("ET PhotoEdit") ||
        /ET PhotoEdit Extension/i.test(String(n.label ?? "")),
    );
    if (!uiVisible && !navHit) {
      throw new Error(
        `photo-editing extension UI did not open; labels=${after.slice(0, 40).join("|")}`,
      );
    }
    steps.push("photo-edit-extension-ui");

    // Extension Done (checkmark) — finishContentEditing writes App Group.
    let doneTapped = await tapLabelInTree(device, ["Done"], { exactOnly: true });
    if (!doneTapped) {
      await device.tap({ x: 378, y: 90 });
      doneTapped = true;
      steps.push("tap-done:hotspot");
    } else {
      steps.push("tap-done");
    }
    await sleep(1_500);

    // Photos may still show Edit chrome with pending edits — commit with Done.
    const stillEditing = flattenLabels(await device.accessibilityTree());
    if (
      stillEditing.some((l) => /^(Adjust|Filters|Crop)/i.test(l)) ||
      stillEditing.some((l) => l === "More")
    ) {
      const commit = await tapLabelInTree(device, ["Done"], { exactOnly: true });
      if (!commit) await device.tap({ x: 378, y: 90 });
      steps.push("photos-commit-done");
      await sleep(1_200);
    }

    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForNamed(device, ["ready"], 12_000);
    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      "expo-targets uitest photo-edit done",
      10_000,
    );
    steps.push("done-persistence-ok");

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
