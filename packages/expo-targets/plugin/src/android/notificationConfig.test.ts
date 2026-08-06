import { describe, expect, test } from 'bun:test';
import { sanitizeTargetSegment, toPascalName } from './activationMime';

describe('notification Android naming helpers', () => {
  test('sanitizeTargetSegment for channel defaults', () => {
    expect(sanitizeTargetSegment('NotificationService')).toBe(
      'notificationservice'
    );
    expect(sanitizeTargetSegment('my-nse')).toBe('mynse');
  });

  test('toPascalName for deepen class', () => {
    expect(toPascalName('NotificationService')).toBe('NotificationService');
    expect(toPascalName('my-nse')).toBe('MyNse');
  });
});
