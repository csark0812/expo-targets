import { describe, expect, test } from 'bun:test';

import { normalizeColorToComponents } from './asset';

describe('normalizeColorToComponents', () => {
  test('parses opaque black #000000 (not transparent blue)', () => {
    expect(normalizeColorToComponents('#000000')).toEqual({
      red: '0.000',
      green: '0.000',
      blue: '0.000',
      alpha: '1.000',
    });
  });

  test('parses system blue #007AFF', () => {
    expect(normalizeColorToComponents('#007AFF')).toEqual({
      red: '0.000',
      green: '0.478',
      blue: '1.000',
      alpha: '1.000',
    });
  });

  test('parses light gray background #F2F2F7', () => {
    expect(normalizeColorToComponents('#F2F2F7')).toEqual({
      red: '0.949',
      green: '0.949',
      blue: '0.969',
      alpha: '1.000',
    });
  });
});
