import { RuntimeTester } from './RuntimeTester.js';

export class APITester {
  private runtimeTester: RuntimeTester;

  constructor() {
    this.runtimeTester = new RuntimeTester();
  }

  async testTargetStorage(
    targetName: string,
    appGroup: string,
    simulatorUdid: string,
    bundleId: string
  ): Promise<boolean> {
    const testData = {
      testKey: 'testValue',
      timestamp: Date.now(),
    };

    const written = await this.runtimeTester.writeSharedData(
      simulatorUdid,
      bundleId,
      appGroup,
      testData
    );

    if (!written) {
      return false;
    }

    const readData = await this.runtimeTester.readSharedData(
      simulatorUdid,
      bundleId,
      appGroup
    );

    if (!readData) {
      return false;
    }

    return readData.testKey === 'testValue';
  }

  async testExtensionLifecycle(
    bundleId: string,
    simulatorUdid: string
  ): Promise<boolean> {
    const launched = await this.runtimeTester.launchApp(
      simulatorUdid,
      bundleId
    );
    if (!launched) {
      return false;
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const terminated = await this.runtimeTester.terminateApp(
      simulatorUdid,
      bundleId
    );

    return terminated;
  }

  async testDataSharing(
    mainAppBundleId: string,
    extensionBundleId: string,
    appGroup: string,
    simulatorUdid: string
  ): Promise<boolean> {
    const testData = {
      sharedKey: 'sharedValue',
      timestamp: Date.now(),
    };

    const written = await this.runtimeTester.writeSharedData(
      simulatorUdid,
      mainAppBundleId,
      appGroup,
      testData
    );

    if (!written) {
      return false;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const readData = await this.runtimeTester.readSharedData(
      simulatorUdid,
      extensionBundleId,
      appGroup
    );

    if (!readData) {
      return false;
    }

    return readData.sharedKey === 'sharedValue';
  }
}
