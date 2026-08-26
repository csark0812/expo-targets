import type { TargetConfig } from '../plugin/src/config';
import { hasExplicitGalleryKinds } from '../plugin/src/ios/utils/resolveIosKinds';

export type HostProductRole = 'folder' | 'kind' | 'provider';

export interface ResolvedHostProduct {
  config: TargetConfig;
  /** String passed to storage / WidgetKit kind / provider identity. */
  productName: string;
  role: HostProductRole;
}

function widgetKindRows(config: TargetConfig): { name: string }[] {
  return (config.ios?.kinds ?? []).filter((kind) => kind.name);
}

function androidProviderRows(config: TargetConfig): { name: string }[] {
  return (config.android?.providers ?? []).filter((row) => row.name);
}

function resolveKindProduct(
  name: string,
  targets: TargetConfig[]
): ResolvedHostProduct | null {
  for (const target of targets) {
    if (target.type !== 'widget' && target.type !== 'watch-widget') {
      continue;
    }
    if (widgetKindRows(target).some((kind) => kind.name === name)) {
      return { config: target, productName: name, role: 'kind' };
    }
  }
  return null;
}

function resolveProviderProduct(
  name: string,
  targets: TargetConfig[]
): ResolvedHostProduct | null {
  for (const target of targets) {
    if (target.type !== 'widget') {
      continue;
    }
    if (androidProviderRows(target).some((row) => row.name === name)) {
      return { config: target, productName: name, role: 'provider' };
    }
  }
  return null;
}

/**
 * True when the folder groups multiple host-addressable widget products
 * (explicit ios.kinds and/or android.providers), not a 1:1 folder.
 */
export function isMultiProductWidgetFolder(config: TargetConfig): boolean {
  if (config.type !== 'widget' && config.type !== 'watch-widget') {
    return false;
  }

  const kinds = widgetKindRows(config);
  if (kinds.length > 0) {
    if (kinds.length === 1 && kinds[0]!.name === config.name) {
      return false;
    }
    return true;
  }

  const providers = androidProviderRows(config);
  if (providers.length > 1) {
    return true;
  }
  if (providers.length === 1 && providers[0]!.name !== config.name) {
    return true;
  }

  return false;
}

/** Gallery kind names for a widget folder (implicit 1:1 uses folder name). */
export function galleryProductNames(config: TargetConfig): string[] {
  const kinds = widgetKindRows(config);
  if (kinds.length > 0) {
    return kinds.map((kind) => kind.name!);
  }
  const providers = androidProviderRows(config);
  if (providers.length > 0) {
    return providers.map((row) => row.name);
  }
  return config.name ? [config.name] : [];
}

export function resolveHostProduct(
  name: string,
  targets: TargetConfig[]
): ResolvedHostProduct | null {
  const folder = targets.find((target) => target.name === name);
  if (folder) {
    return { config: folder, productName: name, role: 'folder' };
  }

  return (
    resolveKindProduct(name, targets) ?? resolveProviderProduct(name, targets)
  );
}

export function formatUnknownHostProductError(
  name: string,
  targets: TargetConfig[]
): string {
  const folderNames = targets.map((t) => t.name).filter(Boolean);
  const kindNames: string[] = [];
  for (const target of targets) {
    if (target.type === 'widget' || target.type === 'watch-widget') {
      kindNames.push(...galleryProductNames(target));
    }
  }
  const uniqueKinds = [...new Set(kindNames)].sort();
  const hint =
    uniqueKinds.length > 0 ? ` Widget kinds: ${uniqueKinds.join(', ')}.` : '';
  return (
    `Target "${name}" not found. Ensure it's defined in app.json under "extra.targets".` +
    ` Configured folders: ${folderNames.join(', ') || '(none)'}.${hint}`
  );
}

/** Used by doctor / tooling parity with runtime gallery rows. */
export function folderHasExplicitGalleryKinds(config: TargetConfig): boolean {
  return hasExplicitGalleryKinds(config.ios);
}
