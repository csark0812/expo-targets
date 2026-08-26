import type { RuntimeTargetConfig } from './collectRuntimeConfigs';

function widgetKindRows(ios?: RuntimeTargetConfig['ios']): { name: string }[] {
  return (ios?.kinds ?? []).filter((kind) => kind.name) as { name: string }[];
}

function androidProviderRows(
  android?: RuntimeTargetConfig['android']
): { name: string }[] {
  return (android?.providers ?? []).filter((row) => row.name) as {
    name: string;
  }[];
}

/** Mirrors runtime `isMultiProductWidgetFolder` for ambient folder-role codegen. */
export function isMultiProductWidgetFolderCodegen(
  cfg: Pick<RuntimeTargetConfig, 'name' | 'type' | 'ios' | 'android'>
): boolean {
  if (cfg.type !== 'widget' && cfg.type !== 'watch-widget') {
    return false;
  }

  const kinds = widgetKindRows(cfg.ios);
  if (kinds.length > 0) {
    if (kinds.length === 1 && kinds[0]!.name === cfg.name) {
      return false;
    }
    return true;
  }

  const providers = androidProviderRows(cfg.android);
  if (providers.length > 1) {
    return true;
  }
  if (providers.length === 1 && providers[0]!.name !== cfg.name) {
    return true;
  }

  return false;
}

/** Gallery kind names for ambient WidgetKindName codegen. */
export function widgetKindNamesForCodegen(
  cfg: Pick<RuntimeTargetConfig, 'name' | 'ios'>
): string[] {
  const kinds = widgetKindRows(cfg.ios);
  if (kinds.length > 0) {
    return kinds.map((kind) => kind.name);
  }
  return cfg.name ? [cfg.name] : [];
}
