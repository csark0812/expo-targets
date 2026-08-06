import { describe, expect, test } from 'bun:test';

import {
  getReactNativeTemplate,
  isReactNativeCapableType,
} from './reactNativeTemplate';

describe('getReactNativeTemplate', () => {
  test('emits createTarget with typed generic', () => {
    const src = getReactNativeTemplate('share', 'MyShare');
    expect(src).toContain("createTarget<'share'>('MyShare', MyShare)");
    expect(src).toContain('export const myShare');
    expect(src).not.toContain('AppRegistry');
  });

  test('supports safari and messages', () => {
    expect(getReactNativeTemplate('safari', 'Popup')).toContain(
      "createTarget<'safari'>"
    );
    expect(getReactNativeTemplate('messages', 'Chat')).toContain(
      "createTarget<'messages'>"
    );
  });
});

describe('isReactNativeCapableType', () => {
  test('covers RN-capable extension types', () => {
    expect(isReactNativeCapableType('share')).toBe(true);
    expect(isReactNativeCapableType('messages')).toBe(true);
    expect(isReactNativeCapableType('safari')).toBe(true);
    expect(isReactNativeCapableType('widget')).toBe(false);
  });
});
