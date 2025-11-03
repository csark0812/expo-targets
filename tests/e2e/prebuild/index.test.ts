import * as path from 'path';
import { TestRunner } from '../framework/TestRunner.js';
import { BuildTestRunner } from '../framework/BuildTestRunner.js';
import type { TestSuite } from '../framework/types.js';

const WIDGET_APP = path.resolve(__dirname, '../../apps/widget-interactive');

async function runPrebuildTests() {
  const runner = new TestRunner();
  const buildRunner = new BuildTestRunner();
  const validator = buildRunner.getValidator();

  const tests: TestSuite = {
    name: 'Prebuild Tests',
    tests: []
  };

  tests.tests.push(
    await buildRunner.testPrebuildGeneratesProject(WIDGET_APP)
  );

  tests.tests.push(
    await buildRunner.testTargetCreation(WIDGET_APP, 'Weather', 'widget')
  );

  tests.tests.push(
    await buildRunner.testEntitlementsSync(WIDGET_APP, 'Weather')
  );

  tests.tests.push(
    await buildRunner.testAssetsGenerated(WIDGET_APP, 'Weather')
  );

  tests.tests.push(
    await runner.runTest('App Groups configured', async () => {
      const result = await validator.validateAppGroups(WIDGET_APP);
      if (!result.valid) {
        throw new Error(result.errors.join(', '));
      }
    })
  );

  tests.tests.push(
    await runner.runTest('Xcode project is valid', async () => {
      const result = await validator.validateProjectStructure(WIDGET_APP);
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
  runPrebuildTests();
}

export { runPrebuildTests };

