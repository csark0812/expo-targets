import type { CheckResult, ProjectContext } from '../types';

function hasExpoWidgetsPlugin(plugins: unknown[]): boolean {
  return plugins.some((plugin) => {
    if (plugin === 'expo-widgets') {
      return true;
    }
    return Array.isArray(plugin) && plugin[0] === 'expo-widgets';
  });
}

function hasWidgetTargets(ctx: ProjectContext): boolean {
  return ctx.targets.some(
    (t) => t.config.platforms?.includes('ios') && t.config.type === 'widget'
  );
}

export function warnDualWidgets(ctx: ProjectContext): CheckResult[] {
  if (!(hasExpoWidgetsPlugin(ctx.plugins) && hasWidgetTargets(ctx))) {
    return [];
  }

  return [
    {
      ok: false,
      level: 'warn',
      title: 'Dual widgets',
      message:
        'Both expo-widgets plugin and expo-targets widget targets are configured',
      fix:
        'Pick one WidgetKit path — expo-targets native widgets OR expo-widgets. ' +
        'See docs/widgets.md',
    },
  ];
}
