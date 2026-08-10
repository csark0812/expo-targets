import type { ExtensionType, UiMode } from '../config';

export type { UiMode };

const WIDGET_SANDBOX_TYPES = new Set<ExtensionType>(['widget', 'watch-widget']);

/**
 * Resolve effective UI mode from target config.
 *
 * - `widget` / `watch-widget` + `entry` ⇒ `expo-ui` (RN illegal in WidgetKit).
 * - Explicit `ui` wins when set (except widget+react-native — caller/doctor rejects).
 * - Share-class + `entry` defaults to `react-native`.
 * - No `entry` ⇒ `native`.
 */
export function resolveUiMode(config: {
  type?: string;
  entry?: string;
  ui?: UiMode;
}): UiMode {
  const type = (config.type ?? '') as ExtensionType;
  const hasEntry = Boolean(config.entry?.trim());

  if (WIDGET_SANDBOX_TYPES.has(type)) {
    if (config.ui === 'react-native') {
      return 'react-native'; // illegal — doctor errors
    }
    if (hasEntry || config.ui === 'expo-ui') {
      return 'expo-ui';
    }
    return 'native';
  }

  if (config.ui) {
    return config.ui;
  }

  if (hasEntry) {
    return 'react-native';
  }

  return 'native';
}

export function isIllegalUiMode(config: {
  type?: string;
  entry?: string;
  ui?: UiMode;
}): string | null {
  const type = (config.type ?? '') as ExtensionType;
  const mode = resolveUiMode(config);
  const hasEntry = Boolean(config.entry?.trim());

  if (WIDGET_SANDBOX_TYPES.has(type) && mode === 'react-native') {
    return `Target type "${type}" cannot use ui/react-native (WidgetKit memory). Use native deepen or entry for expo-ui.`;
  }

  if (mode === 'expo-ui' && !hasEntry && !WIDGET_SANDBOX_TYPES.has(type)) {
    return `ui: 'expo-ui' requires an entry (Host-in-RN).`;
  }

  if (mode === 'react-native' && !hasEntry) {
    return `ui: 'react-native' requires an entry.`;
  }

  if (config.ui === 'native' && hasEntry && !WIDGET_SANDBOX_TYPES.has(type)) {
    return `ui: 'native' conflicts with entry — omit entry or set ui to 'react-native' / 'expo-ui'.`;
  }

  return null;
}
