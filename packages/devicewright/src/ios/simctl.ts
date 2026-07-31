import process from 'node:process';
import {
  assertSafeDeviceId,
  assertSafeOutputPath,
  assertSafePath,
} from '../allowlist';
import { runSync, runSyncOrThrow } from '../exec';

export type SimDevice = {
  udid: string;
  name: string;
  state: string;
  runtime: string;
  isAvailable: boolean;
};

function simctl(args: string[]): string {
  return runSyncOrThrow('xcrun', ['simctl', ...args]);
}

export function listSimulators(): SimDevice[] {
  const raw = simctl(['list', 'devices', '-j']);
  const json = JSON.parse(raw) as {
    devices?: Record<
      string,
      Array<{
        udid: string;
        name: string;
        state: string;
        isAvailable?: boolean;
      }>
    >;
  };
  const out: SimDevice[] = [];
  for (const [runtime, devices] of Object.entries(json.devices ?? {})) {
    for (const d of devices) {
      out.push({
        udid: d.udid,
        name: d.name,
        state: d.state,
        runtime,
        isAvailable: d.isAvailable !== false,
      });
    }
  }
  return out;
}

export function resolveSimulatorId(device?: string, deviceId?: string): string {
  if (deviceId) {
    return assertSafeDeviceId(deviceId);
  }
  if (!device) {
    const booted = listSimulators().find((d) => d.state === 'Booted');
    if (booted) return booted.udid;
    throw new Error('no device specified and no booted simulator');
  }
  const safe = device.trim();
  const all = listSimulators();
  const byUdid = all.find((d) => d.udid === safe);
  if (byUdid) return byUdid.udid;
  const byName = all.filter((d) => d.name === safe || d.name.includes(safe));
  const booted = byName.find((d) => d.state === 'Booted');
  if (booted) return booted.udid;
  if (byName[0]) return byName[0].udid;
  throw new Error(`simulator not found: ${device}`);
}

export function assertSimulatorExists(udid: string): void {
  const id = assertSafeDeviceId(udid);
  const found = listSimulators().some((d) => d.udid === id);
  if (!found) {
    throw new Error(
      `simulator UDID ${id} not found. Boot/create it or pass a valid deviceId.`
    );
  }
}

export function bootSimulator(udid: string): void {
  const id = assertSafeDeviceId(udid);
  runSync('xcrun', ['simctl', 'boot', id]);
  const status = runSync('xcrun', ['simctl', 'bootstatus', id, '-b'], {
    timeout: 120_000,
  });
  if (status.status !== 0) {
    throw new Error(
      `simulator ${id} failed to become ready: ${status.stderr || status.stdout}`
    );
  }
}

export function openSimulatorApp(): void {
  runSync('open', ['-a', 'Simulator']);
}

export function screenshotSim(udid: string, outputPath: string): string {
  const id = assertSafeDeviceId(udid);
  const out = assertSafeOutputPath(outputPath);
  simctl(['io', id, 'screenshot', out]);
  return out;
}

export function installApp(udid: string, appPath: string): void {
  const id = assertSafeDeviceId(udid);
  const app = assertSafePath(appPath, { mustExist: true });
  simctl(['install', id, app]);
}

export function launchApp(
  udid: string,
  bundleId: string,
  options: { terminateRunning?: boolean; env?: Record<string, string> } = {}
): void {
  const id = assertSafeDeviceId(udid);
  if (options.terminateRunning) {
    runSync('xcrun', ['simctl', 'terminate', id, bundleId]);
  }
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const [k, v] of Object.entries(options.env ?? {})) {
    env[`SIMCTL_CHILD_${k}`] = v;
  }
  runSyncOrThrow('xcrun', ['simctl', 'launch', id, bundleId], { env });
}

export function terminateApp(udid: string, bundleId: string): void {
  runSync('xcrun', ['simctl', 'terminate', assertSafeDeviceId(udid), bundleId]);
}

export function recordVideoStart(
  udid: string,
  outputPath: string,
  options: { codec?: 'h264' | 'hevc'; force?: boolean } = {}
): void {
  const id = assertSafeDeviceId(udid);
  const out = assertSafeOutputPath(outputPath);
  const args = ['io', id, 'recordVideo'];
  if (options.codec) args.push(`--codec=${options.codec}`);
  if (options.force) args.push('--force');
  args.push(out);
  // Fire-and-forget recording is managed externally; sync start check only.
  runSync('xcrun', ['simctl', ...args]);
}

export function stopRecording(): void {
  runSync('killall', ['simctl']);
}
