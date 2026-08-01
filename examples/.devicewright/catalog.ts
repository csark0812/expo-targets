/**
 * Host/extension contracts for REQUIRED_V1 journeys.
 * Bundle IDs / markers mirror ios-harness matrix defaults.
 */

export type TargetCatalogEntry = {
  id: string;
  path: string;
  hostBundleId: string;
  hostDisplayName: string;
  extensionName: string;
  extensionAliases: string[];
  payloadMarker: string;
  readyText?: string;
  completeButton: string;
  /** Expand share-sheet action list before looking for the row. */
  needsViewMore?: boolean;
  /** Host testIDs expected for C1 / A bars. */
  testIds: {
    screenRoot: string;
    openShareSheet?: string;
    clearPayload: string;
    refresh?: string;
    lastPayload: string;
    packCatalog?: string;
  };
};

const SHARE_TEST_IDS = {
  screenRoot: 'screen-root',
  openShareSheet: 'btn-open-share-sheet',
  clearPayload: 'btn-clear-payload',
  refresh: 'btn-refresh',
  lastPayload: 'text-last-payload',
} as const;

export const TARGET_CATALOG: Record<string, TargetCatalogEntry> = {
  share: {
    id: 'share',
    path: 'examples/share',
    hostBundleId: 'com.expotargets.example.share',
    hostDisplayName: 'ET Share',
    extensionName: 'ET Share',
    extensionAliases: ['ExampleShareTarget', 'Example Share', 'Share'],
    payloadMarker: 'expo-targets uitest share payload',
    readyText: 'expo-targets uitest share payload',
    completeButton: 'Save',
    testIds: { ...SHARE_TEST_IDS },
  },
  action: {
    id: 'action',
    path: 'examples/action',
    hostBundleId: 'com.expotargets.example.action',
    hostDisplayName: 'ET Action',
    extensionName: 'Example Action',
    extensionAliases: ['ExampleActionTarget', 'ET Action'],
    payloadMarker: 'grayscale',
    readyText: 'Images: 1',
    completeButton: 'Process',
    needsViewMore: true,
    testIds: { ...SHARE_TEST_IDS },
  },
  'native-share': {
    id: 'native-share',
    path: 'examples/native/share',
    hostBundleId: 'com.expotargets.example.native.share',
    hostDisplayName: 'ET N Share',
    extensionName: 'ET N Share',
    extensionAliases: ['NativeShareTarget', 'Native Share'],
    payloadMarker: 'expo-targets uitest share payload',
    readyText: 'expo-targets uitest share payload',
    completeButton: 'Save to App',
    testIds: { ...SHARE_TEST_IDS },
  },
  'native-action': {
    id: 'native-action',
    path: 'examples/native/action',
    hostBundleId: 'com.expotargets.example.native.action',
    hostDisplayName: 'ET N Action',
    extensionName: 'Native Action',
    extensionAliases: ['NativeActionTarget', 'ET N Action'],
    payloadMarker: 'Original',
    readyText: 'Original',
    completeButton: 'Process Image',
    needsViewMore: true,
    testIds: { ...SHARE_TEST_IDS },
  },
  messages: {
    id: 'messages',
    path: 'examples/messages',
    hostBundleId: 'com.expotargets.example.messages',
    hostDisplayName: 'ET Messages',
    extensionName: 'Example Messages',
    extensionAliases: ['ExampleMessagesTarget', 'ET Messages'],
    payloadMarker: 'Hello from expo-targets',
    completeButton: 'Send template',
    testIds: {
      screenRoot: 'screen-root',
      clearPayload: 'btn-clear-payload',
      refresh: 'btn-refresh',
      lastPayload: 'text-last-payload',
    },
  },
  stickers: {
    id: 'stickers',
    path: 'examples/stickers',
    hostBundleId: 'com.expotargets.example.stickers',
    hostDisplayName: 'ET Stickers',
    extensionName: 'Fun Stickers',
    extensionAliases: ['FunStickersTarget', 'Fun Stickers'],
    /** Honest pack catalog marker (asset-only packs cannot App-Group on selection). */
    payloadMarker: 'pack: Fun Stickers (brutus, happy, excited)',
    completeButton: '',
    testIds: {
      screenRoot: 'screen-root',
      clearPayload: 'btn-clear-payload',
      lastPayload: 'text-last-payload',
      packCatalog: 'status-pack-catalog',
    },
  },
  clip: {
    id: 'clip',
    path: 'examples/clip',
    hostBundleId: 'com.expotargets.example.clip',
    hostDisplayName: 'ET Clip',
    extensionName: 'Clip',
    extensionAliases: [],
    payloadMarker: 'itemName',
    completeButton: '',
    testIds: {
      screenRoot: 'screen-root',
      clearPayload: 'btn-clear-payload',
      lastPayload: 'text-last-payload',
    },
  },
  widgets: {
    id: 'widgets',
    path: 'examples/widgets',
    hostBundleId: 'com.expotargets.example.widgets',
    hostDisplayName: 'ET Widgets',
    extensionName: 'Hello Widget',
    extensionAliases: [],
    payloadMarker: 'Hello from host',
    completeButton: '',
    testIds: {
      screenRoot: 'screen-root',
      clearPayload: 'btn-clear-payload',
      lastPayload: 'text-last-payload',
    },
  },
};

/** System Share Sheet rows we must never tap (mirrors ShareSheetSmoke). */
export const BLOCKED_SHEET_LABELS = new Set([
  'Create Watch Face',
  'Watch Face',
  'Print',
  'Copy',
  'Save Image',
  'Save to Files',
  'Assign to Contact',
  'Add to Shared Album',
  'Edit Actions',
  // Note: View More / More are expanded intentionally via point-probe — not blocked there.
  'Apps',
  'Close',
  'Cancel',
]);
