import { describe, expect, test } from 'bun:test';

import { getExpoUiWidgetTemplate } from './expoUiWidgetTemplate';
import { generateConfig } from './generateConfig';

describe('getExpoUiWidgetTemplate', () => {
  test('emits createTarget Layout with widget directive', () => {
    const src = getExpoUiWidgetTemplate('MyWidget');
    expect(src).toContain("createTarget('MyWidget', MyWidgetLayout)");
    expect(src).toContain("'widget'");
    expect(src).toContain('export const myWidget');
  });
});

describe('generateConfig expo-ui widget', () => {
  test('writes entry and optional configuration', () => {
    const json = JSON.parse(
      generateConfig({
        type: 'widget',
        kebabName: 'my-widget',
        pascalName: 'MyWidget',
        platforms: ['ios'],
        widgetUi: 'expo-ui',
        configurableWidget: true,
        appGroup: 'group.test',
      })
    );
    expect(json.entry).toBe('./targets/my-widget/index.tsx');
    expect(json.ios.configuration.parameters.listId.type).toBe('string');
  });

  test('native widget has no entry', () => {
    const json = JSON.parse(
      generateConfig({
        type: 'widget',
        kebabName: 'my-widget',
        pascalName: 'MyWidget',
        platforms: ['ios'],
        widgetUi: 'native',
        appGroup: 'group.test',
      })
    );
    expect(json.entry).toBeUndefined();
  });
});

describe('generateConfig live-activity sibling', () => {
  test('expo-ui live-activity writes ios.liveActivity and keeps configuration off kinds', () => {
    const json = JSON.parse(
      generateConfig({
        type: 'widget',
        kebabName: 'my-widget',
        pascalName: 'MyWidget',
        platforms: ['ios'],
        widgetUi: 'expo-ui',
        configurableWidget: true,
        includeLiveActivity: true,
        appGroup: 'group.test',
      })
    );
    expect(json.ios.kinds).toBeUndefined();
    expect(json.ios.configuration.parameters.listId.type).toBe('string');
    expect(json.ios.liveActivity).toEqual({
      attributesName: 'MyWidgetAttributes',
      static: { title: 'string' },
      contentState: { status: 'string' },
    });
  });
});

describe('generateConfig native live-activity', () => {
  test('native live-activity writes ios.liveActivity without kinds', () => {
    const json = JSON.parse(
      generateConfig({
        type: 'widget',
        kebabName: 'my-widget',
        pascalName: 'MyWidget',
        platforms: ['ios'],
        widgetUi: 'native',
        includeLiveActivity: true,
        appGroup: 'group.test',
      })
    );
    expect(json.ios.kinds).toBeUndefined();
    expect(json.ios.liveActivity).toEqual({
      attributesName: 'MyWidgetAttributes',
      static: { title: 'string' },
      contentState: { status: 'string' },
    });
  });
});
