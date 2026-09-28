import fs from "node:fs";
import path from "node:path";
import type { AccessibilityNode, DeviceSession } from "./driver";
import { classifyAgentDeviceFailure, devices } from "./driver";

export type SuiteRowResult = {
  id: string;
  ok: boolean;
  status: string;
  steps?: string[];
  error?: string;
  failureKind?: string;
  [key: string]: unknown;
};

export type SuiteMatrixRow = {
  id: string;
  stub?: boolean;
  run?: (device: DeviceSession) => Promise<SuiteRowResult>;
};

export type SuiteMatrixEvent = {
  v: 1;
  event: string;
  [key: string]: unknown;
};

export type PointProbeHit = {
  node: AccessibilityNode;
  probeX: number;
  probeY: number;
};

export type FindNamedViaPointProbeOptions = {
  timeoutMs?: number;
  blockedLabels?: Iterable<string>;
  allowBlocked?: boolean;
  match?: "exact" | "includes";
  isChrome?: (node: AccessibilityNode) => boolean;
  hotspots?: Array<{ x: number; y: number }>;
  [key: string]: unknown;
};

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export function nodeText(node: AccessibilityNode): string {
  return String(node.label ?? node.value ?? node.identifier ?? "").trim();
}

export function flattenLabels(nodes: AccessibilityNode[]): string[] {
  return nodes.flatMap((node) => {
    const values = [node.label, node.value, node.identifier]
      .map((value) => String(value ?? "").trim())
      .filter(Boolean);
    return [...new Set(values)];
  });
}

export function defaultIsChrome(node: AccessibilityNode): boolean {
  return /cancel|close|more|share|copy|save to files|airdrop/i.test(nodeText(node));
}

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

export function findNamedNode(
  nodes: AccessibilityNode[],
  names: string[],
  blockedLabels: Iterable<string> = [],
): AccessibilityNode | undefined {
  const wanted = names.map(normalized);
  const blocked = new Set([...blockedLabels].map(normalized));
  return nodes.find((node) => {
    const candidates = [node.label, node.value, node.identifier]
      .map((value) => normalized(String(value ?? "")))
      .filter(Boolean);
    return (
      !candidates.some((candidate) => blocked.has(candidate)) &&
      candidates.some((candidate) => wanted.includes(candidate))
    );
  });
}

export async function waitForNamed(
  device: DeviceSession,
  names: string[],
  options: { timeoutMs?: number; blockedLabels?: Iterable<string> } = {},
): Promise<AccessibilityNode> {
  const deadline = Date.now() + (options.timeoutMs ?? 10_000);
  let last: AccessibilityNode[] = [];
  while (Date.now() < deadline) {
    last = await device.accessibilityTree();
    const node = findNamedNode(last, names, options.blockedLabels);
    if (node) return node;
    await sleep(200);
  }
  throw new Error(
    `waitForNamed timed out: ${names.join(", ")}; labels=${flattenLabels(last)
      .slice(0, 30)
      .join("|")}`,
  );
}

export async function waitForId(
  device: DeviceSession,
  id: string,
  timeoutMs = 10_000,
): Promise<AccessibilityNode> {
  const deadline = Date.now() + timeoutMs;
  let last: AccessibilityNode[] = [];
  while (Date.now() < deadline) {
    last = await device.accessibilityTree();
    const node = last.find(
      (candidate) => candidate.identifier === id || candidate.id === id,
    );
    if (node) return node;
    await sleep(200);
  }
  throw new Error(
    `waitForId timed out: ${id}; ids=${last
      .map((node) => node.identifier ?? node.id)
      .filter(Boolean)
      .slice(0, 30)
      .join("|")}`,
  );
}

export async function tapCenter(
  device: DeviceSession,
  node: AccessibilityNode,
): Promise<void> {
  const frame = node.frame ?? node.rect;
  if (!frame) throw new Error(`node has no actionable frame: ${nodeText(node)}`);
  await device.tap({
    x: Math.round(frame.x + frame.width / 2),
    y: Math.round(frame.y + frame.height / 2),
  });
}

export async function tapId(
  device: DeviceSession,
  id: string,
  timeoutMs = 10_000,
): Promise<void> {
  await tapCenter(device, await waitForId(device, id, timeoutMs));
}

export async function findNamedViaPointProbe(
  device: DeviceSession,
  names: string[],
  options: FindNamedViaPointProbeOptions = {},
): Promise<PointProbeHit> {
  const deadline = Date.now() + (options.timeoutMs ?? 10_000);
  const wanted = names.map(normalized);
  const blocked = new Set([...(options.blockedLabels ?? [])].map(normalized));
  const width = Number(options.viewportWidth ?? 430);
  const height = Number(options.viewportHeight ?? 932);
  const stepX = Number(options.stepX ?? 55);
  const stepY = Number(options.stepY ?? 32);
  const yStart = Math.round(height * Number(options.yStartRatio ?? 0.05));
  const yEnd = Math.round(height * Number(options.yEndRatio ?? 0.95));
  const points = [
    ...(options.hotspots ?? []),
    ...Array.from(
      { length: Math.max(1, Math.floor((yEnd - yStart) / stepY) + 1) },
      (_, yi) => yStart + yi * stepY,
    ).flatMap((y) =>
      Array.from(
        { length: Math.max(1, Math.floor((width - stepX) / stepX) + 1) },
        (_, xi) => ({ x: Math.round(stepX / 2 + xi * stepX), y }),
      ),
    ),
  ];
  let index = 0;
  while (Date.now() < deadline && points.length > 0) {
    const point = points[index++ % points.length]!;
    const nodes = await device.inspectPoint(point);
    const node = nodes.find((candidate) => {
      const value = normalized(nodeText(candidate));
      if (!value) return false;
      if (!options.allowBlocked && blocked.has(value)) return false;
      if (options.isChrome?.(candidate) && !options.allowBlocked) return false;
      return options.match === "includes"
        ? wanted.some((needle) => value.includes(needle))
        : wanted.includes(value);
    });
    if (node) {
      await device.capturePointEvidence(point, node);
      return { node, probeX: point.x, probeY: point.y };
    }
  }
  throw new Error(
    `agent-device snapshot did not expose named target: ${names.join(", ")}`,
  );
}

export async function tapProbeHit(
  device: DeviceSession,
  hit: Pick<PointProbeHit, "probeX" | "probeY">,
): Promise<void> {
  await device.tap({ x: hit.probeX, y: hit.probeY });
}

export const findSheetRow = findNamedNode;

export async function findSheetRowProbe(
  device: DeviceSession,
  names: string[],
  options: FindNamedViaPointProbeOptions = {},
): Promise<PointProbeHit> {
  return findNamedViaPointProbe(device, names, options);
}

export const iosShareSheetHotspots = [
  { x: 80, y: 620 },
  { x: 180, y: 620 },
  { x: 300, y: 620 },
] as const;

export function appendSuiteEvent(
  artifactDir: string,
  event: SuiteMatrixEvent,
  onEvent?: (event: SuiteMatrixEvent) => void,
): void {
  fs.mkdirSync(artifactDir, { recursive: true });
  fs.appendFileSync(
    path.join(artifactDir, "events.jsonl"),
    `${JSON.stringify({ ...event, at: new Date().toISOString() })}\n`,
  );
  onEvent?.(event);
}

export function matrixActsEnabled(value?: boolean): boolean {
  if (value !== undefined) return value;
  return !["0", "off", "false"].includes(
    String(process.env.AGENT_DEVICE_MATRIX_ACTS ?? "").toLowerCase(),
  );
}

export function bindMatrixActStream(options?: {
  device?: DeviceSession;
  artifactDir?: string;
  index?: number;
  total?: number;
  id?: string;
  onEvent?: (event: SuiteMatrixEvent) => void;
  enabled?: boolean;
}): () => void {
  if (!options?.device || options.enabled === false) return () => undefined;
  return options.device.onTrace((entry) => {
    if (!options.artifactDir) return;
    appendSuiteEvent(
      options.artifactDir,
      {
        v: 1,
        event: "row.act",
        index: options.index,
        total: options.total,
        id: options.id,
        action: entry.action,
        detail: entry.detail,
      },
      options.onEvent,
    );
  });
}

export function buildClaimState(results: SuiteRowResult[]) {
  const idsFor = (status: string) =>
    results.filter((result) => result.status === status).map((result) => result.id);
  return {
    surviving: idsFor("green"),
    cut: results
      .filter((result) => ["red", "operator", "infra"].includes(result.status))
      .map((result) => result.id),
    stub: idsFor("stub"),
    osLimit: idsFor("os-limit"),
    rows: results.map((result) => ({
      id: result.id,
      path: String(result.path ?? result.id),
      phase: Number(result.phase ?? 1),
      status: result.status,
      error: result.error,
      failureKind: result.failureKind,
    })),
  };
}

function stub(id: string, error = "stub — journey not executed"): SuiteRowResult {
  return { id, ok: false, status: "stub", steps: ["stub"], failureKind: "stub", error };
}

export async function runMatrix(options: {
  rows: SuiteMatrixRow[];
  iosDevice?: string;
  artifactDir: string;
  failFast?: boolean;
  onEvent?: (event: SuiteMatrixEvent) => void;
  /** Test seam for launch/cleanup recovery; production uses devices.launch. */
  launchDevice?: () => Promise<DeviceSession>;
  [key: string]: unknown;
}) {
  const { rows, artifactDir, onEvent } = options;
  fs.mkdirSync(artifactDir, { recursive: true });
  appendSuiteEvent(artifactDir, { v: 1, event: "matrix.start", total: rows.length }, onEvent);
  const results: SuiteRowResult[] = [];
  let aborted = false;
  let runError: string | undefined;
  const needsDevice = rows.some((row) => row.run && !row.stub);
  let device: DeviceSession | undefined;
  let launchError: unknown;
  if (needsDevice) {
    try {
      device = options.launchDevice
        ? await options.launchDevice()
        : await devices.launch({
            platform: "ios",
            deviceId: options.iosDevice,
            artifactDir,
          });
    } catch (error) {
      launchError = error;
      runError = `device launch failed: ${String(error)}`;
      appendSuiteEvent(
        artifactDir,
        { v: 1, event: "matrix.device-error", error: runError },
        onEvent,
      );
    }
  }

  const writeRow = (result: SuiteRowResult, index: number): void => {
    results.push(result);
    if (device) {
      fs.writeFileSync(
        path.join(artifactDir, `${result.id}.trace.json`),
        JSON.stringify(device.takeTrace(), null, 2),
      );
    }
    fs.writeFileSync(
      path.join(artifactDir, `${result.id}.result.json`),
      JSON.stringify(result, null, 2),
    );
    appendSuiteEvent(
      artifactDir,
      {
        v: 1,
        event: "row.end",
        index,
        total: rows.length,
        id: result.id,
        status: result.status,
        ok: result.ok,
        error: result.error,
      },
      onEvent,
    );
  };

  const skipRemaining = (start: number, reason: string): void => {
    for (let index = start; index < rows.length; index++) {
      const row = rows[index]!;
      appendSuiteEvent(
        artifactDir,
        { v: 1, event: "row.start", index: index + 1, total: rows.length, id: row.id },
        onEvent,
      );
      writeRow(stub(row.id, reason), index + 1);
    }
  };

  try {
    for (let index = 0; index < rows.length; index++) {
      const row = rows[index]!;
      appendSuiteEvent(
        artifactDir,
        { v: 1, event: "row.start", index: index + 1, total: rows.length, id: row.id },
        onEvent,
      );
      let result: SuiteRowResult;
      const unbindActs = bindMatrixActStream({
        device,
        artifactDir,
        index: index + 1,
        total: rows.length,
        id: row.id,
        onEvent,
        enabled: matrixActsEnabled(options.streamActs as boolean | undefined),
      });
      try {
        if (row.stub || !row.run) {
          result = stub(row.id);
        } else if (launchError || !device) {
          result = {
            id: row.id,
            ok: false,
            status: "infra",
            steps: [],
            failureKind: "infra",
            error: runError ?? "iOS device session missing",
          };
        } else {
          result = await row.run(device);
        }
      } catch (error) {
        const failureKind = classifyAgentDeviceFailure(error);
        result = {
          id: row.id,
          ok: false,
          status:
            failureKind === "infra"
              ? "infra"
              : failureKind === "operator"
                ? "operator"
                : "red",
          steps: [],
          failureKind,
          error: String(error),
        };
      } finally {
        unbindActs();
      }
      writeRow(result, index + 1);
      if (
        options.failFast !== false &&
        !result.ok &&
        result.status !== "stub" &&
        result.status !== "os-limit"
      ) {
        aborted = true;
        skipRemaining(index + 1, "skipped after fail-fast abort");
        break;
      }
    }
  } finally {
    try {
      await device?.close();
    } catch (error) {
      aborted = true;
      runError = `device cleanup failed: ${String(error)}`;
      appendSuiteEvent(
        artifactDir,
        { v: 1, event: "matrix.cleanup-error", error: runError },
        onEvent,
      );
    }
  }
  const claimState = buildClaimState(results);
  appendSuiteEvent(
    artifactDir,
    {
      v: 1,
      event: "matrix.end",
      aborted: aborted || undefined,
      error: runError,
      artifactDir,
    },
    onEvent,
  );
  return {
    results,
    claimState,
    artifactDir,
    aborted: aborted || undefined,
    runError,
  };
}

export function createMatrixReporter() {
  return {
    onEvent(event: SuiteMatrixEvent) {
      if (event.event === "row.end") {
        process.stderr.write(`${String(event.id)}: ${String(event.status)}\n`);
      }
    },
  };
}

export function formatMatrixSummary(input: {
  results: SuiteRowResult[];
  artifactDir: string;
  aborted?: boolean;
  claimState?: unknown;
}, _options?: { mustIds?: string[] }) {
  const lines = input.results.map(
    (result) => `${result.ok ? "PASS" : "FAIL"}  ${result.id}: ${result.status}`,
  );
  lines.push(`\nArtifacts: ${input.artifactDir}`);
  if (input.aborted) lines.push("Matrix aborted after hard failure");
  return lines.join("\n");
}
