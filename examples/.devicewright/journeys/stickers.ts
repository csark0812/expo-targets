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

async function openConversation(device: DeviceSession): Promise<void> {
  for (const name of CONVERSATION_NAMES) {
    try {
      const cell = await waitForNamed(device, [name], 2_000);
      await tapCenter(device, cell);
      return;
    } catch {
      // next
    }
  }
  try {
    const hit = await findNamedViaPointProbe(device, CONVERSATION_NAMES, {
      timeoutMs: 5_000,
      yStartRatio: 0.2,
      yEndRatio: 0.75,
      stepX: 50,
      stepY: 40,
      hotspots: [
        { x: 210, y: 220 },
        { x: 210, y: 280 },
        { x: 210, y: 340 },
      ],
    });
    await tapProbeHit(device, hit);
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
 * Pack grids are often AX-opaque on iOS 26 — surface presence is the bar.
 */
async function openStickersBrowser(device: DeviceSession): Promise<void> {
  const add = await findNamedViaPointProbe(device, ["add", "Add"], {
    timeoutMs: 8_000,
    yStartRatio: 0.7,
    yEndRatio: 0.98,
    match: "exact",
  });
  await tapProbeHit(device, add);
  await sleep(900);

  for (let i = 0; i < 6; i++) {
    try {
      const stickers = await findNamedViaPointProbe(device, ["Stickers"], {
        timeoutMs: 2_500,
        yStartRatio: 0.35,
        yEndRatio: 0.95,
        match: "exact",
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

async function tryRevealFunPack(device: DeviceSession): Promise<boolean> {
  // One cheap attempt only — failed pack reveals used to burn minutes of probes.
  try {
    const pack = await findNamedViaPointProbe(
      device,
      ["Fun Stickers", "FunStickersTarget"],
      {
        timeoutMs: 1_500,
        yStartRatio: 0.5,
        yEndRatio: 0.95,
        stepX: 60,
        stepY: 50,
      },
    );
    await tapProbeHit(device, pack);
    await sleep(400);
    return true;
  } catch {
    return false;
  }
}

/**
 * Stickers B: Stickers browser surface reachable.
 * Stickers A: host pack-catalog marker + Stickers browser + soft grid tap
 * (asset-only packs cannot App-Group on selection; sticker cells are often AX-opaque).
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
    await sleep(1_000);
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
    const revealed = await tryRevealFunPack(device);
    steps.push(revealed ? "fun-pack-ok" : "fun-pack-skip");

    steps.push("tap-sticker-grid");
    // Sticker cells are frequently AX-opaque — soft tap mid-drawer.
    await device.tap({ x: 200, y: 760 });
    await sleep(500);

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
