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

describe('generateConfig live-activity kinds', () => {
  test('live-activity writes kinds and moves expo-ui configuration onto the widget row', () => {
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
    expect(json.ios.configuration).toBeUndefined();
    expect(json.ios.kinds).toEqual([
      {
        name: 'MyWidget',
        displayName: 'My Widget',
        configuration: {
          title: 'My Widget Configuration',
          parameters: {
            listId: {
              title: 'List',
              type: 'string',
              default: 'default',
            },
          },
        },
      },
      {
        type: 'live-activity',
        attributesName: 'MyWidgetAttributes',
        static: { title: 'string' },
        contentState: { status: 'string' },
      },
    ]);
  });
});

describe('generateConfig native live-activity', () => {
  test('native live-activity kinds omit a gallery widget row', () => {
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
    expect(json.ios.kinds).toEqual([
      {
        type: 'live-activity',
        attributesName: 'MyWidgetAttributes',
        static: { title: 'string' },
        contentState: { status: 'string' },
      },
    ]);
  });
});
