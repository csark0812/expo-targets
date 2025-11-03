import * as path from 'path';
import { TestRunner } from '../framework/TestRunner.js';
import { BuildTestRunner } from '../framework/BuildTestRunner.js';
import type { TestSuite, BuildConfig } from '../framework/types.js';

const WIDGET_APP = path.resolve(__dirname, '../../apps/widget-interactive');
const SHARE_APP = path.resolve(__dirname, '../../apps/share-extension');
const CLIP_APP = path.resolve(__dirname, '../../apps/clip-advanced');

const SIMULATOR_DESTINATION = 'platform=iOS Simulator,name=iPhone 15,OS=latest';

async function runCompilationTests() {
  const runner = new TestRunner();
  const buildRunner = new BuildTestRunner();

  const tests: TestSuite = {
    name: 'Compilation Tests',
    tests: []
  };

  const widgetConfig: BuildConfig = {
    projectPath: path.join(WIDGET_APP, 'ios'),
    scheme: 'widgetinteractive',
    configuration: 'Debug',
    destination: SIMULATOR_DESTINATION
  };

  tests.tests.push(
    await buildRunner.testBuildSucceeds(widgetConfig)
  );

  const widgetReleaseConfig: BuildConfig = {
    ...widgetConfig,
    configuration: 'Release'
  };

  tests.tests.push(
    await buildRunner.testBuildSucceeds(widgetReleaseConfig)
  );

  const shareConfig: BuildConfig = {
    projectPath: path.join(SHARE_APP, 'ios'),
    scheme: 'shareextension',
    configuration: 'Debug',
    destination: SIMULATOR_DESTINATION
  };

  tests.tests.push(
    await buildRunner.testBuildSucceeds(shareConfig)
  );

  const clipConfig: BuildConfig = {
    projectPath: path.join(CLIP_APP, 'ios'),
    scheme: 'clipadvanced',
    configuration: 'Debug',
    destination: SIMULATOR_DESTINATION
  };

  tests.tests.push(
    await buildRunner.testBuildSucceeds(clipConfig)
  );

  tests.tests.push(
    await runner.runTest('Build performance within limits', async () => {
      const xcodeHelper = buildRunner.getXcodeHelper();
      const result = await xcodeHelper.build(widgetConfig);

      if (!result.success) {
        throw new Error('Build failed');
      }

      const MAX_BUILD_TIME = 180000; // 3 minutes
      if (result.duration > MAX_BUILD_TIME) {
        throw new Error(
          `Build took ${(result.duration / 1000).toFixed(1)}s, exceeds ${MAX_BUILD_TIME / 1000}s limit`
        );
      }
    })
  );

  tests.tests.push(
    await runner.runTest('Build artifacts exist', async () => {
      const xcodeHelper = buildRunner.getXcodeHelper();
      const hasArtifact = await xcodeHelper.verifyBuildArtifact(
        widgetConfig.projectPath,
        widgetConfig.scheme
      );

      if (!hasArtifact) {
        throw new Error('Build artifacts not found');
      }
    })
  );

  runner.addSuite(tests);
  const success = await runner.runAll();
  process.exit(success ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCompilationTests();
}

export { runCompilationTests };

