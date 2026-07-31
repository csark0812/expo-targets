import { AndroidDriver, resolveAndroidSerial } from './android';
import { IosDriver } from './ios';
import {
  assertSimulatorExists,
  bootSimulator,
  resolveSimulatorId,
} from './ios/simctl';
import { acquireDeviceLock } from './lock';
import { DeviceSession } from './session';
import type { DeviceKind, LaunchOptions } from './types';

async function launchIos(options: LaunchOptions): Promise<DeviceSession> {
  const deviceId = resolveSimulatorId(options.device, options.deviceId);
  assertSimulatorExists(deviceId);
  const kind: DeviceKind = options.kind ?? 'simulator';
  const lock = options.lock === false ? undefined : acquireDeviceLock(deviceId);
  try {
    if (options.boot !== false && kind === 'simulator') {
      bootSimulator(deviceId);
    }
    const driver = new IosDriver({
      deviceId,
      kind,
      idbPath: options.idbPath,
    });
    return new DeviceSession({ driver, lock });
  } catch (e) {
    lock?.release();
    throw e;
  }
}

async function launchAndroid(options: LaunchOptions): Promise<DeviceSession> {
  const deviceId = resolveAndroidSerial(
    options.device,
    options.deviceId,
    options.adbPath
  );
  const kind: DeviceKind = options.kind ?? 'emulator';
  const lock = options.lock === false ? undefined : acquireDeviceLock(deviceId);
  try {
    const driver = new AndroidDriver({
      deviceId,
      kind,
      adbPath: options.adbPath,
    });
    return new DeviceSession({ driver, lock });
  } catch (e) {
    lock?.release();
    throw e;
  }
}

export const devices = {
  async launch(options: LaunchOptions): Promise<DeviceSession> {
    if (options.platform === 'ios') {
      return launchIos(options);
    }
    if (options.platform === 'android') {
      return launchAndroid(options);
    }
    throw new Error(
      `unsupported platform: ${(options as LaunchOptions).platform}`
    );
  },
};
