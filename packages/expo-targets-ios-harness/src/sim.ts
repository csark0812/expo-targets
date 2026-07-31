import { spawnSync } from 'node:child_process';
import process from 'node:process';
import { DEFAULT_SIM_UDID } from './constants';

export function resolveSimUdid(): string {
  const fromEnv = process.env.UITEST_SIM_UDID?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_SIM_UDID;
}

function simctlListDevices(): string {
  const result = spawnSync('xcrun', ['simctl', 'list', 'devices', '-j'], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(
      `xcrun simctl list failed: ${result.stderr || result.stdout || 'unknown'}`
    );
  }
  return result.stdout;
}

export function assertSimulatorExists(udid: string): void {
  let json: { devices?: Record<string, Array<{ udid: string; name: string }>> };
  try {
    json = JSON.parse(simctlListDevices());
  } catch (error) {
    throw new Error(
      `could not parse simctl device list while looking for ${udid}: ${error}`
    );
  }
  for (const devices of Object.values(json.devices ?? {})) {
    if (devices.some((d) => d.udid === udid)) {
      return;
    }
  }
  throw new Error(
    `simulator UDID ${udid} not found on this machine. Boot/create that simulator or set UITEST_SIM_UDID.`
  );
}

export function bootSimulator(udid: string): void {
  spawnSync('xcrun', ['simctl', 'boot', udid], { encoding: 'utf8' });
  const status = spawnSync('xcrun', ['simctl', 'bootstatus', udid, '-b'], {
    encoding: 'utf8',
    timeout: 120_000,
  });
  if (status.status !== 0) {
    throw new Error(
      `simulator ${udid} failed to become ready: ${status.stderr || status.stdout}`
    );
  }
}
