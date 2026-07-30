import chalk from 'chalk';

// Module-level flag to prevent duplicate "Found X target(s)" logs
let hasLoggedTargetCount = false;

export class Logger {
  private readonly debug: boolean;

  constructor(debug = false) {
    this.debug = debug;
    // Reset flag when debug is enabled to allow full logging
    if (debug) {
      hasLoggedTargetCount = false;
    }
  }

  log(_message: string): void {
    if (this.debug) {
    }
  }

  logSparse(success: boolean, message: string, detail?: string): void {
    // Prevent duplicate "Found X target(s)" logs across multiple plugin invocations
    if (
      !this.debug &&
      message.startsWith('Found') &&
      message.includes('target(s)')
    ) {
      if (hasLoggedTargetCount) {
        return;
      }
      hasLoggedTargetCount = true;
    }

    if (this.debug) {
    } else {
      // Match Expo's style: green checkmark + message + dimmed detail
      const _symbol = success ? chalk.green('✔') : '✖';
      const _detailStr = detail ? chalk.dim(` | ${detail}`) : '';
    }
  }

  warn(_message: string): void {
    if (this.debug) {
    } else {
      const _symbol = '⚠';
    }
  }

  error(_message: string): void {}
}

// Reset flag for testing / new processes
export function resetLoggerState(): void {
  hasLoggedTargetCount = false;
}
