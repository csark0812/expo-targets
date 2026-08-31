import { describe, expect, test } from 'bun:test';

import {
  generateExpoUiWidgetBundleSwift,
  generateExpoUiWidgetSwift,
  generateNativeWidgetBundleSwift,
} from './expoUiWidgetSwift';

describe('generateExpoUiWidgetSwift', () => {
  test('static configuration by default', () => {
    const src = generateExpoUiWidgetSwift({
      name: 'HelloExpoUi',
      displayName: 'Hello Expo UI',
    });
    expect(src).toContain('StaticConfiguration');
    expect(src).toContain('WidgetsTimelineProvider');
    expect(src).not.toContain('AppIntentConfiguration');
  });

  test('AppIntentConfiguration when configuration set', () => {
    const src = generateExpoUiWidgetSwift({
      name: 'HelloExpoUi',
      displayName: 'Hello Expo UI',
      configuration: {
        title: 'Config',
        parameters: {
          listId: { title: 'List', type: 'string', default: 'default' },
        },
      },
    });
    expect(src).toContain('AppIntentConfiguration');
    expect(src).toContain('HelloExpoUiConfigurationAppIntent');
    expect(src).toContain('env["configuration"]');
    expect(src).toContain('"listId"');
  });
});

describe('generateExpoUiWidgetBundleSwift', () => {
  test('lists every gallery kind plus WidgetLiveActivity', () => {
    const src = generateExpoUiWidgetBundleSwift({
      name: 'HomescreenWidgets',
      widgets: [{ name: 'HomescreenWidgets' }, { name: 'LockScreenWidgets' }],
      includeLiveActivity: true,
    });
    expect(src).toContain('HomescreenWidgets()');
    expect(src).toContain('LockScreenWidgets()');
    expect(src).toContain('WidgetLiveActivity()');
  });
});

describe('generateNativeWidgetBundleSwift', () => {
  test('lists gallery kinds and the native Live Activity type without ExpoWidgets', () => {
    const src = generateNativeWidgetBundleSwift({
      name: 'PoplWidgets',
      widgets: [
        { name: 'HomescreenWidgets' },
        { name: 'LockScreenWidgets' },
        { name: 'LockScreenScanWidget' },
      ],
      includeLiveActivity: true,
    });
    expect(src).toContain('@main');
    expect(src).toContain('struct PoplWidgetsBundle: WidgetBundle');
    expect(src).toContain('HomescreenWidgets()');
    expect(src).toContain('LockScreenWidgets()');
    expect(src).toContain('LockScreenScanWidget()');
    expect(src).toContain('PoplWidgetsLiveActivity()');
    expect(src).not.toContain('WidgetLiveActivity()');
    expect(src).not.toContain('ExpoWidgets');
  });
});
