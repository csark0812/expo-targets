import type { RuntimeTargetConfig } from './collectRuntimeConfigs';

/** Gallery kind names for ambient WidgetKindName codegen. */
export function widgetKindNamesForCodegen(
  cfg: Pick<RuntimeTargetConfig, 'name' | 'ios'>
): string[] {
  const kinds = (cfg.ios?.kinds ?? []).filter((kind) => kind.name);
  if (kinds.length > 0) {
    return kinds.map((kind) => kind.name!);
  }
  return cfg.name ? [cfg.name] : [];
}
