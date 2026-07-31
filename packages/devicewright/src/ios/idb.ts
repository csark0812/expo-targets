import process from 'node:process';
import { matchesAccessibilityCriteria } from '../a11yMatch';
import { assertSafeDeviceId } from '../allowlist';
import { runSync, runSyncOrThrow } from '../exec';
import type {
  AccessibilityNode,
  FindCriteria,
  SwipeOptions,
  TapOptions,
} from '../types';

function resolveIdb(idbPath?: string): string {
  return (
    idbPath ||
    process.env.DEVICEWRIGHT_IDB_PATH ||
    process.env.IOS_SIMULATOR_MCP_IDB_PATH ||
    'idb'
  );
}

function idb(
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

export function describeAll(
  udid: string,
  options: { idbPath?: string } = {}
): AccessibilityNode[] {
  const raw = idb(['ui', 'describe-all'], { ...options, udid });
  return parseDescribeAll(raw);
}

export function describePoint(options: {
  udid: string;
  x: number;
  y: number;
  idbPath?: string;
}): AccessibilityNode | null {
  const raw = idb(
    ['ui', 'describe-point', String(options.x), String(options.y)],
    { idbPath: options.idbPath, udid: options.udid }
  );
  const nodes = parseDescribeAll(raw);
  return nodes[0] ?? null;
}

export function tap(
  udid: string,
  options: TapOptions & { idbPath?: string }
): void {
  const args = ['ui', 'tap', String(options.x), String(options.y)];
  if (options.duration !== undefined) {
    args.push('--duration', String(options.duration));
  }
  idb(args, { idbPath: options.idbPath, udid });
}

export function typeText(
  udid: string,
  text: string,
  options: { idbPath?: string } = {}
): void {
  if (!/^[\x20-\x7E]*$/.test(text)) {
    throw new Error('ui type supports ASCII printable characters only');
  }
  idb(['ui', 'text', text], { ...options, udid });
}

export function swipe(
  udid: string,
  options: SwipeOptions & { idbPath?: string }
): void {
  const args = [
    'ui',
    'swipe',
    String(options.xStart),
    String(options.yStart),
    String(options.xEnd),
    String(options.yEnd),
  ];
  if (options.duration !== undefined) {
    args.push('--duration', String(options.duration));
  }
  if (options.delta !== undefined) {
    args.push('--delta', String(options.delta));
  }
  idb(args, { idbPath: options.idbPath, udid });
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

export function findElements(
  udid: string,
  criteria: FindCriteria,
  options: { idbPath?: string } = {}
): AccessibilityNode[] {
  return flatten(describeAll(udid, options)).filter((node) =>
    matchesAccessibilityCriteria(node, criteria)
  );
}
