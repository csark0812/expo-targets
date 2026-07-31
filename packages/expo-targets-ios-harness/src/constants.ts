/** Machine-local default: iPhone Air on this developer's Mac. */
export const DEFAULT_SIM_UDID = '0E7FA53F-23B3-4F10-BAE1-AED7515401B2';

/** Bound suite kinds: Share Sheet + MobileSMS only (not all Apple hosts). */
export type SuiteId = 'share-sheet' | 'messages' | 'stickers';

export type Activation = 'share-sheet' | 'mobile-sms-drawer';

export type ProofBar = 'share-sheet-ag' | 'ag-handoff' | 'pack-interact';

export type SuiteConfig = {
  id: SuiteId;
  activation: Activation;
  proofBar: ProofBar;
  uiTestTargetName: string;
  smokeFileName: string;
};

export const SUITES: Record<SuiteId, SuiteConfig> = {
  'share-sheet': {
    id: 'share-sheet',
    activation: 'share-sheet',
    proofBar: 'share-sheet-ag',
    uiTestTargetName: 'ExpoTargetsShareSheetUITests',
    smokeFileName: 'ShareSheetSmoke.swift',
  },
  messages: {
    id: 'messages',
    activation: 'mobile-sms-drawer',
    proofBar: 'ag-handoff',
    uiTestTargetName: 'ExpoTargetsMessagesUITests',
    smokeFileName: 'MessagesSmoke.swift',
  },
  stickers: {
    id: 'stickers',
    activation: 'mobile-sms-drawer',
    proofBar: 'pack-interact',
    uiTestTargetName: 'ExpoTargetsStickersUITests',
    smokeFileName: 'StickersSmoke.swift',
  },
};

/** Backward-compat alias for Share Sheet suite. */
export const UITEST_TARGET_NAME = SUITES['share-sheet'].uiTestTargetName;
export const SMOKE_FILE_NAME = SUITES['share-sheet'].smokeFileName;

export const UITEST_ENV_KEYS = [
  'UITEST_HOST_BUNDLE_ID',
  'UITEST_HOST_DISPLAY_NAME',
  'UITEST_EXTENSION_NAME',
  'UITEST_EXTENSION_BUNDLE_ID',
  'UITEST_EXTENSION_ALIASES',
  'UITEST_PAYLOAD_MARKER',
  'UITEST_READY_TEXT',
  'UITEST_COMPLETE_BUTTON',
  'UITEST_SEND_BUTTON',
  'UITEST_CONVERSATION',
  'UITEST_PACK_NAME',
] as const;

export type UitestEnvKey = (typeof UITEST_ENV_KEYS)[number];

export const UI_TESTING_PRODUCT_TYPE =
  'com.apple.product-type.bundle.ui-testing';
export const APPLICATION_PRODUCT_TYPE = 'com.apple.product-type.application';
