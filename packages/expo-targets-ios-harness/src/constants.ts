/** UITest target + fixture names shared across attach / run / scheme. */
export const UITEST_TARGET_NAME = 'ExpoTargetsShareSheetUITests';
export const SMOKE_FILE_NAME = 'ShareSheetSmoke.swift';

/** Machine-local default: iPhone Air on this developer's Mac. */
export const DEFAULT_SIM_UDID = '0E7FA53F-23B3-4F10-BAE1-AED7515401B2';

export const UITEST_ENV_KEYS = [
  'UITEST_HOST_BUNDLE_ID',
  'UITEST_HOST_DISPLAY_NAME',
  'UITEST_EXTENSION_NAME',
  'UITEST_EXTENSION_BUNDLE_ID',
  'UITEST_EXTENSION_ALIASES',
  'UITEST_PAYLOAD_MARKER',
  'UITEST_READY_TEXT',
  'UITEST_COMPLETE_BUTTON',
] as const;

export type UitestEnvKey = (typeof UITEST_ENV_KEYS)[number];

export const UI_TESTING_PRODUCT_TYPE =
  'com.apple.product-type.bundle.ui-testing';
export const APPLICATION_PRODUCT_TYPE = 'com.apple.product-type.application';
