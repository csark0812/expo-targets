/**
 * Consumer journey helpers — DW suite a11y + C1 ids.
 * Compat: waitForNamed(device, names, timeoutMs) still works.
 */
import type { DeviceSession } from '@csark0812/devicewright';
import type { AccessibilityNode } from '@csark0812/devicewright';
import {
  assertPayloadContains as assertPayloadContainsSuite,
  findNamedNode as findNamedNodeSuite,
  findSheetRow,
  flattenLabels,
  sleep,
  tapCenter,
  tapId as tapIdSuite,
  waitForId as waitForIdSuite,
  waitForNamed as waitForNamedSuite,
} from '@csark0812/devicewright/suite';
import { BLOCKED_SHEET_LABELS } from '../catalog';

export {
  flattenLabels,
  sleep,
  tapCenter,
  findSheetRow,
};

export function findNamedNode(
  nodes: AccessibilityNode[],
  names: string[]
): AccessibilityNode | undefined {
  return findNamedNodeSuite(nodes, names, BLOCKED_SHEET_LABELS);
}

export async function waitForNamed(
  device: DeviceSession,
  names: string[],
  timeoutMsOrOpts: number | { timeoutMs?: number } = 15_000
): Promise<AccessibilityNode> {
  const timeoutMs =
    typeof timeoutMsOrOpts === 'number'
      ? timeoutMsOrOpts
      : timeoutMsOrOpts.timeoutMs ?? 15_000;
  return waitForNamedSuite(device, names, {
    timeoutMs,
    blockedLabels: BLOCKED_SHEET_LABELS,
  });
}

export async function waitForId(
  device: DeviceSession,
  id: string,
  timeoutMs = 15_000
): Promise<AccessibilityNode> {
  return waitForIdSuite(device, id, timeoutMs);
}

export async function tapId(
  device: DeviceSession,
  id: string,
  timeoutMs = 15_000
): Promise<void> {
  return tapIdSuite(device, id, timeoutMs);
}

export async function assertPayloadContains(
  device: DeviceSession,
  payloadId: string,
  marker: string,
  timeoutMs = 25_000
): Promise<void> {
  return assertPayloadContainsSuite(device, payloadId, marker, timeoutMs);
}

export const C1 = {
  triggerFromHost: 'c1-1-trigger-from-host',
  findExtensionRow: 'c1-2-find-extension-row',
  completeAppex: 'c1-3-complete-appex',
  assertHostMarker: 'c1-4-assert-host-marker',
  releasePreflight: 'c1-5-release-preflight',
  matrixFailFast: 'c1-6-matrix-fail-fast',
} as const;
