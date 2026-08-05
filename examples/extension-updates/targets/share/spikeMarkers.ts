/**
 * Spike markers for host vs share vs OTA.
 *
 * - OTA_LABEL (otaLabel.ts): bump + export-extension-bundles + eas update
 * - EXPO_PUBLIC_SPIKE_TAG: inlined per bundle at export time — host `eas update`
 *   and extension Hermes export can diverge if env changes between the two
 * - Image `require('../assets/spike.png')`: works from Metro / Xcode embed;
 *   App Group sideload today installs only main.jsbundle (images next to that
 *   URL are missing after OTA)
 * - System font (Menlo): no asset file — should work in appex without sideload
 */

export const SPIKE_ENV_TAG =
  process.env.EXPO_PUBLIC_SPIKE_TAG ?? '(env unset)';
