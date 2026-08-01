import { describe, expect, test } from 'bun:test';
import {
  REQUIRED_V1,
  REQUIRED_V1_PHASE1,
  REQUIRED_V1_PHASE2,
  REQUIRED_V1_PHASE3,
} from './required';

describe('REQUIRED_V1', () => {
  test('frozen path set', () => {
    expect(REQUIRED_V1.map((r) => r.path)).toEqual([
      'examples/share',
      'examples/action',
      'examples/native/share',
      'examples/native/action',
      'examples/messages',
      'examples/stickers',
      'examples/clip',
      'examples/widgets',
    ]);
  });

  test('phase partitions cover REQUIRED_V1', () => {
    expect([
      ...REQUIRED_V1_PHASE1,
      ...REQUIRED_V1_PHASE2,
      ...REQUIRED_V1_PHASE3,
    ]).toEqual([...REQUIRED_V1]);
  });
});
