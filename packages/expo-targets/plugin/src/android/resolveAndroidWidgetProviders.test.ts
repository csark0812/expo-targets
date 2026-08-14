import { describe, expect, test } from 'bun:test';
import {
  buildAppWidgetProviderXml,
  mergeAppWidgetProviderXml,
  resolveAndroidWidgetProviders,
} from './resolveAndroidWidgetProviders';

const pkg = 'com.expotargets.example.widgets';

describe('resolveAndroidWidgetProviders 1:1', () => {
  test('omitted providers keeps 1:1 RemoteViews FQCN and xml name', () => {
    const [provider] = resolveAndroidWidgetProviders({
      packageName: pkg,
      targetName: 'HelloRemoteViews',
      displayName: 'Hello RemoteViews',
      android: { widgetType: 'remoteviews' },
    });

    expect(provider.className).toBe(
      `${pkg}.widget.helloremoteviews.HelloRemoteViewsProvider`
    );
    expect(provider.xmlName).toBe('widgetprovider_helloremoteviews');
    expect(provider.displayName).toBe('Hello RemoteViews');
    expect(provider.initialLayout).toBe('widget_helloremoteviews');
  });

  test('omitted providers keeps 1:1 Glance receiver FQCN', () => {
    const [provider] = resolveAndroidWidgetProviders({
      packageName: pkg,
      targetName: 'HelloWidget',
      android: { widgetType: 'glance' },
    });

    expect(provider.className).toBe(
      `${pkg}.widget.hellowidget.HelloWidgetWidgetReceiver`
    );
    expect(provider.xmlName).toBe('widgetprovider_hellowidget');
  });

  test('empty providers array is the scalar 1:1 path', () => {
    const providers = resolveAndroidWidgetProviders({
      packageName: pkg,
      targetName: 'HelloRemoteViews',
      android: { widgetType: 'remoteviews', providers: [] },
    });

    expect(providers).toHaveLength(1);
    expect(providers[0]?.className).toBe(
      `${pkg}.widget.helloremoteviews.HelloRemoteViewsProvider`
    );
  });
});

const poplProviders = [
  {
    name: 'homescreen',
    displayName: 'Popl Card',
    className: `${pkg}.widget.homescreenwidget.HomescreenWidgetProvider`,
    initialLayout: 'widget_homescreen',
    targetCellWidth: 4,
    targetCellHeight: 2,
  },
  {
    name: 'medium-qr',
    displayName: 'Medium QR',
    className: 'MediumQrWidgetProvider',
    initialLayout: 'widget_medium_qr',
    minWidth: '250dp',
  },
];

describe('resolveAndroidWidgetProviders list', () => {
  test('providers list registers N FQCNs and xml resources', () => {
    const providers = resolveAndroidWidgetProviders({
      packageName: pkg,
      targetName: 'HomescreenWidget',
      displayName: 'Popl',
      android: {
        widgetType: 'remoteviews',
        minWidth: '180dp',
        providers: poplProviders,
      },
    });

    expect(providers).toHaveLength(2);
    expect(providers[0]?.className).toBe(
      `${pkg}.widget.homescreenwidget.HomescreenWidgetProvider`
    );
    expect(providers[0]?.xmlName).toBe('widgetprovider_homescreen');
    expect(providers[0]?.displayName).toBe('Popl Card');
    expect(providers[0]?.minWidth).toBe('180dp');
    expect(providers[0]?.targetCellWidth).toBe(4);
    expect(providers[1]?.className).toBe(
      `${pkg}.widget.homescreenwidget.MediumQrWidgetProvider`
    );
    expect(providers[1]?.xmlName).toBe('widgetprovider_medium_qr');
    expect(providers[1]?.minWidth).toBe('250dp');
  });
});

describe('resolveAndroidWidgetProviders duplicates', () => {
  test('duplicate provider names throw', () => {
    expect(() =>
      resolveAndroidWidgetProviders({
        packageName: pkg,
        targetName: 'Bundle',
        android: {
          widgetType: 'remoteviews',
          providers: [{ name: 'status' }, { name: 'status' }],
        },
      })
    ).toThrow(/status/);
  });
});

describe('mergeAppWidgetProviderXml', () => {
  test('writes a full provider xml when the file is missing', () => {
    const xml = mergeAppWidgetProviderXml(
      null,
      buildAppWidgetProviderXml({
        minWidth: '180dp',
        minHeight: '110dp',
        resizeMode: 'horizontal|vertical',
        updatePeriodMillis: 0,
        widgetCategory: 'home_screen',
        initialLayout: 'widget_status',
      })
    );

    expect(xml).toContain('android:initialLayout="@layout/widget_status"');
    expect(xml).toContain('android:minWidth="180dp"');
  });

  test('keeps extra user attributes when the file already exists', () => {
    const existing = `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="110dp"
    android:widgetFeatures="reconfigurable"
    android:initialLayout="@layout/widget_status">
</appwidget-provider>
`;
    const xml = mergeAppWidgetProviderXml(
      existing,
      buildAppWidgetProviderXml({
        minWidth: '180dp',
        minHeight: '110dp',
        resizeMode: 'none',
        updatePeriodMillis: 0,
        widgetCategory: 'home_screen',
        initialLayout: 'widget_status',
      })
    );

    expect(xml).toContain('android:minWidth="180dp"');
    expect(xml).toContain('android:widgetFeatures="reconfigurable"');
    expect(xml).toContain('android:initialLayout="@layout/widget_status"');
  });
});
