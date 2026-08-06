import { describe, expect, test } from 'bun:test';
import {
  mimePlanFromActivationRules,
  sanitizeTargetSegment,
} from './activationMime';

describe('mimePlanFromActivationRules', () => {
  test('defaults to text/plain when rules omitted', () => {
    const plan = mimePlanFromActivationRules(undefined);
    expect(plan.singleMimes).toContain('text/plain');
    expect(plan.multipleMimes).toEqual([]);
  });

  test('maps image maxCount to SEND_MULTIPLE', () => {
    const plan = mimePlanFromActivationRules([
      { type: 'text' },
      { type: 'image', maxCount: 5 },
    ]);
    expect(plan.singleMimes).toEqual(
      expect.arrayContaining(['text/plain', 'image/*'])
    );
    expect(plan.multipleMimes).toContain('image/*');
  });
});

describe('sanitizeTargetSegment', () => {
  test('strips non-alphanumeric', () => {
    expect(sanitizeTargetSegment('Hello-Widget')).toBe('hellowidget');
  });
});
