import process from 'node:process';
import * as path from 'path';
import { BuildTestRunner } from '../../framework/BuildTestRunner.js';
import { TestRunner } from '../../framework/TestRunner.js';
import type { TestSuite } from '../../framework/types.js';

const CLIP_APP = path.resolve(__dirname, '../../../apps/clip-advanced');
const _BUNDLE_ID = 'com.expo.clipadvanced';
const _SIMULATOR = 'iPhone 15';

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: pre-existing complexity; tracked for refactor
async function runAppClipTests() {
  const runner = new TestRunner();
  const buildRunner = new BuildTestRunner();
  const _runtimeTester = buildRunner.getRuntimeTester();

  const tests: TestSuite = {
    name: 'App Clip Runtime Tests',
    tests: [],
  };

  tests.tests.push(
    await runner.runTest('App Clip target exists', async () => {
      const validator = buildRunner.getValidator();
      const result = await validator.validateTarget(
        CLIP_APP,
        'checkout',
        'clip'
      );
      if (!result.valid) {
        throw new Error(result.errors.join(', '));
      }
    })
  );

  tests.tests.push(
    await runner.runTest('App Clip has proper entitlements', async () => {
      const validator = buildRunner.getValidator();
      const result = await validator.validateEntitlements(CLIP_APP, 'checkout');
      if (!result.valid) {
        throw new Error(result.errors.join(', '));
      }
    })
  );

  tests.tests.push(
    await runner.runTest('App Clip Info.plist configured', async () => {
      const validator = buildRunner.getValidator();
      const result = await validator.validateTarget(
        CLIP_APP,
        'checkout',
        'clip'
      );

      if (!result.valid) {
        throw new Error('App Clip Info.plist validation failed');
      }
    })
  );

  tests.tests.push(
    await runner.runTest('App Groups configured for App Clip', async () => {
      const validator = buildRunner.getValidator();
      const result = await validator.validateAppGroups(CLIP_APP);
      if (!result.valid) {
        throw new Error(result.errors.join(', '));
      }
    })
  );

  tests.tests.push(
    await runner.runTest('App Clip parent app association', async () => {
      const validator = buildRunner.getValidator();
      const result = await validator.validateTarget(
        CLIP_APP,
        'checkout',
        'clip'
      );

      if (result.warnings.some((w) => w.includes('parent'))) {
        throw new Error('App Clip parent app association issue');
      }
    })
  );

  runner.addSuite(tests);
  const success = await runner.runAll();
  process.exit(success ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAppClipTests();
}

export { runAppClipTests };
