import { execa } from 'execa';
import { glob } from 'glob';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { BuildConfig, XcodeProject } from './types.js';

export class XcodeHelper {
  async findProject(projectPath: string): Promise<XcodeProject> {
    const workspaces = await glob('*.xcworkspace', { cwd: projectPath });
    const projects = await glob('*.xcodeproj', { cwd: projectPath });

    if (workspaces.length === 0 && projects.length === 0) {
      throw new Error(`No Xcode project found in ${projectPath}`);
    }

    const projectFile = workspaces[0] || projects[0];
    const isWorkspace = projectFile.endsWith('.xcworkspace');

    return {
      path: path.join(projectPath, projectFile),
      workspace: isWorkspace ? projectFile : undefined,
      targets: await this.listTargets(projectPath, projectFile, isWorkspace),
      schemes: await this.listSchemes(projectPath, projectFile, isWorkspace),
    };
  }

  async listTargets(
    projectPath: string,
    projectFile: string,
    isWorkspace: boolean
  ): Promise<string[]> {
    try {
      const flag = isWorkspace ? '-workspace' : '-project';
      const result = await execa('xcodebuild', [flag, projectFile, '-list'], {
        cwd: projectPath,
      });

      const output = result.stdout;
      const targetsMatch = output.match(
        /Targets:\s+([\s\S]*?)(?=\n\n|\nBuild Configurations:)/
      );
      if (!targetsMatch) return [];

      return targetsMatch[1]
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    } catch {
      return [];
    }
  }

  async listSchemes(
    projectPath: string,
    projectFile: string,
    isWorkspace: boolean
  ): Promise<string[]> {
    try {
      const flag = isWorkspace ? '-workspace' : '-project';
      const result = await execa('xcodebuild', [flag, projectFile, '-list'], {
        cwd: projectPath,
      });

      const output = result.stdout;
      const schemesMatch = output.match(/Schemes:\s+([\s\S]*?)$/);
      if (!schemesMatch) return [];

      return schemesMatch[1]
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    } catch {
      return [];
    }
  }

  async build(
    config: BuildConfig
  ): Promise<{ success: boolean; duration: number; output: string }> {
    const startTime = Date.now();

    try {
      const args = [
        'build',
        '-scheme',
        config.scheme,
        '-configuration',
        config.configuration,
        '-destination',
        config.destination,
        '-quiet',
      ];

      const project = await this.findProject(config.projectPath);
      if (project.workspace) {
        args.unshift('-workspace', project.workspace);
      } else {
        args.unshift('-project', path.basename(project.path));
      }

      const result = await execa('xcodebuild', args, {
        cwd: config.projectPath,
        reject: false,
      });

      const duration = Date.now() - startTime;

      return {
        success: result.exitCode === 0,
        duration,
        output: result.stdout + result.stderr,
      };
    } catch (error) {
      return {
        success: false,
        duration: Date.now() - startTime,
        output: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async clean(config: BuildConfig): Promise<void> {
    const project = await this.findProject(config.projectPath);
    const args = ['clean', '-scheme', config.scheme];

    if (project.workspace) {
      args.unshift('-workspace', project.workspace);
    } else {
      args.unshift('-project', path.basename(project.path));
    }

    await execa('xcodebuild', args, {
      cwd: config.projectPath,
      reject: false,
    });
  }

  async verifyBuildArtifact(
    projectPath: string,
    scheme: string
  ): Promise<boolean> {
    const buildPath = path.join(projectPath, 'build');
    try {
      const stats = await fs.stat(buildPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async getDerivedDataPath(config: BuildConfig): Promise<string | null> {
    try {
      const result = await execa(
        'xcodebuild',
        ['-showBuildSettings', '-scheme', config.scheme],
        { cwd: config.projectPath }
      );

      const match = result.stdout.match(/BUILD_DIR = (.+)/);
      return match ? path.dirname(match[1]) : null;
    } catch {
      return null;
    }
  }
}
