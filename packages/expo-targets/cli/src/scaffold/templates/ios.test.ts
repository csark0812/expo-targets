import { describe, expect, test } from 'bun:test';
import { getWidgetTemplate } from './ios';

describe('getWidgetTemplate', () => {
  test('uses StaticConfiguration by default', () => {
    const template = getWidgetTemplate('HelloWidget', {
      appGroup: 'group.com.example.app',
    });
    expect(template).toContain('StaticConfiguration');
    expect(template).not.toContain('AppIntentConfiguration');
    expect(template).toContain('TimelineProvider');
    expect(template).not.toContain('AppIntentTimelineProvider');
  });

  test('uses AppIntentConfiguration when configurable', () => {
    const template = getWidgetTemplate('HelloWidget', {
      appGroup: 'group.com.example.widgets',
      configurable: true,
    });
    expect(template).toContain('AppIntentConfiguration');
    expect(template).toContain('HelloWidgetConfigurationIntent');
    expect(template).toContain('WidgetConfigurationIntent');
    expect(template).toContain('AppIntentTimelineProvider');
    expect(template).not.toContain('StaticConfiguration');
    expect(template).toContain('group.com.example.widgets');
    expect(template).toContain('listId');
  });

  test('omits @main when useBundle is set', () => {
    const template = getWidgetTemplate('HelloWidget', {
      appGroup: 'group.com.example.app',
      useBundle: true,
      configurable: true,
    });
    expect(template).not.toContain('@main');
  });
});
