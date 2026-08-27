import { afterEach, describe, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { checkAppGroups } from './checks/appGroups';
import { checkEntries } from './checks/entries';
import { checkLiveActivitiesConfig } from './checks/liveActivitiesConfig';
import { checkLiveActivityHostApi } from './checks/liveActivityHostApi';
import { checkLiveActivityKind } from './checks/liveActivityKind';
import { checkMetro } from './checks/metro';
import { checkNameSync } from './checks/nameSync';
import { checkPlugin } from './checks/plugin';
import { warnUnusedWidgetBundle } from './checks/unusedWidgetBundle';
import { loadProject } from './project';

const roots: string[] = [];

function makeProject(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'expo-targets-doctor-'));
  roots.push(root);
  for (const [rel, content] of Object.entries(files)) {
    const full = path.join(root, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  return root;
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('checkPlugin', () => {
  test('passes when expo-targets plugin is present', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
    });
    expect(checkPlugin(loadProject(root))).toBeNull();
  });

  test('fails when plugin is missing', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: [] } }),
    });
    expect(checkPlugin(loadProject(root))?.message).toContain('missing');
  });
});

describe('checkMetro', () => {
  test('skips when no RN entries', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'targets/share/expo-target.config.json': JSON.stringify({
        type: 'share',
        name: 'Share',
        platforms: ['ios'],
      }),
    });
    expect(checkMetro(loadProject(root))).toBeNull();
  });

  test('fails when entry exists but metro lacks withTargets', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'targets/share/expo-target.config.json': JSON.stringify({
        type: 'share',
        name: 'Share',
        platforms: ['ios'],
        entry: './targets/share/index.tsx',
      }),
      'targets/share/index.tsx':
        'export default function App() { return null; }',
      'metro.config.js': 'module.exports = {};\n',
    });
    expect(checkMetro(loadProject(root))?.message).toContain('withTargets');
  });

  test('passes with withTargetsMetro alias', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'targets/share/expo-target.config.json': JSON.stringify({
        type: 'share',
        name: 'Share',
        platforms: ['ios'],
        entry: './targets/share/index.tsx',
      }),
      'targets/share/index.tsx':
        'export default function App() { return null; }',
      'metro.config.js':
        'const { withTargetsMetro } = require("expo-targets/metro");\n' +
        'module.exports = withTargetsMetro({});\n',
    });
    expect(checkMetro(loadProject(root))).toBeNull();
  });
});

describe('checkAppGroups', () => {
  test('fails when share target needs group but host has none', () => {
    const root = makeProject({
      'app.json': JSON.stringify({
        expo: {
          plugins: ['expo-targets'],
          ios: { bundleIdentifier: 'com.example.app' },
        },
      }),
      'targets/share/expo-target.config.json': JSON.stringify({
        type: 'share',
        name: 'Share',
        platforms: ['ios'],
      }),
    });
    const errors = checkAppGroups(loadProject(root));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]?.message).toContain('application-groups');
  });

  test('passes when host and target groups match', () => {
    const root = makeProject({
      'app.json': JSON.stringify({
        expo: {
          plugins: ['expo-targets'],
          ios: {
            bundleIdentifier: 'com.example.app',
            entitlements: {
              'com.apple.security.application-groups': [
                'group.com.example.app',
              ],
            },
          },
        },
      }),
      'targets/share/expo-target.config.json': JSON.stringify({
        type: 'share',
        name: 'Share',
        platforms: ['ios'],
        appGroup: 'group.com.example.app',
      }),
    });
    expect(checkAppGroups(loadProject(root))).toHaveLength(0);
  });
});

describe('checkEntries', () => {
  test('fails when entry path is missing', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'targets/share/expo-target.config.json': JSON.stringify({
        type: 'share',
        name: 'Share',
        platforms: ['ios'],
        entry: './targets/share/index.tsx',
      }),
    });
    expect(checkEntries(loadProject(root))[0]?.message).toContain(
      'does not exist'
    );
  });
});

describe('checkNameSync', () => {
  test('fails when createTarget name mismatches config', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'targets/share/expo-target.config.json': JSON.stringify({
        type: 'share',
        name: 'Share',
        platforms: ['ios'],
      }),
      'targets/share/index.ts':
        "import { createTarget } from 'expo-targets';\n" +
        "export const share = createTarget('Wrong');\n",
    });
    expect(checkNameSync(loadProject(root))[0]?.message).toContain(
      'missing createTarget'
    );
  });

  test('passes when names match', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'targets/share/expo-target.config.json': JSON.stringify({
        type: 'share',
        name: 'Share',
        platforms: ['ios'],
      }),
      'targets/share/index.ts':
        "import { createTarget } from 'expo-targets';\n" +
        "export const share = createTarget('Share');\n",
    });
    expect(checkNameSync(loadProject(root))).toHaveLength(0);
  });

  test('passes when createTarget uses Targets.Share member', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'targets/share/expo-target.config.json': JSON.stringify({
        type: 'share',
        name: 'Share',
        platforms: ['ios'],
      }),
      'targets/share/index.ts':
        "import { createTarget } from 'expo-targets';\n" +
        'const Targets = { Share: "Share" } as const;\n' +
        'export const share = createTarget(Targets.Share);\n',
    });
    expect(checkNameSync(loadProject(root))).toHaveLength(0);
  });
});

describe('checkNameSync gallery kinds', () => {
  test('fails when a gallery kind has no createTarget', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'targets/widget/expo-target.config.json': JSON.stringify({
        type: 'widget',
        name: 'Home',
        platforms: ['ios'],
        entry: './targets/widget/index.tsx',
        ios: {
          kinds: [
            { name: 'Home' },
            { name: 'Lock' },
            { type: 'live-activity', attributesName: 'HomeAttributes' },
          ],
        },
      }),
      'targets/widget/index.tsx':
        "import { createTarget } from 'expo-targets';\n" +
        "export const home = createTarget('Home');\n",
    });
    expect(checkNameSync(loadProject(root))[0]?.message).toContain('Lock');
  });

  test('passes when every gallery kind has createTarget', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'targets/widget/expo-target.config.json': JSON.stringify({
        type: 'widget',
        name: 'Home',
        platforms: ['ios'],
        entry: './targets/widget/index.tsx',
        ios: {
          kinds: [
            { name: 'Home' },
            { name: 'Lock' },
            { type: 'live-activity', attributesName: 'HomeAttributes' },
          ],
        },
      }),
      'targets/widget/index.tsx':
        "import { createTarget } from 'expo-targets';\n" +
        "export const home = createTarget('Home');\n" +
        "export const lock = createTarget('Lock');\n",
    });
    expect(checkNameSync(loadProject(root))).toHaveLength(0);
  });
});

describe('checkNameSync gallery kinds via .widget', () => {
  test('passes when every gallery kind has .widget', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'targets/widget/expo-target.config.json': JSON.stringify({
        type: 'widget',
        name: 'PoplWidgets',
        platforms: ['ios'],
        appGroup: 'group.test',
        ios: {
          kinds: [{ name: 'Home' }, { name: 'Lock' }],
        },
      }),
      'targets/widget/index.ts':
        "import { createTarget } from 'expo-targets';\n" +
        "export const popl = createTarget('PoplWidgets');\n" +
        "export const home = popl.widget('Home');\n" +
        "export const lock = popl.widget('Lock');\n",
    });
    expect(checkNameSync(loadProject(root))).toHaveLength(0);
  });
});

describe('warnUnusedWidgetBundle', () => {
  test('warns leftover Bundle.swift when expo-ui lists gallery kinds', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'targets/widget/expo-target.config.json': JSON.stringify({
        type: 'widget',
        name: 'Home',
        platforms: ['ios'],
        entry: './targets/widget/index.tsx',
        ios: { kinds: [{ name: 'Home' }, { name: 'Lock' }] },
      }),
      'targets/widget/ios/HomeBundle.swift':
        'import WidgetKit\nstruct HomeBundle: WidgetBundle { var body: some Widget { Home() } }\n',
    });
    const warnings = warnUnusedWidgetBundle(loadProject(root));
    expect(warnings[0]?.message).toContain('HomeBundle.swift');
  });

  test('skips live-activity-only kinds', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'targets/widget/expo-target.config.json': JSON.stringify({
        type: 'widget',
        name: 'Home',
        platforms: ['ios'],
        ios: {
          kinds: [{ type: 'live-activity', attributesName: 'HomeAttributes' }],
        },
      }),
      'targets/widget/ios/HomeBundle.swift': 'struct HomeBundle {}\n',
    });
    expect(warnUnusedWidgetBundle(loadProject(root))).toHaveLength(0);
  });
});

describe('checkLiveActivityKind', () => {
  test('fails leftover live-activity kinds', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'targets/widget/expo-target.config.json': JSON.stringify({
        type: 'widget',
        name: 'Home',
        platforms: ['ios'],
        ios: {
          kinds: [{ type: 'live-activity', attributesName: 'HomeAttributes' }],
        },
      }),
    });
    const errors = checkLiveActivityKind(loadProject(root));
    expect(errors[0]?.level).toBe('error');
    expect(errors[0]?.message).toContain('ios.liveActivity');
  });

  test('skips when Live Activity is only on ios.liveActivity', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'targets/widget/expo-target.config.json': JSON.stringify({
        type: 'widget',
        name: 'Home',
        platforms: ['ios'],
        ios: {
          liveActivity: {
            attributesName: 'HomeAttributes',
            contentState: { status: 'string' },
          },
        },
      }),
    });
    expect(checkLiveActivityKind(loadProject(root))).toHaveLength(0);
  });
});

describe('checkLiveActivitiesConfig', () => {
  test('fails when singular and array are both set', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'targets/widget/expo-target.config.json': JSON.stringify({
        type: 'widget',
        name: 'Home',
        platforms: ['ios'],
        ios: {
          liveActivity: {
            attributesName: 'A',
            contentState: { status: 'string' },
          },
          liveActivities: [
            {
              attributesName: 'B',
              contentState: { status: 'string' },
            },
          ],
        },
      }),
    });
    const errors = checkLiveActivitiesConfig(loadProject(root));
    expect(errors[0]?.level).toBe('error');
    expect(errors[0]?.message).toContain('not both');
  });

  test('fails duplicate attributesName in liveActivities', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'targets/widget/expo-target.config.json': JSON.stringify({
        type: 'widget',
        name: 'Home',
        platforms: ['ios'],
        ios: {
          liveActivities: [
            {
              attributesName: 'SameAttributes',
              contentState: { a: 'string' },
            },
            {
              attributesName: 'SameAttributes',
              contentState: { b: 'string' },
            },
          ],
        },
      }),
    });
    const errors = checkLiveActivitiesConfig(loadProject(root));
    expect(errors[0]?.message).toContain('duplicate');
  });
});

describe('checkLiveActivityHostApi', () => {
  test('warns on LiveActivity.create in target index', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'targets/widget/expo-target.config.json': JSON.stringify({
        type: 'widget',
        name: 'HelloWidget',
        platforms: ['ios'],
        appGroup: 'group.test',
        ios: {
          liveActivity: {
            attributesName: 'HelloWidgetAttributes',
            contentState: { status: 'string' },
          },
        },
      }),
      'targets/widget/index.ts':
        "import { LiveActivity, createTarget } from 'expo-targets';\n" +
        "export const hello = createTarget('HelloWidget');\n" +
        "export const la = LiveActivity.create('HelloWidgetAttributes');\n",
    });
    const warnings = checkLiveActivityHostApi(loadProject(root));
    expect(warnings[0]?.level).toBe('warn');
    expect(warnings[0]?.message).toContain('.liveActivity(');
  });
});

describe('checkLiveActivityHostApi folder helper', () => {
  test('passes when target index uses folder.liveActivity()', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'targets/widget/expo-target.config.json': JSON.stringify({
        type: 'widget',
        name: 'HelloWidget',
        platforms: ['ios'],
        appGroup: 'group.test',
        ios: {
          liveActivity: {
            attributesName: 'HelloWidgetAttributes',
            contentState: { status: 'string' },
          },
        },
      }),
      'targets/widget/index.ts':
        "import { createTarget } from 'expo-targets';\n" +
        "export const hello = createTarget('HelloWidget');\n" +
        'export const la = hello.liveActivity();\n',
    });
    expect(checkLiveActivityHostApi(loadProject(root))).toHaveLength(0);
  });

  test('warns when multi liveActivities missing .liveActivity(name)', () => {
    const root = makeProject({
      'app.json': JSON.stringify({ expo: { plugins: ['expo-targets'] } }),
      'targets/widget/expo-target.config.json': JSON.stringify({
        type: 'widget',
        name: 'PoplWidgets',
        platforms: ['ios'],
        appGroup: 'group.test',
        ios: {
          liveActivities: [
            {
              attributesName: 'DynamicIslandAttributes',
              contentState: { a: 'string' },
            },
            {
              attributesName: 'MeetingLiveAttributes',
              contentState: { b: 'string' },
            },
          ],
        },
      }),
      'targets/widget/index.ts':
        "import { createTarget } from 'expo-targets';\n" +
        "export const popl = createTarget('PoplWidgets');\n" +
        "export const island = popl.liveActivity('DynamicIslandAttributes');\n",
    });
    const warnings = checkLiveActivityHostApi(loadProject(root));
    expect(warnings[0]?.message).toContain('MeetingLiveAttributes');
  });
});
