import { describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { makeTempDir, removeTempDir } from '../../../test-utils/tempDir';
import { clearRootGeneratedSwiftFiles } from './withExpoTargetsGenerated';

describe('clearRootGeneratedSwiftFiles', () => {
  test('deletes root *.swift only and leaves product subdirs intact', () => {
    const root = makeTempDir('expo-targets-cng-wipe-');
    try {
      const outDir = path.join(root, 'App', 'ExpoTargetsGenerated');
      const productDir = path.join(outDir, 'ShareMinimalTarget');
      fs.mkdirSync(productDir, { recursive: true });

      fs.writeFileSync(path.join(outDir, 'LiveActivityBridge.swift'), '// host\n');
      fs.writeFileSync(path.join(outDir, 'KeepMe.txt'), 'not swift\n');
      fs.writeFileSync(
        path.join(productDir, 'Info.plist'),
        '<plist/>\n'
      );
      fs.writeFileSync(
        path.join(productDir, 'ReactNativeViewController.swift'),
        '// sealed\n'
      );

      clearRootGeneratedSwiftFiles(outDir);

      expect(fs.existsSync(path.join(outDir, 'LiveActivityBridge.swift'))).toBe(
        false
      );
      expect(fs.existsSync(path.join(outDir, 'KeepMe.txt'))).toBe(true);
      expect(fs.existsSync(path.join(productDir, 'Info.plist'))).toBe(true);
      expect(
        fs.existsSync(
          path.join(productDir, 'ReactNativeViewController.swift')
        )
      ).toBe(true);
    } finally {
      removeTempDir(root);
    }
  });
});
