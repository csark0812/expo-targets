import { execa } from 'execa';
import * as path from 'path';
import type { RuntimeTestConfig } from './types.js';

export class RuntimeTester {
  async listSimulators(): Promise<Array<{ name: string; udid: string; state: string }>> {
    try {
      const result = await execa('xcrun', ['simctl', 'list', 'devices', 'available', '--json']);
      const data = JSON.parse(result.stdout);

      const simulators: Array<{ name: string; udid: string; state: string }> = [];

      for (const runtime of Object.keys(data.devices)) {
        const devices = data.devices[runtime];
        for (const device of devices) {
          if (device.isAvailable) {
            simulators.push({
              name: device.name,
              udid: device.udid,
              state: device.state
            });
          }
        }
      }

      return simulators;
    } catch {
      return [];
    }
  }

  async bootSimulator(udid: string): Promise<boolean> {
    try {
      const result = await execa('xcrun', ['simctl', 'boot', udid], { reject: false });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  async shutdownSimulator(udid: string): Promise<boolean> {
    try {
      const result = await execa('xcrun', ['simctl', 'shutdown', udid], { reject: false });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  async installApp(udid: string, appPath: string): Promise<boolean> {
    try {
      const result = await execa('xcrun', ['simctl', 'install', udid, appPath], {
        reject: false
      });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  async launchApp(udid: string, bundleId: string): Promise<boolean> {
    try {
      const result = await execa('xcrun', ['simctl', 'launch', udid, bundleId], {
        reject: false
      });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  async terminateApp(udid: string, bundleId: string): Promise<boolean> {
    try {
      const result = await execa('xcrun', ['simctl', 'terminate', udid, bundleId], {
        reject: false
      });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  async uninstallApp(udid: string, bundleId: string): Promise<boolean> {
    try {
      const result = await execa('xcrun', ['simctl', 'uninstall', udid, bundleId], {
        reject: false
      });
      return result.exitCode === 0;
    } catch {
      return false;
    }
  }

  async getAppContainer(udid: string, bundleId: string): Promise<string | null> {
    try {
      const result = await execa('xcrun', [
        'simctl',
        'get_app_container',
        udid,
        bundleId
      ]);
      return result.stdout.trim();
    } catch {
      return null;
    }
  }

  async readSharedData(udid: string, bundleId: string, appGroup: string): Promise<Record<string, any> | null> {
    try {
      const containerPath = await this.getAppContainer(udid, bundleId);
      if (!containerPath) return null;

      const dataPath = path.join(
        path.dirname(path.dirname(containerPath)),
        'Shared',
        'AppGroup',
        appGroup,
        'Library',
        'Preferences',
        `${appGroup}.plist`
      );

      const result = await execa('plutil', ['-convert', 'json', '-o', '-', dataPath]);
      return JSON.parse(result.stdout);
    } catch {
      return null;
    }
  }

  async writeSharedData(
    udid: string,
    bundleId: string,
    appGroup: string,
    data: Record<string, any>
  ): Promise<boolean> {
    try {
      const containerPath = await this.getAppContainer(udid, bundleId);
      if (!containerPath) return false;

      const dataPath = path.join(
        path.dirname(path.dirname(containerPath)),
        'Shared',
        'AppGroup',
        appGroup,
        'Library',
        'Preferences',
        `${appGroup}.plist`
      );

      const tempJson = `/tmp/test-data-${Date.now()}.json`;
      await execa('echo', [JSON.stringify(data)], { stdout: tempJson });
      await execa('plutil', ['-convert', 'binary1', tempJson, '-o', dataPath]);

      return true;
    } catch {
      return false;
    }
  }

  async runE2ETest(config: RuntimeTestConfig, testFn: () => Promise<void>): Promise<{
    success: boolean;
    duration: number;
    error?: Error;
  }> {
    const startTime = Date.now();

    const simulators = await this.listSimulators();
    const simulator = simulators.find(s => s.name === config.simulator);

    if (!simulator) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: new Error(`Simulator ${config.simulator} not found`)
      };
    }

    try {
      if (simulator.state !== 'Booted') {
        await this.bootSimulator(simulator.udid);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      await this.installApp(simulator.udid, config.appPath);
      await this.launchApp(simulator.udid, config.bundleId);
      await new Promise(resolve => setTimeout(resolve, 3000));

      await testFn();

      await this.terminateApp(simulator.udid, config.bundleId);
      await this.uninstallApp(simulator.udid, config.bundleId);

      return {
        success: true,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        error: error as Error
      };
    }
  }
}

