import { createTarget } from 'expo-targets';

export const demoWidget = createTarget('DemoWidget');

export const updateWidget = (message: string) => {
  demoWidget.setData({ message });
  demoWidget.refresh();
};

