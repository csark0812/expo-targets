import { Locator, type LocatorOptions } from './locator';
import type { LockHandle } from './lock';
import type {
  AccessibilityNode,
  DeviceDriver,
  DeviceKind,
  FindCriteria,
  Platform,
  ScreenshotOptions,
  SwipeOptions,
  TapOptions,
  TraceStep,
} from './types';

export class DeviceSession {
  readonly platform: Platform;
  readonly deviceId: string;
  readonly kind: DeviceKind;
  private readonly driver: DeviceDriver;
  private readonly lock?: LockHandle;
  private readonly steps: TraceStep[] = [];
  private closed = false;

  constructor(options: {
    driver: DeviceDriver;
    lock?: LockHandle;
  }) {
    this.driver = options.driver;
    this.lock = options.lock;
    this.platform = options.driver.platform;
    this.deviceId = options.driver.deviceId;
    this.kind = options.driver.kind;
  }

  private trace(
    action: string,
    detail?: Record<string, unknown>,
    error?: string
  ) {
    this.steps.push({
      at: new Date().toISOString(),
      action,
      detail,
      error,
    });
  }

  getTrace(): TraceStep[] {
    return [...this.steps];
  }

  async install(appPath: string): Promise<void> {
    try {
      await this.driver.install(appPath);
      this.trace('install', { appPath });
    } catch (e) {
      this.trace('install', { appPath }, String(e));
      throw e;
    }
  }

  async launchApp(
    bundleId: string,
    options?: { terminateRunning?: boolean }
  ): Promise<void> {
    try {
      await this.driver.launchApp(bundleId, options);
      this.trace('launchApp', { bundleId, ...options });
    } catch (e) {
      this.trace('launchApp', { bundleId }, String(e));
      throw e;
    }
  }

  async terminateApp(bundleId: string): Promise<void> {
    if (!this.driver.terminateApp) {
      throw new Error('terminateApp not supported on this driver');
    }
    await this.driver.terminateApp(bundleId);
    this.trace('terminateApp', { bundleId });
  }

  async screenshot(options?: ScreenshotOptions): Promise<Buffer | string> {
    const result = await this.driver.screenshot(options);
    this.trace('screenshot', {
      path: typeof result === 'string' ? result : options?.path,
    });
    return result;
  }

  async accessibilityTree(): Promise<AccessibilityNode[]> {
    return this.driver.accessibilityTree();
  }

  async describePoint(x: number, y: number): Promise<AccessibilityNode | null> {
    if (!this.driver.describePoint) {
      throw new Error('describePoint not supported on this driver');
    }
    return this.driver.describePoint(x, y);
  }

  async findElements(criteria: FindCriteria): Promise<AccessibilityNode[]> {
    return this.driver.findElements(criteria);
  }

  async tap(options: TapOptions): Promise<void> {
    await this.driver.tap(options);
    this.trace('tap', options as unknown as Record<string, unknown>);
  }

  async type(text: string): Promise<void> {
    await this.driver.type(text);
    this.trace('type', { length: text.length });
  }

  async swipe(options: SwipeOptions): Promise<void> {
    await this.driver.swipe(options);
    this.trace('swipe', options as unknown as Record<string, unknown>);
  }

  getByText(
    text: string,
    options?: LocatorOptions & { exact?: boolean }
  ): Locator {
    return new Locator(
      this.driver,
      {
        search: [text],
        matchMode: options?.exact ? 'exact' : 'substring',
      },
      options
    );
  }

  getByRole(
    role: string,
    options?: LocatorOptions & { name?: string }
  ): Locator {
    return new Locator(
      this.driver,
      {
        type: role,
        search: options?.name ? [options.name] : [''],
        matchMode: 'substring',
      },
      options
    );
  }

  getById(id: string, options?: LocatorOptions): Locator {
    return new Locator(
      this.driver,
      { search: [id], matchMode: 'exact' },
      options
    );
  }

  getByLabel(label: string, options?: LocatorOptions): Locator {
    return this.getByText(label, options);
  }

  async close(): Promise<void> {
    if (this.closed) return;
    this.closed = true;
    try {
      await this.driver.close?.();
    } finally {
      this.lock?.release();
      this.trace('close');
    }
  }
}
