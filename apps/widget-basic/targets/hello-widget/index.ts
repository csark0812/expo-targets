import { defineTarget } from 'expo-targets';

export const HelloWidget = defineTarget({
  type: 'widget',
  displayName: 'Hello Widget',
  platforms: ['ios'],
  ios: {
    colors: {
      $widgetBackground: { light: '#F2F2F7', dark: '#1C1C1E' },
    },
  },
});

export type HelloWidgetData = {
  message: string;
  count?: number;
};
