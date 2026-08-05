import type { CheckResult, ProjectContext } from '../types';

function hasExpoTargetsPlugin(plugins: unknown[]): boolean {
  return plugins.some((plugin) => {
    if (plugin === 'expo-targets') {
      return true;
    }
    return Array.isArray(plugin) && plugin[0] === 'expo-targets';
  });
}

export function checkPlugin(ctx: ProjectContext): CheckResult | null {
  if (hasExpoTargetsPlugin(ctx.plugins)) {
    return null;
  }

  return {
    ok: false,
    level: 'error',
    title: 'Expo plugin',
    message: 'expo-targets is missing from app config plugins',
    fix:
      'Add to app.json:\n' +
      '  "plugins": ["expo-targets"]\n' +
      'Or run: npx create-expo-target (auto-wires host)',
  };
}
