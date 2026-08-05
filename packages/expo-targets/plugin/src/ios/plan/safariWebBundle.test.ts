import { describe, expect, test } from 'bun:test';
import * as path from 'node:path';

import { resolveIdentity } from './identity';
import { planSafariWebBundle } from './safariWebBundle';
import type { IOSTargetProps, ProjectPaths } from './types';
import { Logger } from '../../logger';

const PROJECT_ROOT = '/tmp/project';
const PROJECT_NAME = 'App';
const MAIN_BUNDLE_ID = 'com.example.app';

const paths: ProjectPaths = {
  projectRoot: PROJECT_ROOT,
  platformProjectRoot: path.join(PROJECT_ROOT, 'ios'),
  projectName: PROJECT_NAME,
};

function makeProps(overrides: Partial<IOSTargetProps> = {}): IOSTargetProps {
  return {
    type: 'safari',
    name: 'MySafari',
    directory: 'targets/my-safari',
    configPath: path.join(
      PROJECT_ROOT,
      'targets/my-safari/expo-target.config.js'
    ),
    logger: new Logger(false),
    ...overrides,
  } as IOSTargetProps;
}

describe('planSafariWebBundle', () => {
  test('returns a plan for safari targets with entry', () => {
    const props = makeProps({ entry: './targets/safari/index.tsx' });
    const identity = resolveIdentity({
      props,
      mainBundleIdentifier: MAIN_BUNDLE_ID,
    });
    const plan = planSafariWebBundle(props, paths, identity);

    expect(plan).toEqual({
      entryFile: 'targets/safari/index.tsx',
      popupJsPath: path.join(
        PROJECT_ROOT,
        'ios',
        PROJECT_NAME,
        'ExpoTargetsGenerated',
        'MySafariTarget',
        'Resources',
        'popup.js'
      ),
      popupJsReferencePath: path.join(
        PROJECT_NAME,
        'ExpoTargetsGenerated',
        'MySafariTarget',
        'Resources',
        'popup.js'
      ),
    });
  });

  test('returns undefined for non-safari targets', () => {
    const props = makeProps({
      type: 'share',
      entry: './index.tsx',
    } as Partial<IOSTargetProps>);
    const identity = resolveIdentity({
      props,
      mainBundleIdentifier: MAIN_BUNDLE_ID,
    });
    expect(planSafariWebBundle(props, paths, identity)).toBeUndefined();
  });

  test('returns undefined for safari without entry', () => {
    const props = makeProps();
    const identity = resolveIdentity({
      props,
      mainBundleIdentifier: MAIN_BUNDLE_ID,
    });
    expect(planSafariWebBundle(props, paths, identity)).toBeUndefined();
  });
});
