import chalk from 'chalk';
import type { TestResult, TestSuite } from './types.js';

export class TestRunner {
  private suites: TestSuite[] = [];
  private results: TestResult[] = [];

  addSuite(suite: TestSuite) {
    this.suites.push(suite);
  }

  async runAll(): Promise<boolean> {
    console.log(chalk.bold.blue('\n🧪 Running Build Test Suite\n'));

    let totalPassed = 0;
    let totalFailed = 0;
    const startTime = Date.now();

    for (const suite of this.suites) {
      console.log(chalk.bold(`\n📦 ${suite.name}`));

      if (suite.setup) {
        try {
          await suite.setup();
        } catch (error) {
          console.log(chalk.red(`  ✗ Setup failed: ${error}`));
          continue;
        }
      }

      for (const test of suite.tests) {
        if (test.passed) {
          console.log(chalk.green(`  ✓ ${test.name} ${chalk.gray(`(${test.duration}ms)`)}`));
          totalPassed++;
        } else {
          console.log(chalk.red(`  ✗ ${test.name}`));
          if (test.error) {
            console.log(chalk.red(`    ${test.error.message}`));
          }
          if (test.details) {
            console.log(chalk.gray(`    ${test.details}`));
          }
          totalFailed++;
        }
        this.results.push(test);
      }

      if (suite.teardown) {
        try {
          await suite.teardown();
        } catch (error) {
          console.log(chalk.yellow(`  ⚠ Teardown warning: ${error}`));
        }
      }
    }

    const totalTime = Date.now() - startTime;
    const total = totalPassed + totalFailed;

    console.log(chalk.bold('\n' + '='.repeat(60)));
    console.log(chalk.bold('Test Results:'));
    console.log(`  Total: ${total}`);
    console.log(chalk.green(`  Passed: ${totalPassed}`));
    console.log(chalk.red(`  Failed: ${totalFailed}`));
    console.log(`  Duration: ${(totalTime / 1000).toFixed(2)}s`);
    console.log('='.repeat(60) + '\n');

    return totalFailed === 0;
  }

  async runTest(name: string, fn: () => Promise<void>): Promise<TestResult> {
    const startTime = Date.now();
    try {
      await fn();
      return {
        name,
        passed: true,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        name,
        passed: false,
        duration: Date.now() - startTime,
        error: error as Error
      };
    }
  }

  getResults(): TestResult[] {
    return this.results;
  }

  getSummary() {
    const passed = this.results.filter(r => r.passed).length;
    const failed = this.results.filter(r => !r.passed).length;
    return {
      total: this.results.length,
      passed,
      failed,
      passRate: this.results.length > 0 ? (passed / this.results.length) * 100 : 0
    };
  }
}

