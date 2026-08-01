import { describe, expect, test } from 'bun:test';
import { sanitizeTargetName } from './paths';

describe('sanitizeTargetName', () => {
  test('appends Target suffix', () => {
    expect(sanitizeTargetName('Share')).toBe('ShareTarget');
  });

  test('strips non-alphanumeric characters', () => {
    expect(sanitizeTargetName('My Share-Extension!')).toBe(
      'MyShareExtensionTarget'
    );
  });

  test('handles names that already contain numbers', () => {
    expect(sanitizeTargetName('Widget2')).toBe('Widget2Target');
  });

  test('handles empty string', () => {
    expect(sanitizeTargetName('')).toBe('Target');
  });
});
