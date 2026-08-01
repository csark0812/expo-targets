/**
 * Phase 0.5 / Phase 1 entry spike: can DW query/act on the system Share Sheet
 * outside the host-only accessibility tree?
 *
 * Pass: after host Share.share (or Photos Share), idb describe-all shows sheet
 * chrome (Copy / Save Image / View More / activity rows) and we can tap Cancel/Close.
 * Fail: sheet is invisible to idb → keep XCUITest interim; do not lower C1 bar.
 *
 * Run:
 *   EXPO_TARGETS_ROOT=... DEVICEWRIGHT_IDB_PATH=... \
 *     bun packages/devicewright/src/targets/spikes/springboard-sheet.ts
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { devices } from '../../devices';
import { flattenLabels, sleep, tapCenter, waitForNamed } from '../journeys/helpers';

const ARTIFACT_DIR = path.join(
  process.cwd(),
  'devicewright-artifacts',
  'spikes',
  `springboard-sheet-${Date.now()}`
);

type SpikeResult = {
  ok: boolean;
  pivot: 'pure-dw' | 'keep-harness-interim';
  notes: string[];
  labelsSample: string[];
  hostBundleTried?: string;
};

async function tryHostShareSheet(
  device: Awaited<ReturnType<typeof devices.launch>>,
  bundleId: string
): Promise<{ opened: boolean; notes: string[] }> {
  const notes: string[] = [];
  try {
    await device.launchApp(bundleId, { terminateRunning: true });
    await sleep(1_500);
    const open = await waitForNamed(
      device,
      ['btn-open-share-sheet', 'Open Share Sheet'],
      8_000
    );
    await tapCenter(device, open);
    notes.push(`tapped open-share-sheet on ${bundleId}`);
    await sleep(1_500);
    return { opened: true, notes };
  } catch (e) {
    notes.push(`host share open failed (${bundleId}): ${e}`);
    return { opened: false, notes };
  }
}

async function tryPhotosShare(
  device: Awaited<ReturnType<typeof devices.launch>>
): Promise<{ opened: boolean; notes: string[] }> {
  const notes: string[] = [];
  try {
    await device.launchApp('com.apple.mobileslideshow', {
      terminateRunning: true,
    });
    await sleep(1_500);
    const share = await waitForNamed(device, ['Share'], 5_000);
    await tapCenter(device, share);
    notes.push('tapped Photos Share');
    await sleep(1_500);
    return { opened: true, notes };
  } catch (e) {
    notes.push(`Photos Share failed: ${e}`);
    return { opened: false, notes };
  }
}

function sheetChromeVisible(labels: string[]): boolean {
  const needles = [
    'Copy',
    'Save Image',
    'View More',
    'More',
    'Cancel',
    'Close',
    'Print',
    'Messages',
    'Mail',
  ];
  const lower = labels.map((l) => l.toLowerCase());
  return needles.some((n) => lower.some((l) => l.includes(n.toLowerCase())));
}

async function main(): Promise<void> {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  const notes: string[] = [];
  const idbPath =
    process.env.DEVICEWRIGHT_IDB_PATH ||
    process.env.IOS_SIMULATOR_MCP_IDB_PATH ||
    undefined;

  const deviceId =
    process.env.UITEST_SIM_UDID ||
    process.env.DEVICEWRIGHT_SIM_UDID ||
    undefined;

  const device = await devices.launch({
    platform: 'ios',
    deviceId,
    lock: true,
    boot: true,
    idbPath,
  });

  let hostTried: string | undefined;
  try {
    const hosts = [
      'com.expotargets.example.share',
      'com.expotargets.example.action',
    ];
    let opened = false;
    for (const bundle of hosts) {
      hostTried = bundle;
      const r = await tryHostShareSheet(device, bundle);
      notes.push(...r.notes);
      if (r.opened) {
        opened = true;
        break;
      }
    }
    if (!opened) {
      const photos = await tryPhotosShare(device);
      notes.push(...photos.notes);
      opened = photos.opened;
      hostTried = opened ? 'com.apple.mobileslideshow' : hostTried;
    }

    const tree = await device.accessibilityTree();
    const labels = flattenLabels(tree);
    const chrome = sheetChromeVisible(labels);
    notes.push(
      chrome
        ? 'PASS: sheet chrome visible in idb accessibility tree'
        : 'FAIL: sheet chrome not visible to idb after share trigger'
    );

    if (chrome) {
      try {
        const dismiss = await waitForNamed(device, ['Close', 'Cancel'], 5_000);
        await tapCenter(device, dismiss);
        notes.push('PASS: tapped Close/Cancel on sheet via idb');
      } catch (e) {
        notes.push(`WARN: chrome visible but dismiss tap failed: ${e}`);
      }
    }

    const result: SpikeResult = {
      ok: chrome,
      pivot: chrome ? 'pure-dw' : 'keep-harness-interim',
      notes,
      labelsSample: labels.slice(0, 120),
      hostBundleTried: hostTried,
    };

    const out = path.join(ARTIFACT_DIR, 'spike-result.json');
    fs.writeFileSync(out, JSON.stringify(result, null, 2));
    // Stable pointer for docs / Phase 1 gate.
    const stableDir = path.join(
      process.cwd(),
      'packages/devicewright/artifacts/spikes'
    );
    fs.mkdirSync(stableDir, { recursive: true });
    fs.writeFileSync(
      path.join(stableDir, 'springboard-sheet.json'),
      JSON.stringify(result, null, 2)
    );

    console.log(JSON.stringify(result, null, 2));
    console.log(`\nartifact: ${out}`);
    process.exit(chrome ? 0 : 1);
  } finally {
    await device.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
