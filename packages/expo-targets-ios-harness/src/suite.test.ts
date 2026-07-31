import { describe, expect, test } from 'bun:test';

import { SUITES } from './constants';
import {
  imessageSurfaceMatrix,
  messagesMatrix,
  resolveMatrixEntry,
  shareSheetMatrix,
  stickersMatrix,
  suiteIdForExample,
} from './matrix';

describe('SUITES schema', () => {
  test('bounds three suite kinds only', () => {
    expect(Object.keys(SUITES).sort()).toEqual([
      'messages',
      'share-sheet',
      'stickers',
    ]);
  });

  test('share-sheet keeps ExpoTargetsShareSheetUITests name', () => {
    expect(SUITES['share-sheet'].uiTestTargetName).toBe(
      'ExpoTargetsShareSheetUITests'
    );
    expect(SUITES['share-sheet'].activation).toBe('share-sheet');
  });

  test('messages and stickers use MobileSMS activation', () => {
    expect(SUITES.messages.activation).toBe('mobile-sms-drawer');
    expect(SUITES.stickers.activation).toBe('mobile-sms-drawer');
    expect(SUITES.messages.proofBar).toBe('ag-handoff');
    expect(SUITES.stickers.proofBar).toBe('pack-interact');
  });
});

describe('matrix suite wiring', () => {
  test('share examples map to share-sheet suite', () => {
    for (const rel of shareSheetMatrix()) {
      expect(suiteIdForExample(rel)).toBe('share-sheet');
      expect(resolveMatrixEntry(rel).uiTestTargetName).toBe(
        'ExpoTargetsShareSheetUITests'
      );
    }
  });

  test('messages matrix entry', () => {
    expect(messagesMatrix()).toEqual(['examples/messages']);
    const entry = resolveMatrixEntry('examples/messages');
    expect(entry.suiteId).toBe('messages');
    expect(entry.scheme).toBe('ETMessages');
    expect(entry.uiTestTargetName).toBe('ExpoTargetsMessagesUITests');
    expect(entry.env.UITEST_PAYLOAD_MARKER).toBe('Hello from expo-targets');
    expect(entry.env.UITEST_EXTENSION_NAME).toBe('Example Messages');
  });

  test('stickers matrix entry', () => {
    expect(stickersMatrix()).toEqual(['examples/stickers']);
    const entry = resolveMatrixEntry('examples/stickers');
    expect(entry.suiteId).toBe('stickers');
    expect(entry.uiTestTargetName).toBe('ExpoTargetsStickersUITests');
    expect(entry.env.UITEST_PACK_NAME).toBe('Fun Stickers');
  });

  test('imessage-surface is messages then stickers orchestration', () => {
    expect(imessageSurfaceMatrix()).toEqual([
      'examples/messages',
      'examples/stickers',
    ]);
  });
});
