import { execa } from 'execa';
import { setTimeout } from 'timers/promises';

export class MetroTester {
  private metroProcess: { kill: () => void } | null = null;
  private projectPath: string | null = null;

  async startMetro(projectPath: string): Promise<void> {
    this.projectPath = projectPath;
    this.metroProcess = execa(
      'npx',
      ['expo', 'start', '--no-dev', '--minify'],
      {
        cwd: projectPath,
        detached: true,
        stdio: 'pipe',
      }
    ) as { kill: () => void };
    await setTimeout(10000);
  }

  async requestBundle(
    bundleRoot: string,
    platform: string = 'ios',
    target?: string
  ): Promise<string> {
    if (!this.projectPath) {
      throw new Error('Metro not started. Call startMetro() first.');
    }

    const url = target
      ? `http://localhost:8081/${bundleRoot}.bundle?platform=${platform}&target=${target}`
      : `http://localhost:8081/${bundleRoot}.bundle?platform=${platform}`;

    try {
      const result = await execa('curl', ['-s', url], {
        timeout: 30000,
      });

      return result.stdout;
    } catch (error) {
      throw new Error(`Failed to request bundle: ${error}`);
    }
  }

  async getBundleSize(bundle: string): Promise<number> {
    return Buffer.byteLength(bundle, 'utf8');
  }

  async verifyExcludedPackages(
    bundle: string,
    excludedPackages: string[]
  ): Promise<boolean> {
    for (const pkg of excludedPackages) {
      if (bundle.includes(pkg)) {
        return false;
      }
    }
    return true;
  }

  async stopMetro(): Promise<void> {
    if (this.metroProcess) {
      this.metroProcess.kill();
      await setTimeout(2000);
      this.metroProcess = null;
    }
  }
}
