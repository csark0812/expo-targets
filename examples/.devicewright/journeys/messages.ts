import type { DeviceSession } from '@csark0812/devicewright';
import { TARGET_CATALOG } from '../catalog';
import type { TargetJourneyResult } from '../types';
import {
  assertPayloadContains,
  findNamedNode,
  flattenLabels,
  sleep,
  tapCenter,
  tapId,
  waitForId,
  waitForNamed,
} from './helpers';

const MESSAGES_BUNDLE = 'com.apple.MobileSMS';

async function openConversation(device: DeviceSession): Promise<void> {
  const candidates = [
    '+1 (888) 555-1212',
    'Kate Bell',
    '+1 (555) 564-8583',
  ];
  for (const name of candidates) {
    try {
      const cell = await waitForNamed(device, [name], 2_000);
      await tapCenter(device, cell);
      return;
    } catch {
      // try next
    }
  }
  // Fall back: first cell-like label in tree is too brittle — require a conversation.
  const tree = await device.accessibilityTree();
  throw new Error(
    `no Messages conversation; labels=${flattenLabels(tree).slice(0, 60).join(', ')}`
  );
}

async function openAppDrawer(device: DeviceSession, names: string[]): Promise<void> {
  const tree0 = await device.accessibilityTree();
  if (findNamedNode(tree0, names)) return;

  const add = await waitForNamed(device, ['add', 'Add'], 8_000);
  await tapCenter(device, add);
  await sleep(800);

  for (let i = 0; i < 5; i++) {
    const tree = await device.accessibilityTree();
    if (findNamedNode(tree, names)) return;
    // Swipe attachment sheet up (normalized mid → upper).
    await device.swipe({
      xStart: 200,
      yStart: 600,
      xEnd: 200,
      yEnd: 280,
      duration: 0.3,
    });
    await sleep(700);
  }
  const tree = await device.accessibilityTree();
  throw new Error(
    `messages extension not in apps drawer (${names.join(' | ')}); labels=${flattenLabels(
      tree
    )
      .slice(0, 80)
      .join(', ')}`
  );
}

/**
 * Messages B: Apps drawer / extension visible.
 * Messages A: send template → host text-last-payload marker.
 */
export async function runMessagesJourney(
  device: DeviceSession,
  bar: 'B' | 'A' = 'A'
): Promise<TargetJourneyResult> {
  const entry = TARGET_CATALOG.messages;
  const steps: string[] = [];
  const names = [
    entry.extensionName,
    entry.hostDisplayName,
    ...entry.extensionAliases,
  ];

  try {
    if (bar === 'A') {
      steps.push('clear-host');
      await device.launchApp(entry.hostBundleId, { terminateRunning: true });
      await waitForId(device, entry.testIds.screenRoot, 20_000);
      try {
        await tapId(device, entry.testIds.clearPayload, 5_000);
      } catch {
        // optional
      }
    }

    steps.push('launch-messages');
    await device.launchApp(MESSAGES_BUNDLE, { terminateRunning: true });
    await sleep(1_000);
    try {
      const cont = await waitForNamed(device, ['Continue'], 2_000);
      await tapCenter(device, cont);
    } catch {
      // dismiss optional
    }

    steps.push('open-conversation');
    await openConversation(device);

    steps.push('open-app-drawer');
    await openAppDrawer(device, names);

    steps.push('assert-extension-visible');
    const row = await waitForNamed(device, names, 8_000);
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

    steps.push('open-extension');
    await tapCenter(device, row);
    await sleep(2_000);

    // Expand sheet grabber if present.
    try {
      const grabber = await waitForNamed(device, ['Sheet Grabber'], 2_000);
      const f = grabber.frame;
      if (f) {
        await device.swipe({
          xStart: Math.round(f.x + f.width / 2),
          yStart: Math.round(f.y + f.height / 2),
          xEnd: Math.round(f.x + f.width / 2),
          yEnd: 120,
          duration: 0.25,
        });
        await sleep(800);
      }
    } catch {
      // optional
    }

    steps.push('send-template');
    const send = await waitForNamed(
      device,
      [entry.completeButton, 'btn-send-template', 'Send template'],
      25_000
    );
    await tapCenter(device, send);
    await sleep(1_500);

    steps.push('assert-host-payload');
    await device.launchApp(entry.hostBundleId);
    await waitForId(device, entry.testIds.screenRoot, 15_000);
    if (entry.testIds.refresh) {
      try {
        await tapId(device, entry.testIds.refresh, 5_000);
      } catch {
        // optional
      }
    }
    await assertPayloadContains(
      device,
      entry.testIds.lastPayload,
      entry.payloadMarker,
      25_000
    );

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
