export interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: Error;
  details?: string;
}

export interface TestSuite {
  name: string;
  tests: TestResult[];
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
}

export interface BuildConfig {
  projectPath: string;
  scheme: string;
  configuration: 'Debug' | 'Release';
  destination: string;
}

export interface XcodeProject {
  path: string;
  workspace?: string;
  targets: string[];
  schemes: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface RuntimeTestConfig {
  appPath: string;
  bundleId: string;
  targetType: 'widget' | 'share' | 'clip';
  simulator: string;
}

