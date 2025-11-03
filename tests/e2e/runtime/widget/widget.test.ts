import * as path from 'path';
import { TestRunner } from '../../framework/TestRunner.js';
import { BuildTestRunner } from '../../framework/BuildTestRunner.js';
import type { TestSuite, RuntimeTestConfig } from '../../framework/types.js';

const WIDGET_APP = path.resolve(__dirname, '../../../apps/widget-interactive');
const APP_GROUP = 'group.com.expo.widgetinteractive';
const BUNDLE_ID = 'com.expo.widgetinteractive';
const SIMULATOR = 'iPhone 15';

async function runWidgetTests() {
  const runner = new TestRunner();
  const buildRunner = new BuildTestRunner();
  const runtimeTester = buildRunner.getRuntimeTester();

  const tests: TestSuite = {
    name: 'Widget Runtime Tests',
    tests: [],
  };

  const runtimeConfig: RuntimeTestConfig = {
    appPath: path.join(
      WIDGET_APP,
      'ios/build/Build/Products/Debug-iphonesimulator/widgetinteractive.app'
    ),
    bundleId: BUNDLE_ID,
    targetType: 'widget',
    simulator: SIMULATOR,
  };

  tests.tests.push(
    await runner.runTest('Simulator is available', async () => {
      const simulators = await runtimeTester.listSimulators();
      const targetSim = simulators.find((s) => s.name === SIMULATOR);
      if (!targetSim) {
        throw new Error(`${SIMULATOR} not found`);
      }
    })
  );

  tests.tests.push(
    await runner.runTest('App installs successfully', async () => {
      const simulators = await runtimeTester.listSimulators();
      const sim = simulators.find((s) => s.name === SIMULATOR);
      if (!sim) throw new Error('Simulator not found');

      if (sim.state !== 'Booted') {
        const booted = await runtimeTester.bootSimulator(sim.udid);
        if (!booted) throw new Error('Failed to boot simulator');
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      const installed = await runtimeTester.installApp(
        sim.udid,
        runtimeConfig.appPath
      );
      if (!installed) {
        throw new Error('Failed to install app');
      }
    })
  );

  tests.tests.push(
    await runner.runTest('App launches successfully', async () => {
      const simulators = await runtimeTester.listSimulators();
      const sim = simulators.find((s) => s.name === SIMULATOR);
      if (!sim) throw new Error('Simulator not found');

      const launched = await runtimeTester.launchApp(sim.udid, BUNDLE_ID);
      if (!launched) {
        throw new Error('Failed to launch app');
      }

      await new Promise((resolve) => setTimeout(resolve, 3000));
    })
  );

  tests.tests.push(
    await runner.runTest('Data written to app group', async () => {
      const simulators = await runtimeTester.listSimulators();
      const sim = simulators.find((s) => s.name === SIMULATOR);
      if (!sim) throw new Error('Simulator not found');

      const testData = { test: 'value', timestamp: Date.now() };
      const written = await runtimeTester.writeSharedData(
        sim.udid,
        BUNDLE_ID,
        APP_GROUP,
        testData
      );

      if (!written) {
        throw new Error('Failed to write shared data');
      }
    })
  );

  tests.tests.push(
    await runner.runTest('Data read from app group', async () => {
      const simulators = await runtimeTester.listSimulators();
      const sim = simulators.find((s) => s.name === SIMULATOR);
      if (!sim) throw new Error('Simulator not found');

      const data = await runtimeTester.readSharedData(
        sim.udid,
        BUNDLE_ID,
        APP_GROUP
      );
      if (!data) {
        throw new Error('Failed to read shared data');
      }
    })
  );

  tests.tests.push(
    await runner.runTest('Widget refreshes on data update', async () => {
      const simulators = await runtimeTester.listSimulators();
      const sim = simulators.find((s) => s.name === SIMULATOR);
      if (!sim) throw new Error('Simulator not found');

      const beforeData = { counter: 1 };
      await runtimeTester.writeSharedData(
        sim.udid,
        BUNDLE_ID,
        APP_GROUP,
        beforeData
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const afterData = { counter: 2 };
      await runtimeTester.writeSharedData(
        sim.udid,
        BUNDLE_ID,
        APP_GROUP,
        afterData
      );
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const currentData = await runtimeTester.readSharedData(
        sim.udid,
        BUNDLE_ID,
        APP_GROUP
      );
      if (!currentData || currentData.counter !== 2) {
        throw new Error('Widget did not refresh with new data');
      }
    })
  );

  tests.setup = async () => {
    console.log('Setting up widget tests...');
  };

  tests.teardown = async () => {
    const simulators = await runtimeTester.listSimulators();
    const sim = simulators.find((s) => s.name === SIMULATOR);
    if (sim) {
      await runtimeTester.terminateApp(sim.udid, BUNDLE_ID);
      await runtimeTester.uninstallApp(sim.udid, BUNDLE_ID);
    }
  };

  runner.addSuite(tests);
  const success = await runner.runAll();
  process.exit(success ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runWidgetTests();
}

export { runWidgetTests };
