/** Shared accessibility match helpers for iOS/Android trees. */

import type { AccessibilityNode, FindCriteria } from './types';

function norm(value: string | undefined, caseSensitive: boolean): string {
  const v = value ?? '';
  return caseSensitive ? v : v.toLowerCase();
}

function exactMatch(
  node: AccessibilityNode,
  needle: string,
  caseSensitive: boolean
): boolean {
  return (
    norm(node.label, caseSensitive) === needle ||
    norm(node.identifier, caseSensitive) === needle
  );
}

export function matchesAccessibilityCriteria(
  node: AccessibilityNode,
  criteria: FindCriteria
): boolean {
  if (
    criteria.type &&
    (node.type ?? '').toLowerCase() !== criteria.type.toLowerCase()
  ) {
    return false;
  }
  const caseSensitive = criteria.caseSensitive === true;
  const mode = criteria.matchMode ?? 'substring';
  const hay = norm(
    `${node.label ?? ''} ${node.identifier ?? ''}`,
    caseSensitive
  );

  for (const raw of criteria.search) {
    const n = norm(raw, caseSensitive);
    if (mode === 'exact') {
      if (exactMatch(node, n, caseSensitive)) return true;
      continue;
    }
    if (hay.includes(n)) return true;
  }
  return false;
}
