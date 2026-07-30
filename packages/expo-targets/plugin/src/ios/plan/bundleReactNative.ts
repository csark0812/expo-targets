import type { ExtensionType } from '../../config';
import type { BundleReactNativePlan, IOSTargetProps } from './types';

/** Extension types that host a React Native JS entry in the product bundle. */
const REACT_NATIVE_ENTRY_TYPES = new Set<ExtensionType>([
  'share',
  'action',
  'clip',
  'messages',
]);

/**
 * Plan an Xcode shell phase that runs Expo `export:embed` for this target's
 * entry file so Release builds ship `main.jsbundle` inside the appex/clip.
 */
export function planBundleReactNative(
  props: IOSTargetProps
): BundleReactNativePlan | undefined {
  if (!props.entry) {
    return undefined;
  }
  if (!REACT_NATIVE_ENTRY_TYPES.has(props.type)) {
    return undefined;
  }

  return {
    entryFile: props.entry.replace(/^\.\//, ''),
  };
}
