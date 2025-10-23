import { defineTarget } from 'expo-targets';

export const HelloWidget = defineTarget({
  name: 'hello-widget',
  appGroup: 'group.com.test.widgetbasic',
  type: 'widget',
  displayName: 'Hello Widget',
  platforms: {
    ios: {
      deploymentTarget: '18.0',
      colors: {
        $accent: '#007AFF',
        $widgetBackground: { light: '#F2F2F7', dark: '#1C1C1E' },
      },
    },
  },
});

export type HelloWidgetData = {
  message: string;
  count?: number;
};
