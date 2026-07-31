import type { ChildProcess } from 'node:child_process';
import process from 'node:process';
import { matchesAccessibilityCriteria } from '../a11yMatch';
import { assertSafeDeviceId } from '../allowlist';
import { runAsync, runSync, runSyncOrThrow } from '../exec';
import type {
  AccessibilityNode,
  FindCriteria,
  SwipeOptions,
  TapOptions,
} from '../types';

export type IdbRunOptions = {
  idbPath?: string;
  udid?: string;
  signal?: AbortSignal;
  onSpawn?: (child: ChildProcess) => void;
  timeoutMs?: number;
};

/** Optional MCP registry hook — killable children for force-close. */
let childTracker: ((udid: string, child: ChildProcess) => void) | null = null;

export function setIdbChildTracker(
  tracker: ((udid: string, child: ChildProcess) => void) | null
): void {
  childTracker = tracker;
}

function resolveIdb(idbPath?: string): string {
  return (
    idbPath ||
    process.env.DEVICEWRIGHT_IDB_PATH ||
    process.env.IOS_SIMULATOR_MCP_IDB_PATH ||
    'idb'
  );
}

function intCoord(n: number): string {
  return String(Math.round(n));
}

function idbSync(
  args: string[],
  options: { idbPath?: string; udid?: string } = {}
): string {
  const bin = resolveIdb(options.idbPath);
  const full = [...args];
  if (options.udid) {
    full.push('--udid', assertSafeDeviceId(options.udid));
  }
  return runSyncOrThrow(bin, full);
}

async function idbAsync(
  args: string[],
  options: IdbRunOptions = {}
): Promise<string> {
  const bin = resolveIdb(options.idbPath);
  const full = [...args];
  const udid = options.udid ? assertSafeDeviceId(options.udid) : undefined;
  if (udid) {
    full.push('--udid', udid);
  }
  const result = await runAsync(bin, full, {
    signal: options.signal,
    timeoutMs: options.timeoutMs,
    onSpawn: (child) => {
      if (udid) childTracker?.(udid, child);
      options.onSpawn?.(child);
    },
  });
  if (result.status !== 0) {
    throw new Error(
      `${bin} ${full.join(' ')} failed (${result.status}): ${
        result.stderr || result.stdout || 'unknown'
      }`
    );
  }
  return result.stdout;
}

export function idbAvailable(idbPath?: string): boolean {
  const bin = resolveIdb(idbPath);
  const which = runSync('which', [bin]);
  if (which.status === 0) return true;
  const help = runSync(bin, ['--help']);
  return help.status === 0 || help.stdout.length > 0 || help.stderr.length > 0;
}

function parseDescribeAll(raw: string): AccessibilityNode[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map(normalizeNode);
    }
    if (parsed && typeof parsed === 'object') {
      return [normalizeNode(parsed)];
    }
  } catch {
    // idb sometimes returns non-JSON — wrap as raw
  }
  return [{ type: 'Raw', value: raw.slice(0, 2000), raw }];
}

function pickString(
  o: Record<string, unknown>,
  keys: string[]
): string | undefined {
  for (const key of keys) {
    const v = o[key];
    if (typeof v === 'string' || typeof v === 'number') {
      return String(v);
    }
  }
}

function normalizeFrame(
  frameRaw: Record<string, number> | undefined
): AccessibilityNode['frame'] {
  if (!frameRaw) return;
  return {
    x: Number(frameRaw.x ?? frameRaw.X ?? 0),
    y: Number(frameRaw.y ?? frameRaw.Y ?? 0),
    width: Number(frameRaw.width ?? frameRaw.Width ?? 0),
    height: Number(frameRaw.height ?? frameRaw.Height ?? 0),
  };
}

function normalizeNode(input: unknown): AccessibilityNode {
  if (!input || typeof input !== 'object') {
    return { raw: input };
  }
  const o = input as Record<string, unknown>;
  const frameRaw = (o.frame ?? o.AXFrame ?? o.rect) as
    | Record<string, number>
    | undefined;
  const childrenRaw = (o.children ?? o.AXChildren) as unknown[] | undefined;
  return {
    type: pickString(o, ['type', 'role', 'AXRole']) ?? '',
    label: pickString(o, ['label', 'AXLabel', 'name']) ?? '',
    value: pickString(o, ['value', 'AXValue']),
    identifier: pickString(o, ['identifier', 'AXUniqueId']),
    frame: normalizeFrame(frameRaw),
    children: Array.isArray(childrenRaw)
      ? childrenRaw.map(normalizeNode)
      : undefined,
    raw: input,
  };
}

export async function describeAll(
  udid: string,
  options: IdbRunOptions = {}
): Promise<AccessibilityNode[]> {
  const raw = await idbAsync(['ui', 'describe-all'], { ...options, udid });
  return parseDescribeAll(raw);
}

export async function describePoint(options: {
  udid: string;
  x: number;
  y: number;
  idbPath?: string;
  signal?: AbortSignal;
  onSpawn?: (child: ChildProcess) => void;
  timeoutMs?: number;
}): Promise<AccessibilityNode | null> {
  const raw = await idbAsync(
    ['ui', 'describe-point', intCoord(options.x), intCoord(options.y)],
    {
      idbPath: options.idbPath,
      udid: options.udid,
      signal: options.signal,
      onSpawn: options.onSpawn,
      timeoutMs: options.timeoutMs,
    }
  );
  const nodes = parseDescribeAll(raw);
  return nodes[0] ?? null;
}

export async function tap(
  udid: string,
  options: TapOptions & IdbRunOptions
): Promise<void> {
  const args = ['ui', 'tap', intCoord(options.x), intCoord(options.y)];
  if (options.duration !== undefined) {
    args.push('--duration', String(options.duration));
  }
  await idbAsync(args, { ...options, udid });
}

export async function typeText(
  udid: string,
  text: string,
  options: IdbRunOptions = {}
): Promise<void> {
  if (!/^[\x20-\x7E]*$/.test(text)) {
    throw new Error('ui type supports ASCII printable characters only');
  }
  await idbAsync(['ui', 'text', text], { ...options, udid });
}

export async function swipe(
  udid: string,
  options: SwipeOptions & IdbRunOptions
): Promise<void> {
  const args = [
    'ui',
    'swipe',
    intCoord(options.xStart),
    intCoord(options.yStart),
    intCoord(options.xEnd),
    intCoord(options.yEnd),
  ];
  if (options.duration !== undefined) {
    args.push('--duration', String(options.duration));
  }
  if (options.delta !== undefined) {
    args.push('--delta', String(options.delta));
  }
  await idbAsync(args, { ...options, udid });
}

function flatten(nodes: AccessibilityNode[]): AccessibilityNode[] {
  const out: AccessibilityNode[] = [];
  const walk = (n: AccessibilityNode) => {
    out.push(n);
    for (const c of n.children ?? []) walk(c);
  };
  for (const n of nodes) walk(n);
  return out;
}

export async function findElements(
  udid: string,
  criteria: FindCriteria,
  options: IdbRunOptions = {}
): Promise<AccessibilityNode[]> {
  return flatten(await describeAll(udid, options)).filter((node) =>
    matchesAccessibilityCriteria(node, criteria)
  );
}

/** Sync helpers kept for non-UI / doctor paths that need immediate argv. */
export function describeAllSync(
  udid: string,
  options: { idbPath?: string } = {}
): AccessibilityNode[] {
  const raw = idbSync(['ui', 'describe-all'], { ...options, udid });
  return parseDescribeAll(raw);
}
