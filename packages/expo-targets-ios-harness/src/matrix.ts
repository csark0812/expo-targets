import process from 'node:process';
import type { UitestEnvKey } from './constants';

export type ExampleRel =
  | 'examples/share'
  | 'examples/action'
  | 'examples/native/share'
  | 'examples/native/action';

export type MatrixEntry = {
  exampleRel: ExampleRel;
  scheme: string;
  workspaceGlob: string;
  env: Record<UitestEnvKey, string>;
};

type EnvDefaults = Record<UitestEnvKey, string>;

const SHARE_SHEET_EXAMPLES: ExampleRel[] = [
  'examples/share',
  'examples/action',
  'examples/native/share',
  'examples/native/action',
];

const DEFAULTS: Record<ExampleRel, EnvDefaults> = {
  'examples/share': {
    UITEST_HOST_BUNDLE_ID: 'com.expotargets.example.share',
    UITEST_HOST_DISPLAY_NAME: 'ET Share',
    UITEST_EXTENSION_NAME: 'ET Share',
    UITEST_EXTENSION_ALIASES: 'ExampleShareTarget,Example Share,Share',
    UITEST_EXTENSION_BUNDLE_ID: 'com.expotargets.example.share.share',
    UITEST_PAYLOAD_MARKER: 'expo-targets uitest share payload',
    UITEST_READY_TEXT: 'expo-targets uitest share payload',
    UITEST_COMPLETE_BUTTON: 'Save',
  },
  'examples/action': {
    UITEST_HOST_BUNDLE_ID: 'com.expotargets.example.action',
    UITEST_HOST_DISPLAY_NAME: 'ET Action',
    UITEST_EXTENSION_NAME: 'Example Action',
    UITEST_EXTENSION_ALIASES: 'ExampleActionTarget,ET Action',
    UITEST_EXTENSION_BUNDLE_ID: 'com.expotargets.example.action.action',
    UITEST_PAYLOAD_MARKER: 'grayscale',
    UITEST_READY_TEXT: 'Images: 1',
    UITEST_COMPLETE_BUTTON: 'Process',
  },
  'examples/native/share': {
    UITEST_HOST_BUNDLE_ID: 'com.expotargets.example.native.share',
    UITEST_HOST_DISPLAY_NAME: 'ET N Share',
    UITEST_EXTENSION_NAME: 'ET N Share',
    UITEST_EXTENSION_ALIASES: 'NativeShareTarget,Native Share',
    UITEST_EXTENSION_BUNDLE_ID: 'com.expotargets.example.native.share.share',
    UITEST_PAYLOAD_MARKER: 'expo-targets uitest share payload',
    UITEST_READY_TEXT: 'expo-targets uitest share payload',
    UITEST_COMPLETE_BUTTON: 'Save to App',
  },
  'examples/native/action': {
    UITEST_HOST_BUNDLE_ID: 'com.expotargets.example.native.action',
    UITEST_HOST_DISPLAY_NAME: 'ET N Action',
    UITEST_EXTENSION_NAME: 'Native Action',
    UITEST_EXTENSION_ALIASES: 'NativeActionTarget,ET N Action',
    UITEST_EXTENSION_BUNDLE_ID: 'com.expotargets.example.native.action.action',
    UITEST_PAYLOAD_MARKER: 'Original',
    UITEST_READY_TEXT: 'Original',
    UITEST_COMPLETE_BUTTON: 'Process Image',
  },
};

const SCHEMES: Record<ExampleRel, string> = {
  'examples/share': 'ETShare',
  'examples/action': 'ETAction',
  'examples/native/share': 'ETNShare',
  'examples/native/action': 'ETNAction',
};

function applyOverrides(defaults: EnvDefaults): EnvDefaults {
  const env = { ...defaults };
  for (const key of Object.keys(defaults) as UitestEnvKey[]) {
    const override = process.env[`${key}_OVERRIDE`];
    if (override !== undefined && override !== '') {
      env[key] = override;
    }
  }
  return env;
}

export function isExampleRel(value: string): value is ExampleRel {
  return (SHARE_SHEET_EXAMPLES as string[]).includes(value);
}

export function shareSheetMatrix(): ExampleRel[] {
  return [...SHARE_SHEET_EXAMPLES];
}

export function resolveMatrixEntry(exampleRel: ExampleRel): MatrixEntry {
  return {
    exampleRel,
    scheme: SCHEMES[exampleRel],
    workspaceGlob: 'ios/*.xcworkspace',
    env: applyOverrides(DEFAULTS[exampleRel]),
  };
}

export function resolveMatrixEntries(
  exampleRels: ExampleRel[] = SHARE_SHEET_EXAMPLES
): MatrixEntry[] {
  return exampleRels.map(resolveMatrixEntry);
}
