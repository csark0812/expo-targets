import Constants from 'expo-constants';
import type { ExtensionType, TargetConfig } from '../../plugin/src/config';
import { getTargetsConfigFromBundle } from './storage/index';

export function listTargets(): TargetConfig[] {
  const expoConfig = Constants.expoConfig;
  let targets = (expoConfig?.extra?.targets as TargetConfig[]) || [];
  if (targets.length === 0) {
    const bundleTargets = getTargetsConfigFromBundle();
    if (bundleTargets) {
      targets = bundleTargets as TargetConfig[];
    }
  }
  return targets;
}

export function findTargetsByType(type: ExtensionType): TargetConfig[] {
  return listTargets().filter((t) => t.type === type);
}

export function resolveUniqueTarget(
  type: ExtensionType,
  targetName?: string
): TargetConfig {
  const ofType = findTargetsByType(type);
  if (targetName) {
    const match = ofType.find((t) => t.name === targetName);
    if (!match) {
      const names = ofType.map((t) => t.name).join(', ') || '(none)';
      throw new Error(
        `[expo-targets] No ${type} target named "${targetName}". Available: ${names}`
      );
    }
    return match;
  }
  if (ofType.length === 0) {
    throw new Error(
      `[expo-targets] No ${type} target configured. Add one under targets/*/expo-target.config.json.`
    );
  }
  if (ofType.length > 1) {
    const names = ofType.map((t) => t.name).join(', ');
    throw new Error(
      `[expo-targets] Multiple ${type} targets found (${names}). Pass targetName to disambiguate.`
    );
  }
  return ofType[0];
}

export function assertMatchesConfig(
  label: string,
  expected: string,
  actual: string | undefined
): void {
  if (actual === undefined) {
    return;
  }
  if (actual !== expected) {
    throw new Error(
      `[expo-targets] Strict CNG: ${label} mismatch. ` +
        `config="${expected}" argument="${actual}". ` +
        `Update expo-target.config.json (config is authoritative).`
    );
  }
}
