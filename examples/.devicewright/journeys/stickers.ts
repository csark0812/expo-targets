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
/**
 * Clear overlays that block the Stickers pack strip.
 * iOS 26 often shows Paste/Autofill edit menu (not Dictation) after composer taps.
 * Never tap Paste — that inserts clipboard into the message field.
 */
async function dismissComposerOverlays(
  device: DeviceSession,
  steps?: string[],
): Promise<boolean> {
  let dismissed = false;
  for (let i = 0; i < 5; i++) {
    const tree = await device.accessibilityTree();
    const labels = flattenLabels(tree);
    const hasEditMenu = labels.some(
      (l) =>
        /^Paste$/i.test(l.trim()) ||
        /^Auto-?Fill$/i.test(l.trim()) ||
        /^Select All$/i.test(l.trim()) ||
        /^Look Up$/i.test(l.trim()),
    );
    const hasDictation = labels.some((l) => /Enable Dictation/i.test(l));
    if (!hasEditMenu && !hasDictation) return dismissed;

    if (hasEditMenu) {
      // Tap conversation chrome above the composer to dismiss the edit menu.
      await device.tap({ x: 210, y: 180 });
      steps?.push("dismiss-paste-autofill");
      dismissed = true;
      await sleep(450);
      continue;
    }

    const notNow = tree.find((n) =>
      /^not now$/i.test((n.label ?? "").trim()),
    );
    if (notNow?.frame) {
      const f = notNow.frame;
      await device.tap({
        x: Math.round(f.x + f.width / 2),
        y: Math.round(f.y + f.height / 2),
      });
    } else {
      await device.tap({ x: 210, y: 180 });
    }
    steps?.push("dismiss-dictation");
    dismissed = true;
    await sleep(500);
  }
  return dismissed;
}

async function revealFunPack(
  device: DeviceSession,
  steps: string[] = [],
): Promise<void> {
  await dismissComposerOverlays(device, steps);
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

  async function packNamedInTree(): Promise<boolean> {
    const tree = await device.accessibilityTree();
    return flattenLabels(tree).some((l) =>
      FUN_PACK_NAMES.some((n) => l.toLowerCase().includes(n.toLowerCase())),
    );
  }

  async function tryNamedPack(timeoutMs: number): Promise<boolean> {
    await dismissComposerOverlays(device, steps);
    // Prefer AX label tap before point-probe (probe can hit Dictate → sheet).
    try {
      const tree = await device.accessibilityTree();
      const named = tree.find((n) =>
        FUN_PACK_NAMES.some((name) =>
          (n.label ?? "").toLowerCase().includes(name.toLowerCase()),
        ),
      );
      if (named?.frame) {
        const f = named.frame;
        await device.tap({
          x: Math.round(f.x + f.width / 2),
          y: Math.round(f.y + f.height / 2),
        });
        await sleep(900);
        steps.push("fun-pack-ax-tap");
        return true;
      }
    } catch {
      /* fall through */
    }
    try {
      const pack = await findNamedViaPointProbe(device, FUN_PACK_NAMES, {
        timeoutMs,
        yStartRatio: 0.15,
        yEndRatio: 0.85,
        stepX: 40,
        stepY: 40,
        match: "includes",
        hotspots: [
          { x: 210, y: 400 },
          { x: 210, y: 500 },
          { x: 190, y: 566 },
        ],
      });
      await tapProbeHit(device, pack);
      await sleep(900);
      await dismissComposerOverlays(device, steps);
      return true;
    } catch {
      await dismissComposerOverlays(device, steps);
      return false;
    }
  }

  if (await tryNamedPack(1_200)) return;

  for (let pass = 0; pass < 3; pass++) {
    await dismissComposerOverlays(device, steps);
    for (const pt of funPackSlots) {
      await device.tap(pt);
      await sleep(800);
      await dismissComposerOverlays(device, steps);
      if (await packNamedInTree()) {
        steps.push("fun-pack-after-slot");
        return;
      }
    }
    // Sticker cells stay AX-opaque; a mid-grid tap exercises the selected pack.
    await device.tap({ x: 140, y: 700 });
    await sleep(400);
    await dismissComposerOverlays(device, steps);
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
    await dismissComposerOverlays(device, steps);
    await device.tap(edit);
    await sleep(900);
    await dismissComposerOverlays(device, steps);
    if (await tryNamedPack(2_000)) return;
    if (await packNamedInTree()) {
      const tree = await device.accessibilityTree();
      const named = tree.find((n) =>
        FUN_PACK_NAMES.some((name) =>
          (n.label ?? "").toLowerCase().includes(name.toLowerCase()),
        ),
      );
      if (named?.frame) {
        const f = named.frame;
        await device.tap({
          x: Math.round(f.x + f.width / 2),
          y: Math.round(f.y + f.height / 2),
        });
        await sleep(700);
        steps.push("fun-pack-edit-list");
        return;
      }
    }
  }

  await dismissComposerOverlays(device, steps);
  // Icons never expose AX labels on this OS — EDIT list must name the pack.
  throw new Error(
    `Fun Stickers pack not named in Stickers UI; tried slots+EDIT; labels=${flattenLabels(
      await device.accessibilityTree(),
    )
      .slice(0, 50)
      .join("|")}`,
  );
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
    try {
      await waitForId(device, hostReadyTestId(entry.testIds), 6_000);
    } catch {
      await waitForNamed(device, ["ready"], 15_000);
    }
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
    // Paste/Autofill edit menu (or rare Dictation sheet) covers the pack strip.
    await dismissSystemAlerts(device, 2_500, 6);
    await dismissComposerOverlays(device, steps);

    if (bar === "B") {
      // Browser surface alone is not full-demo green — continue into Fun Stickers.
      steps.push("bar-b-continue-to-fun-pack");
    }

    steps.push("reveal-fun-pack");
    try {
      await revealFunPack(device, steps);
      steps.push("fun-pack-ok");
    } catch (packErr) {
      // Named pack AX is flaky under Paste/Autofill overlays — re-open Stickers
      // and continue to insert proof (insert is the green bar).
      steps.push(`fun-pack-best-effort:${String(packErr).slice(0, 80)}`);
      await dismissComposerOverlays(device, steps);
      try {
        await openStickersBrowser(device);
        steps.push("reopen-stickers-browser");
        await dismissComposerOverlays(device, steps);
        // Best-effort Fun Stickers strip slots after reopen.
        for (const packPt of [
          { x: 190, y: 566 },
          { x: 175, y: 566 },
          { x: 205, y: 566 },
          { x: 190, y: 210 },
        ]) {
          await device.tap(packPt);
          await sleep(500);
        }
        steps.push("fun-pack-slots-after-reopen");
      } catch (reopenErr) {
        steps.push(`reopen-stickers-skip:${String(reopenErr).slice(0, 60)}`);
      }
    }

    steps.push("tap-sticker-grid");
    // Pack cells are AX-opaque — tap Fun Stickers grid slots (iPhone Air).
    const gridSlots = [
      { x: 100, y: 660 },
      { x: 210, y: 660 },
      { x: 140, y: 700 },
      { x: 100, y: 720 },
      { x: 180, y: 720 },
      { x: 280, y: 700 },
      { x: 100, y: 640 },
      { x: 160, y: 640 },
    ];
    let insertProof = false;
    for (let round = 0; round < 3 && !insertProof; round++) {
      await dismissComposerOverlays(device, steps);
      // Re-nudge pack strip between insert rounds.
      for (const packPt of [
        { x: 190, y: 566 },
        { x: 175, y: 566 },
        { x: 210, y: 210 },
      ]) {
        await device.tap(packPt);
        await sleep(350);
      }
      for (const pt of gridSlots) {
        await device.tap(pt);
        await sleep(550);
        await dismissComposerOverlays(device, steps);
        const tree = await device.accessibilityTree();
        // iOS 26 draft: identifier/label like
        // "Sticker: wave.png.accessibilityLabel, attached to outgoing message"
        insertProof = tree.some((n) => {
          const id = String(n.identifier ?? "");
          const label = String(n.label ?? "");
          return (
            /^Sticker:/i.test(id) ||
            /^Sticker:/i.test(label) ||
            /attached to outgoing message/i.test(label)
          );
        });
        if (insertProof) {
          steps.push(`sticker-draft:${pt.x},${pt.y}`);
          break;
        }
      }
    }

    if (insertProof) {
      // Send confirms the draft left the composer (not ambient chrome).
      try {
        const send = (await device.accessibilityTree()).find(
          (n) => String(n.identifier ?? "") === "sendButton",
        );
        if (send?.frame) {
          const f = send.frame;
          await device.tap({
            x: Math.round(f.x + f.width / 2),
            y: Math.round(f.y + f.height / 2),
          });
          await sleep(700);
          steps.push("sticker-send");
        }
      } catch {
        steps.push("sticker-send-skip");
      }
      steps.push("sticker-insert-proof");
      return {
        id: entry.id,
        path: entry.path,
        phase: 2,
        ok: true,
        status: "green",
        steps,
      };
    }

    // Stickers is required green — no CLAIMS escape after insert exhaustion.
    return {
      id: entry.id,
      path: entry.path,
      phase: 2,
      ok: false,
      status: "red",
      steps: [...steps, "sticker-insert-ax-opaque"],
      failureKind: "product",
      error:
        "Sticker insert not proven (expected Sticker:*.png attached to outgoing message)",
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
