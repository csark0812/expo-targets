import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { matchesAccessibilityCriteria } from '../a11yMatch';
import {
  assertSafeBundleId,
  assertSafeDeviceId,
  assertSafePath,
} from '../allowlist';
import { runSync, runSyncOrThrow } from '../exec';
import type {
  AccessibilityNode,
  DeviceDriver,
  DeviceKind,
  FindCriteria,
  ScreenshotOptions,
  SwipeOptions,
  TapOptions,
} from '../types';

export function getAdbBin(adbPath?: string): string {
  if (adbPath) return adbPath;
  if (process.env.DEVICEWRIGHT_ADB_PATH) {
    return process.env.DEVICEWRIGHT_ADB_PATH;
  }
  if (process.env.ANDROID_HOME) {
    return path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb');
  }
  return 'adb';
}

export function adbAvailable(adbPath?: string): boolean {
  const bin = getAdbBin(adbPath);
  return runSync(bin, ['version']).status === 0;
}

export function listDevices(
  adbPath?: string
): Array<{ serial: string; state: string }> {
  const out = runSyncOrThrow(getAdbBin(adbPath), ['devices']);
  return out
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial, state] = line.split(/\s+/);
      return { serial, state: state || 'unknown' };
    })
    .filter((d) => d.serial && d.serial !== 'List');
}

export function resolveAndroidSerial(
  device?: string,
  deviceId?: string,
  adbPath?: string
): string {
  if (deviceId) return assertSafeDeviceId(deviceId);
  const devices = listDevices(adbPath).filter((d) => d.state === 'device');
  if (device) {
    const match = devices.find(
      (d) => d.serial === device || d.serial.includes(device)
    );
    if (match) return match.serial;
    throw new Error(`android device not found: ${device}`);
  }
  if (devices[0]) return devices[0].serial;
  throw new Error('no android device/emulator connected');
}

function adbSerial(serial: string, args: string[], adbPath?: string): string {
  return runSyncOrThrow(getAdbBin(adbPath), [
    '-s',
    assertSafeDeviceId(serial),
    ...args,
  ]);
}

export function installApk(
  serial: string,
  apkPath: string,
  adbPath?: string
): void {
  const apk = assertSafePath(apkPath, { mustExist: true });
  adbSerial(serial, ['install', '-r', apk], adbPath);
}

export function launchActivity(
  serial: string,
  packageName: string,
  options: {
    activity?: string;
    terminateRunning?: boolean;
    adbPath?: string;
  } = {}
): void {
  const pkg = assertSafeBundleId(packageName);
  const adbPath = options.adbPath;
  if (options.terminateRunning) {
    runSync(getAdbBin(adbPath), [
      '-s',
      serial,
      'shell',
      'am',
      'force-stop',
      pkg,
    ]);
  }
  if (options.activity) {
    adbSerial(
      serial,
      ['shell', 'am', 'start', '-n', `${pkg}/${options.activity}`],
      adbPath
    );
  } else {
    adbSerial(
      serial,
      [
        'shell',
        'monkey',
        '-p',
        pkg,
        '-c',
        'android.intent.category.LAUNCHER',
        '1',
      ],
      adbPath
    );
  }
}

export function screenshotAdb(
  serial: string,
  outputPath: string,
  adbPath?: string
): string {
  const remote = '/sdcard/devicewright-shot.png';
  adbSerial(serial, ['shell', 'screencap', '-p', remote], adbPath);
  const out = path.resolve(outputPath);
  adbSerial(serial, ['pull', remote, out], adbPath);
  return out;
}

function parseUiAutomatorXml(xml: string): AccessibilityNode[] {
  const nodes: AccessibilityNode[] = [];
  const re = /<node\b([^>]*)\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    const attrs = m[1];
    const get = (name: string): string => {
      const am = attrs.match(new RegExp(`${name}="([^"]*)"`));
      return am ? am[1] : '';
    };
    const bounds = get('bounds');
    let frame: AccessibilityNode['frame'];
    const bm = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (bm) {
      const x1 = Number(bm[1]);
      const y1 = Number(bm[2]);
      const x2 = Number(bm[3]);
      const y2 = Number(bm[4]);
      frame = { x: x1, y: y1, width: x2 - x1, height: y2 - y1 };
    }
    nodes.push({
      type: get('class'),
      label: get('text') || get('content-desc'),
      identifier: get('resource-id'),
      value: get('text'),
      frame,
      raw: attrs,
    });
  }
  return nodes;
}

export function dumpUi(serial: string, adbPath?: string): AccessibilityNode[] {
  const remote = '/sdcard/devicewright-ui.xml';
  adbSerial(serial, ['shell', 'uiautomator', 'dump', remote], adbPath);
  const local = path.join(os.tmpdir(), `devicewright-ui-${serial}.xml`);
  adbSerial(serial, ['pull', remote, local], adbPath);
  return parseUiAutomatorXml(fs.readFileSync(local, 'utf8'));
}

export function tapAdb(
  serial: string,
  options: TapOptions,
  adbPath?: string
): void {
  adbSerial(
    serial,
    ['shell', 'input', 'tap', String(options.x), String(options.y)],
    adbPath
  );
}

export function typeAdb(serial: string, text: string, adbPath?: string): void {
  if (/[;&|`$]/.test(text)) {
    throw new Error('android type rejects shell metacharacters');
  }
  const escaped = text.replace(/ /g, '%s');
  adbSerial(serial, ['shell', 'input', 'text', escaped], adbPath);
}

export function swipeAdb(
  serial: string,
  options: SwipeOptions,
  adbPath?: string
): void {
  const durationMs = Math.round((options.duration ?? 0.3) * 1000);
  adbSerial(
    serial,
    [
      'shell',
      'input',
      'swipe',
      String(options.xStart),
      String(options.yStart),
      String(options.xEnd),
      String(options.yEnd),
      String(durationMs),
    ],
    adbPath
  );
}

export type AndroidDriverOptions = {
  deviceId: string;
  kind?: DeviceKind;
  adbPath?: string;
};

export class AndroidDriver implements DeviceDriver {
  readonly platform = 'android' as const;
  readonly deviceId: string;
  readonly kind: DeviceKind;
  private readonly adbPath?: string;

  constructor(options: AndroidDriverOptions) {
    this.deviceId = options.deviceId;
    this.kind = options.kind ?? 'emulator';
    this.adbPath = options.adbPath;
  }

  async install(appPath: string): Promise<void> {
    installApk(this.deviceId, appPath, this.adbPath);
  }

  async launchApp(
    bundleId: string,
    options?: { terminateRunning?: boolean }
  ): Promise<void> {
    launchActivity(this.deviceId, bundleId, {
      ...options,
      adbPath: this.adbPath,
    });
  }

  async screenshot(options?: ScreenshotOptions): Promise<Buffer | string> {
    const out =
      options?.path ??
      path.join(os.tmpdir(), `devicewright-android-${Date.now()}.png`);
    return screenshotAdb(this.deviceId, out, this.adbPath);
  }

  async accessibilityTree(): Promise<AccessibilityNode[]> {
    return dumpUi(this.deviceId, this.adbPath);
  }

  async findElements(criteria: FindCriteria): Promise<AccessibilityNode[]> {
    const tree = await this.accessibilityTree();
    return tree.filter((node) => matchesAccessibilityCriteria(node, criteria));
  }

  async tap(options: TapOptions): Promise<void> {
    tapAdb(this.deviceId, options, this.adbPath);
  }

  async type(text: string): Promise<void> {
    typeAdb(this.deviceId, text, this.adbPath);
  }

  async swipe(options: SwipeOptions): Promise<void> {
    swipeAdb(this.deviceId, options, this.adbPath);
  }
}
