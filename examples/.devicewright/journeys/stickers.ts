import type { DeviceSession } from '@csark0812/devicewright';
import { TARGET_CATALOG } from '../catalog';
import type { TargetJourneyResult } from '../types';
import {
  assertPayloadContains,
  findNamedNode,
  flattenLabels,
  sleep,
  tapCenter,
  waitForId,
  waitForNamed,
} from './helpers';

const MESSAGES_BUNDLE = 'com.apple.MobileSMS';

async function openConversation(device: DeviceSession): Promise<void> {
  for (const name of ['+1 (888) 555-1212', '+1 (555) 564-8583', 'Kate Bell']) {
    try {
      const cell = await waitForNamed(device, [name], 2_000);
      await tapCenter(device, cell);
      return;
    } catch {
      // next
    }
  }
  const tree = await device.accessibilityTree();
  throw new Error(
    `no Messages conversation; labels=${flattenLabels(tree).slice(0, 60).join(', ')}`
  );
}

async function openStickersBrowser(
  device: DeviceSession,
  packNames: string[]
): Promise<void> {
  const tree0 = await device.accessibilityTree();
  if (findNamedNode(tree0, packNames)) return;

  const add = await waitForNamed(device, ['add', 'Add'], 8_000);
  await tapCenter(device, add);
  await sleep(1_000);

  const stickers = await waitForNamed(device, ['Stickers'], 8_000);
  await tapCenter(device, stickers);
  await sleep(1_500);

  if (!findNamedNode(await device.accessibilityTree(), packNames)) {
    try {
      const edit = await waitForNamed(device, ['Edit'], 3_000);
      await tapCenter(device, edit);
      await sleep(800);
      for (const name of packNames) {
        try {
          const sw = await waitForNamed(device, [name], 2_000);
          await tapCenter(device, sw);
        } catch {
          // continue
        }
      }
      for (const done of ['Done', 'Close']) {
        try {
          const btn = await waitForNamed(device, [done], 2_000);
          await tapCenter(device, btn);
          break;
        } catch {
          // next
        }
      }
      await sleep(800);
    } catch {
      // pack may already be enabled
    }
  }
}

/**
 * Stickers B: pack visible in Stickers browser.
 * Stickers A: pack/grid tappable + host pack-catalog marker
 * (honest asset-pack contract — selection cannot write App Group).
 */
export async function runStickersJourney(
  device: DeviceSession,
  bar: 'B' | 'A' = 'A'
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG.stickers;
  const steps: string[] = [];
  const packNames = [entry.extensionName, ...entry.extensionAliases];

  try {
    steps.push('register-host');
    await device.launchApp(entry.hostBundleId, { terminateRunning: true });
    await waitForId(device, entry.testIds.screenRoot, 20_000);
    await sleep(800);

    if (bar === 'A') {
      steps.push('assert-host-catalog');
      const catalogId = entry.testIds.packCatalog ?? entry.testIds.lastPayload;
      await assertPayloadContains(
        device,
        catalogId,
        entry.payloadMarker,
        10_000
      );
      // Also require text-last-payload when distinct.
      if (
        entry.testIds.packCatalog &&
        entry.testIds.packCatalog !== entry.testIds.lastPayload
      ) {
        await assertPayloadContains(
          device,
          entry.testIds.lastPayload,
          entry.payloadMarker,
          5_000
        );
      }
    }

    steps.push('launch-messages');
    await device.launchApp(MESSAGES_BUNDLE, { terminateRunning: true });
    await sleep(1_000);
    try {
      const cont = await waitForNamed(device, ['Continue'], 2_000);
      await tapCenter(device, cont);
    } catch {
      // optional
    }

    steps.push('open-conversation');
    await openConversation(device);

    steps.push('open-stickers-browser');
    await openStickersBrowser(device, packNames);

    steps.push('assert-pack-visible');
    const pack = await waitForNamed(device, packNames, 12_000);
    if (bar === 'B') {
      return {
        id: entry.id,
        path: entry.path,
        phase: 2,
        ok: true,
        status: 'green',
        steps,
      };
    }

    steps.push('open-pack-grid');
    await tapCenter(device, pack);
    await sleep(1_500);

    // Tap first sticker candidate (send=false — tap enough for A pack/grid).
    steps.push('tap-sticker');
    const tree = await device.accessibilityTree();
    const sticker =
      findNamedNode(tree, ['brutus', 'happy', 'excited', 'Brutus', 'Happy']) ??
      (() => {
        const flat: typeof tree = [];
        const walk = (nodes: typeof tree) => {
          for (const n of nodes) {
            flat.push(n);
            if (n.children?.length) walk(n.children);
          }
        };
        walk(tree);
        return flat.find(
          (n) =>
            Boolean(n.frame && n.frame.width > 20 && n.frame.height > 20) &&
            (n.type ?? '').toLowerCase().includes('image')
        );
      })();
    if (!sticker) {
      throw new Error(
        `no tappable sticker in pack; labels=${flattenLabels(tree)
          .slice(0, 80)
          .join(', ')}`
      );
    }
    await tapCenter(device, sticker);

    return {
      id: entry.id,
      path: entry.path,
      phase: 2,
      ok: true,
      status: 'green',
      steps,
    };
  } catch (e) {
    const msg = String(e);
    const failureKind = /not installed|Unable to find|Launch failed/i.test(msg)
      ? 'operator'
      : /status-pack-catalog|pack: Fun Stickers/i.test(msg)
        ? 'operator'
        : 'product';
    return {
      id: entry.id,
      path: entry.path,
      phase: 2,
      ok: false,
      status: failureKind === 'operator' ? 'operator' : 'red',
      steps,
      error: msg,
      failureKind,
    };
  }
}
