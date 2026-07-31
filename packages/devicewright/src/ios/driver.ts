import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { assertSafeBundleId, assertSafePath } from '../allowlist';
import type {
  AccessibilityNode,
  DeviceDriver,
  DeviceKind,
  FindCriteria,
  ScreenshotOptions,
  SwipeOptions,
  TapOptions,
} from '../types';
import * as idb from './idb';
import * as simctl from './simctl';

export type IosDriverOptions = {
  deviceId: string;
  kind?: DeviceKind;
  idbPath?: string;
};

export class IosDriver implements DeviceDriver {
  readonly platform = 'ios' as const;
  readonly deviceId: string;
  readonly kind: DeviceKind;
  private readonly idbPath?: string;

  constructor(options: IosDriverOptions) {
    this.deviceId = options.deviceId;
    this.kind = options.kind ?? 'simulator';
    this.idbPath = options.idbPath;
  }

  async boot(): Promise<void> {
    if (this.kind === 'simulator') {
      simctl.bootSimulator(this.deviceId);
    }
    // physical: assume already paired / trusted
  }

  async install(appPath: string): Promise<void> {
    const app = assertSafePath(appPath, { mustExist: true });
    if (this.kind === 'simulator') {
      simctl.installApp(this.deviceId, app);
      return;
    }
    throw new Error(
      'physical install via Devicewright uses usbmux/ideviceinstaller — wire in Phase 4 deepen'
    );
  }

  async launchApp(
    bundleId: string,
    options?: { terminateRunning?: boolean }
  ): Promise<void> {
    const id = assertSafeBundleId(bundleId);
    if (this.kind === 'simulator') {
      simctl.launchApp(this.deviceId, id, options);
      return;
    }
    throw new Error('physical launchApp deepen in Phase 4');
  }

  async terminateApp(bundleId: string): Promise<void> {
    simctl.terminateApp(this.deviceId, assertSafeBundleId(bundleId));
  }

  async screenshot(options?: ScreenshotOptions): Promise<Buffer | string> {
    const out =
      options?.path ??
      path.join(os.tmpdir(), `devicewright-${this.deviceId}-${Date.now()}.png`);
    if (this.kind === 'simulator') {
      return simctl.screenshotSim(this.deviceId, out);
    }
    throw new Error('physical screenshot deepen in Phase 4');
  }

  async accessibilityTree(): Promise<AccessibilityNode[]> {
    return idb.describeAll(this.deviceId, { idbPath: this.idbPath });
  }

  async describePoint(x: number, y: number): Promise<AccessibilityNode | null> {
    return idb.describePoint({
      udid: this.deviceId,
      x,
      y,
      idbPath: this.idbPath,
    });
  }

  async findElements(criteria: FindCriteria): Promise<AccessibilityNode[]> {
    return idb.findElements(this.deviceId, criteria, { idbPath: this.idbPath });
  }

  async tap(options: TapOptions): Promise<void> {
    idb.tap(this.deviceId, { ...options, idbPath: this.idbPath });
  }

  async type(text: string): Promise<void> {
    idb.typeText(this.deviceId, text, { idbPath: this.idbPath });
  }

  async swipe(options: SwipeOptions): Promise<void> {
    idb.swipe(this.deviceId, { ...options, idbPath: this.idbPath });
  }

  async viewCompressed(): Promise<Buffer> {
    const p = await this.screenshot();
    const file = typeof p === 'string' ? p : null;
    if (!file) return p as Buffer;
    return fs.readFileSync(file);
  }
}

export * as idb from './idb';
export * as simctl from './simctl';
