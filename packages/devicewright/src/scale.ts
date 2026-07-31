/**
 * Multi-device / iPad / physical / cloud scale surfaces (Phase 4).
 * API-ready stubs so consumers do not hard-code sim-only paths.
 */

import { devices } from './devices';
import type { DeviceSession } from './session';
import type { LaunchOptions, Platform } from './types';

export type ParallelTarget = LaunchOptions & { name?: string };

export type ParallelResult = {
  name: string;
  ok: boolean;
  error?: string;
  deviceId?: string;
};

/** Run the same async body on multiple devices in parallel. */
export async function runOnDevices(
  targets: ParallelTarget[],
  body: (device: DeviceSession, target: ParallelTarget) => Promise<void>
): Promise<ParallelResult[]> {
  return Promise.all(
    targets.map(async (target) => {
      const name =
        target.name ??
        `${target.platform}:${target.deviceId ?? target.device ?? 'default'}`;
      let device: DeviceSession | undefined;
      try {
        device = await devices.launch(target);
        await body(device, target);
        return { name, ok: true, deviceId: device.deviceId };
      } catch (e) {
        return {
          name,
          ok: false,
          error: String(e),
          deviceId: device?.deviceId,
        };
      } finally {
        await device?.close();
      }
    })
  );
}

/** iPad as iOS device class — same driver, form-factor name hint. */
export function ipadLaunchOptions(
  overrides: Partial<LaunchOptions> = {}
): LaunchOptions {
  return {
    platform: 'ios',
    device: overrides.device ?? 'iPad',
    kind: overrides.kind ?? 'simulator',
    ...overrides,
  };
}

/**
 * Physical device launch options (usbmux / wireless lockdown).
 * Driver install/launch deepen in Phase 4 — session id is still a UDID.
 */
export function physicalLaunchOptions(
  platform: Platform,
  deviceId: string,
  overrides: Partial<LaunchOptions> = {}
): LaunchOptions {
  return {
    platform,
    deviceId,
    kind: 'physical',
    boot: false,
    ...overrides,
  };
}

/** Cloud adapter seam — implementors wrap BrowserStack/Maestro Cloud etc. */
export interface CloudDeviceAdapter {
  readonly name: string;
  allocate(options: {
    platform: Platform;
    deviceModel?: string;
    osVersion?: string;
  }): Promise<LaunchOptions>;
  release?(deviceId: string): Promise<void>;
}

const cloudAdapters = new Map<string, CloudDeviceAdapter>();

export function registerCloudAdapter(adapter: CloudDeviceAdapter): void {
  cloudAdapters.set(adapter.name, adapter);
}

export function getCloudAdapter(name: string): CloudDeviceAdapter | undefined {
  return cloudAdapters.get(name);
}

export function listCloudAdapters(): string[] {
  return [...cloudAdapters.keys()];
}
