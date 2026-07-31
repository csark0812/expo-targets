/**
 * Example: same script shape on iOS + Android (week-7 cross-OS happy path).
 * Run on a machine with a booted simulator and/or emulator:
 *   bun packages/devicewright/src/examples/cross-os-hello.ts
 */

import process from 'node:process';
import { devices } from '../index';

async function probe(
  platform: 'ios' | 'android',
  bundleId: string,
  text: string
): Promise<void> {
  const device = await devices.launch({ platform, lock: true });
  try {
    await device.launchApp(bundleId, { terminateRunning: true });
    const loc = device.getByText(text, { timeoutMs: 10_000 });
    const visible = await loc.isVisible();
    const shot = await device.screenshot({
      path: `devicewright-${platform}-hello.png`,
    });
    console.log(
      JSON.stringify({ platform, deviceId: device.deviceId, visible, shot })
    );
  } finally {
    await device.close();
  }
}

async function main(): Promise<void> {
  await probe('ios', 'com.apple.Preferences', 'General');
  await probe('android', 'com.android.settings', 'Settings');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
