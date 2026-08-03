import { isReactNativeNative } from '../../domain';
import type { BundleReactNativePlan, IOSTargetProps } from './types';

/**
 * Plan an Xcode shell phase that runs Expo `export:embed` for this target's
 * entry file so Release builds ship `main.jsbundle` inside the appex/clip.
 */
export function planBundleReactNative(
  props: IOSTargetProps
): BundleReactNativePlan | undefined {
  if (!props.entry) {
    return;
  }
  if (!isReactNativeNative(props.type)) {
    return;
  }

  return {
    entryFile: props.entry.replace(/^\.\//, ''),
  };
}
