import process from "node:process";

import {
  SUITES,
  type SuiteId,
  UITEST_ENV_KEYS,
  type UitestEnvKey,
} from "./constants";

export type ExampleRel =
  | "examples/share"
  | "examples/action"
  | "examples/native/share"
  | "examples/native/action"
  | "examples/messages"
  | "examples/stickers";

export type MatrixEntry = {
  exampleRel: ExampleRel;
  suiteId: SuiteId;
  scheme: string;
  workspaceGlob: string;
  env: Partial<Record<UitestEnvKey, string>>;
  uiTestTargetName: string;
  smokeFileName: string;
};

type EnvDefaults = Partial<Record<UitestEnvKey, string>>;

const SHARE_SHEET_EXAMPLES: ExampleRel[] = [
  "examples/share",
  "examples/action",
  "examples/native/share",
  "examples/native/action",
];

const MESSAGES_EXAMPLES: ExampleRel[] = ["examples/messages"];
const STICKERS_EXAMPLES: ExampleRel[] = ["examples/stickers"];

const ALL_EXAMPLES: ExampleRel[] = [
  ...SHARE_SHEET_EXAMPLES,
  ...MESSAGES_EXAMPLES,
  ...STICKERS_EXAMPLES,
];

const SUITE_BY_EXAMPLE: Record<ExampleRel, SuiteId> = {
  "examples/share": "share-sheet",
  "examples/action": "share-sheet",
  "examples/native/share": "share-sheet",
  "examples/native/action": "share-sheet",
  "examples/messages": "messages",
  "examples/stickers": "stickers",
};

const DEFAULTS: Record<ExampleRel, EnvDefaults> = {
  "examples/share": {
    UITEST_HOST_BUNDLE_ID: "com.expotargets.example.share",
    UITEST_HOST_DISPLAY_NAME: "ET Share",
    UITEST_EXTENSION_NAME: "ET Share",
    UITEST_EXTENSION_ALIASES: "ExampleShareTarget,Example Share,Share",
    UITEST_EXTENSION_BUNDLE_ID: "com.expotargets.example.share.share",
    UITEST_PAYLOAD_MARKER: "expo-targets uitest share payload",
    UITEST_READY_TEXT: "expo-targets uitest share payload",
    UITEST_COMPLETE_BUTTON: "Save",
  },
  "examples/action": {
    UITEST_HOST_BUNDLE_ID: "com.expotargets.example.action",
    UITEST_HOST_DISPLAY_NAME: "ET Action",
    UITEST_EXTENSION_NAME: "Example Action",
    UITEST_EXTENSION_ALIASES: "ExampleActionTarget,ET Action",
    UITEST_EXTENSION_BUNDLE_ID: "com.expotargets.example.action.action",
    UITEST_PAYLOAD_MARKER: "grayscale",
    UITEST_READY_TEXT: "Images: 1",
    UITEST_COMPLETE_BUTTON: "Process",
  },
  "examples/native/share": {
    UITEST_HOST_BUNDLE_ID: "com.expotargets.example.native.share",
    UITEST_HOST_DISPLAY_NAME: "ET N Share",
    UITEST_EXTENSION_NAME: "ET N Share",
    UITEST_EXTENSION_ALIASES: "NativeShareTarget,Native Share",
    UITEST_EXTENSION_BUNDLE_ID: "com.expotargets.example.native.share.share",
    UITEST_PAYLOAD_MARKER: "expo-targets uitest share payload",
    UITEST_READY_TEXT: "expo-targets uitest share payload",
    UITEST_COMPLETE_BUTTON: "Save to App",
  },
  "examples/native/action": {
    UITEST_HOST_BUNDLE_ID: "com.expotargets.example.native.action",
    UITEST_HOST_DISPLAY_NAME: "ET N Action",
    UITEST_EXTENSION_NAME: "Native Action",
    UITEST_EXTENSION_ALIASES: "NativeActionTarget,ET N Action",
    UITEST_EXTENSION_BUNDLE_ID: "com.expotargets.example.native.action.action",
    UITEST_PAYLOAD_MARKER: "Original",
    UITEST_READY_TEXT: "Original",
    UITEST_COMPLETE_BUTTON: "Process Image",
  },
  "examples/messages": {
    UITEST_HOST_BUNDLE_ID: "com.expotargets.example.messages",
    UITEST_HOST_DISPLAY_NAME: "ET Messages",
    UITEST_EXTENSION_NAME: "Example Messages",
    UITEST_EXTENSION_ALIASES: "ExampleMessagesTarget",
    UITEST_PAYLOAD_MARKER: "Hello from expo-targets",
    UITEST_SEND_BUTTON: "Send template",
    UITEST_CONVERSATION: "+1 (888) 555-1212",
  },
  "examples/stickers": {
    UITEST_HOST_BUNDLE_ID: "com.expotargets.example.stickers",
    UITEST_HOST_DISPLAY_NAME: "ET Stickers",
    UITEST_PACK_NAME: "Fun Stickers",
    UITEST_EXTENSION_ALIASES: "FunStickersTarget,FunStickers",
    UITEST_CONVERSATION: "+1 (888) 555-1212",
  },
};

const SCHEMES: Record<ExampleRel, string> = {
  "examples/share": "ETShare",
  "examples/action": "ETAction",
  "examples/native/share": "ETNShare",
  "examples/native/action": "ETNAction",
  "examples/messages": "ETMessages",
  "examples/stickers": "ETStickers",
};

function applyOverrides(defaults: EnvDefaults): EnvDefaults {
  const env = { ...defaults };
  for (const key of UITEST_ENV_KEYS) {
    const override = process.env[`${key}_OVERRIDE`];
    if (override !== undefined && override !== "") {
      env[key] = override;
    }
  }
  return env;
}

export function isExampleRel(value: string): value is ExampleRel {
  return (ALL_EXAMPLES as string[]).includes(value);
}

export function shareSheetMatrix(): ExampleRel[] {
  return [...SHARE_SHEET_EXAMPLES];
}

export function messagesMatrix(): ExampleRel[] {
  return [...MESSAGES_EXAMPLES];
}

export function stickersMatrix(): ExampleRel[] {
  return [...STICKERS_EXAMPLES];
}

/** Serial MobileSMS runner alias (orchestration only — asymmetric proof bars). */
export function imessageSurfaceMatrix(): ExampleRel[] {
  return [...MESSAGES_EXAMPLES, ...STICKERS_EXAMPLES];
}

export function resolveMatrixEntry(exampleRel: ExampleRel): MatrixEntry {
  const suiteId = SUITE_BY_EXAMPLE[exampleRel];
  const suite = SUITES[suiteId];
  return {
    exampleRel,
    suiteId,
    scheme: SCHEMES[exampleRel],
    workspaceGlob: "ios/*.xcworkspace",
    env: applyOverrides(DEFAULTS[exampleRel]),
    uiTestTargetName: suite.uiTestTargetName,
    smokeFileName: suite.smokeFileName,
  };
}

export function resolveMatrixEntries(
  exampleRels: ExampleRel[] = SHARE_SHEET_EXAMPLES,
): MatrixEntry[] {
  return exampleRels.map(resolveMatrixEntry);
}

export function suiteIdForExample(exampleRel: ExampleRel): SuiteId {
  return SUITE_BY_EXAMPLE[exampleRel];
}
