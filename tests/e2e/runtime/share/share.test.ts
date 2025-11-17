import * as path from 'path';
import { TestRunner } from '../../framework/TestRunner.js';
import { BuildTestRunner } from '../../framework/BuildTestRunner.js';
import type { TestSuite } from '../../framework/types.js';

const SHARE_APP = path.resolve(__dirname, '../../../apps/share-extension');
const BUNDLE_ID = 'com.expo.shareextension';
const SIMULATOR = 'iPhone 15';

async function runShareExtensionTests() {
  const runner = new TestRunner();
  const buildRunner = new BuildTestRunner();
  const runtimeTester = buildRunner.getRuntimeTester();

  const tests: TestSuite = {
    name: 'Share Extension Runtime Tests',
    tests: []
  };

  tests.tests.push(
    await runner.runTest('Share extension target exists', async () => {
      const validator = buildRunner.getValidator();
      const result = await validator.validateTarget(SHARE_APP, 'share', 'share');
      if (!result.valid) {
        throw new Error(result.errors.join(', '));
      }
    })
  );

  tests.tests.push(
    await runner.runTest('Share extension has proper entitlements', async () => {
      const validator = buildRunner.getValidator();
      const result = await validator.validateEntitlements(SHARE_APP, 'share');
      if (!result.valid) {
        throw new Error(result.errors.join(', '));
      }
    })
  );

  tests.tests.push(
    await runner.runTest('Share extension Info.plist configured', async () => {
      const iosPath = path.join(SHARE_APP, 'ios');
      const validator = buildRunner.getValidator();
      const result = await validator.validateTarget(SHARE_APP, 'share', 'share');

      if (!result.valid) {
        throw new Error('Share extension Info.plist validation failed');
      }
    })
  );

  tests.tests.push(
    await runner.runTest('App Groups match between main app and extension', async () => {
      const validator = buildRunner.getValidator();
      const result = await validator.validateAppGroups(SHARE_APP);
      if (!result.valid) {
        throw new Error(result.errors.join(', '));
      }
    })
  );

  runner.addSuite(tests);
  const success = await runner.runAll();
  process.exit(success ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runShareExtensionTests();
}

export { runShareExtensionTests };

