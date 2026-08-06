import { describe, expect, test } from 'bun:test';
import { deepenClassBaseName } from './resolveUserClass';

describe('deepenClassBaseName', () => {
  test('builds Pascal deepen file bases', () => {
    expect(deepenClassBaseName('Keyboard', 'InputMethodService')).toBe(
      'KeyboardInputMethodService'
    );
    expect(deepenClassBaseName('file-provider', 'DocumentsProvider')).toBe(
      'FileProviderDocumentsProvider'
    );
  });
});
