import chalk from 'chalk';

// Module-level flag to prevent duplicate "Found X target(s)" logs
let hasLoggedTargetCount = false;

export class Logger {
  private debug: boolean;

  constructor(debug: boolean = false) {
    this.debug = debug;
    // Reset flag when debug is enabled to allow full logging
    if (debug) {
      hasLoggedTargetCount = false;
    }
  }

  log(message: string): void {
    if (this.debug) {
      console.log(`[expo-targets] ${message}`);
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

    if (!this.debug) {
      // Match Expo's style: green checkmark + message + dimmed detail
      const symbol = success ? chalk.green('✔') : '✖';
      const detailStr = detail ? chalk.dim(` | ${detail}`) : '';
      console.log(`${symbol} ${message}${detailStr}`);
    } else {
      console.log(`[expo-targets] ${message}${detail ? ` - ${detail}` : ''}`);
    }
  }

  warn(message: string): void {
    if (this.debug) {
      console.warn(`[expo-targets] ${message}`);
    } else {
      const symbol = '⚠';
      console.warn(`${symbol} ${message}`);
    }
  }

  error(message: string): void {
    console.error(`[expo-targets] ${message}`);
  }
}

// Reset flag for testing / new processes
export function resetLoggerState(): void {
  hasLoggedTargetCount = false;
}
