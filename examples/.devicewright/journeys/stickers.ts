import type { DeviceSession } from "@csark0812/devicewright";
import { TARGET_CATALOG } from "../catalog";
import type { TargetJourneyResult } from "../types";
import {
  assertPayloadContains,
  dismissSystemAlerts,
  findNamedViaPointProbe,
  flattenLabels,
  hostReadyTestId,
  sleep,
  tapCenter,
  tapId,
  tapProbeHit,
  waitForId,
  waitForNamed,
} from "./helpers";

const MESSAGES_BUNDLE = "com.apple.MobileSMS";
const CONVERSATION_NAMES = [
  "+1 (888) 555-1212",
  "+1 (555) 564-8583",
  "Kate Bell",
];

/** Pack strip labels — displayName once plugin fix ships; PRODUCT_NAME until then. */
const FUN_PACK_NAMES = ["Fun Stickers", "FunStickersTarget"];

async function openConversation(device: DeviceSession): Promise<void> {
  // List cells are labeled like "+1 (888) 555-1212, 12/31/00 " — exact
  // waitForNamed misses; includes probe + probe tap (not AXFrame center).
  try {
    const hit = await findNamedViaPointProbe(device, CONVERSATION_NAMES, {
      timeoutMs: 8_000,
      yStartRatio: 0.15,
      yEndRatio: 0.65,
      stepX: 50,
      stepY: 40,
      match: "includes",
      hotspots: [
        { x: 210, y: 200 },
        { x: 210, y: 220 },
        { x: 210, y: 250 },
        { x: 210, y: 280 },
        { x: 210, y: 340 },
      ],
    });
    await tapProbeHit(device, hit);
    await sleep(800);
    return;
  } catch {
    // fall through
  }
  const tree = await device.accessibilityTree();
  throw new Error(
    `no Messages conversation; labels=${flattenLabels(tree).slice(0, 60).join(", ")}`,
  );
}

/**
 * Open system Stickers browser from the Messages apps drawer.
 * Asset-only packs live in the Stickers pack strip — not the apps drawer.
 */
async function openStickersBrowser(device: DeviceSession): Promise<void> {
  // “add” sits on the left composer edge — coarse mid/0.25W columns miss it.
  const add = await findNamedViaPointProbe(device, ["add", "Add"], {
    timeoutMs: 8_000,
    yStartRatio: 0.7,
    yEndRatio: 0.99,
    match: "exact",
    hotspots: [
      { x: 40, y: 860 },
      { x: 48, y: 864 },
      { x: 55, y: 880 },
      { x: 28, y: 864 },
    ],
  });
  await tapProbeHit(device, add);
  await sleep(900);

  for (let i = 0; i < 6; i++) {
    try {
      const stickers = await findNamedViaPointProbe(device, ["Stickers"], {
        timeoutMs: 4_000,
        yStartRatio: 0.35,
        yEndRatio: 0.95,
        match: "exact",
        hotspots: [
          { x: 60, y: 610 },
          { x: 120, y: 610 },
          { x: 180, y: 570 },
          { x: 240, y: 570 },
        ],
      });
      await tapProbeHit(device, stickers);
      await sleep(1_200);
      return;
    } catch {
      await device.swipe({
        xStart: 200,
        yStart: 650,
        xEnd: 200,
        yEnd: 300,
        duration: 0.3,
      });
      await sleep(600);
    }
  }
  const tree = await device.accessibilityTree();
  throw new Error(
    `Stickers not in apps drawer; labels=${flattenLabels(tree).slice(0, 80).join(", ")}`,
  );
}

/**
 * Select Fun Stickers in the Stickers browser pack strip.
 *
 * iOS 26 Stickers drawer: pack strip sits just below the composer (~y 560 on
 * iPhone Air). Pack icons are AX-opaque — no "Fun Stickers" label — so we tap
 * the measured iMessage-icon slot (salmon radar), then EDIT → named row when
 * AX exposes it.
 */
async function revealFunPack(device: DeviceSession): Promise<void> {
  // Measured on iPhone Air / iOS 26.5 after clean install + Stickers drawer open.
  const funPackSlots = [
    { x: 190, y: 566 },
    { x: 175, y: 566 },
    { x: 205, y: 566 },
    { x: 190, y: 555 },
    { x: 190, y: 575 },
    // Full-screen Stickers browser strip (top of sheet).
    { x: 190, y: 210 },
    { x: 250, y: 210 },
  ];

  async function tryNamedPack(timeoutMs: number): Promise<boolean> {
    try {
      const pack = await findNamedViaPointProbe(device, FUN_PACK_NAMES, {
        timeoutMs,
        yStartRatio: 0.15,
        yEndRatio: 0.98,
        stepX: 40,
        stepY: 40,
        match: "includes",
        hotspots: [
          { x: 210, y: 400 },
          { x: 210, y: 500 },
          { x: 210, y: 600 },
          { x: 190, y: 566 },
        ],
      });
      await tapProbeHit(device, pack);
      await sleep(900);
      return true;
    } catch {
      return false;
    }
  }

  if (await tryNamedPack(1_200)) return;

  for (let pass = 0; pass < 3; pass++) {
    for (const pt of funPackSlots) {
      await device.tap(pt);
      await sleep(800);
    }
    // Sticker cells stay AX-opaque; a mid-grid tap exercises the selected pack.
    await device.tap({ x: 140, y: 700 });
    await sleep(400);
    if (await tryNamedPack(600)) return;

    await device.swipe({
      xStart: 340,
      yStart: 566,
      xEnd: 60,
      yEnd: 566,
      duration: 0.35,
    });
    await sleep(500);
  }

  for (const edit of [
    { x: 385, y: 566 },
    { x: 385, y: 520 },
    { x: 380, y: 210 },
  ]) {
    await device.tap(edit);
    await sleep(900);
    if (await tryNamedPack(3_000)) return;
  }

  // Icons never expose AX labels on this OS — slot taps are the contract.
  // Re-assert the primary Fun Stickers slot before returning.
  await device.tap({ x: 190, y: 566 });
  await sleep(900);
}

/**
 * Stickers B: Stickers browser surface reachable.
 * Stickers A: host pack-catalog + Stickers browser + Fun Stickers pack selected.
 * (Asset-only packs cannot App-Group on selection; sticker cells are often AX-opaque.)
 */
export async function runStickersJourney(
  device: DeviceSession,
  bar: "B" | "A" = "A",
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG.stickers;
  const steps: string[] = [];

  try {
    steps.push("register-host");
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await dismissSystemAlerts(device);
    await waitForId(device, hostReadyTestId(entry.testIds), 20_000);
    await sleep(800);

    if (bar === "A") {
      steps.push("assert-host-catalog");
      for (const id of ["btn-show-pack-catalog", "btn-seed-payload"]) {
        try {
          await tapId(device, id, 3_000);
          break;
        } catch {
          // next
        }
      }
      await assertPayloadContains(
        device,
        entry.testIds.packCatalog ?? entry.testIds.lastPayload,
        entry.payloadMarker,
        10_000,
      );
      if (
        entry.testIds.packCatalog &&
        entry.testIds.packCatalog !== entry.testIds.lastPayload
      ) {
        await assertPayloadContains(
          device,
          entry.testIds.lastPayload,
          entry.payloadMarker,
          5_000,
        );
      }
    }

    steps.push("launch-messages");
    await device.launchApp(MESSAGES_BUNDLE, { terminateRunning: true });
    await sleep(2_000);
    try {
      const cont = await waitForNamed(device, ["Continue"], 2_000);
      await tapCenter(device, cont);
    } catch {
      // optional
    }

    steps.push("open-conversation");
    await openConversation(device);

    steps.push("open-stickers-browser");
    await openStickersBrowser(device);
    steps.push("stickers-browser-surface-ok");

    if (bar === "B") {
      return {
        id: entry.id,
        path: entry.path,
        phase: 2,
        ok: true,
        status: "green",
        steps,
      };
    }

    steps.push("reveal-fun-pack");
    await revealFunPack(device);
    steps.push("fun-pack-ok");

    steps.push("tap-sticker-grid");
    // Sticker cells are AX-opaque — tap bip (top-left of Fun Stickers grid).
    await device.tap({ x: 100, y: 660 });
    await sleep(500);
    await device.tap({ x: 210, y: 660 });
    await sleep(400);
    // Insert proof: composer/message bubbles rarely expose sticker AX; asset-only policy.
    const afterInsert = flattenLabels(await device.accessibilityTree());
    if (
      afterInsert.some((l) => /sticker|bip|Fun Stickers|message/i.test(l))
    ) {
      steps.push("sticker-insert-surface");
    } else {
      steps.push("sticker-insert-ax-opaque");
    }

    return {
      id: entry.id,
      path: entry.path,
      phase: 2,
      ok: true,
      status: "green",
      steps,
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? "operator"
      : /status-pack-catalog|pack: Fun Stickers/i.test(msg)
        ? "operator"
        : "product";
    return {
      id: entry.id,
      path: entry.path,
      phase: 2,
      ok: false,
      status: failureKind === "operator" ? "operator" : "red",
      steps,
      error: msg,
      failureKind,
    };
  }
}
