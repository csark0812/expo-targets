import type { AccessibilityNode, DeviceDriver, FindCriteria } from './types';

export type LocatorOptions = {
  timeoutMs?: number;
  intervalMs?: number;
};

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_INTERVAL_MS = 250;

function center(node: AccessibilityNode): { x: number; y: number } {
  const f = node.frame;
  if (!f) {
    throw new Error('element has no frame for tap');
  }
  return {
    x: Math.round(f.x + f.width / 2),
    y: Math.round(f.y + f.height / 2),
  };
}

export class Locator {
  constructor(
    private readonly driver: DeviceDriver,
    private readonly criteria: FindCriteria,
    private readonly options: LocatorOptions = {}
  ) {}

  private async waitFor(): Promise<AccessibilityNode> {
    const timeout = this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const interval = this.options.intervalMs ?? DEFAULT_INTERVAL_MS;
    const start = Date.now();
    let lastCount = 0;
    while (Date.now() - start < timeout) {
      const matches = await this.driver.findElements(this.criteria);
      lastCount = matches.length;
      if (matches[0]) return matches[0];
      await new Promise((r) => setTimeout(r, interval));
    }
    throw new Error(
      `locator timeout after ${timeout}ms (matches=${lastCount}): ${JSON.stringify(
        this.criteria
      )}`
    );
  }

  async element(): Promise<AccessibilityNode> {
    return this.waitFor();
  }

  async count(): Promise<number> {
    return (await this.driver.findElements(this.criteria)).length;
  }

  async tap(): Promise<void> {
    const node = await this.waitFor();
    const { x, y } = center(node);
    await this.driver.tap({ x, y });
  }

  async isVisible(): Promise<boolean> {
    try {
      await this.waitFor();
      return true;
    } catch {
      return false;
    }
  }
}
