import { createTarget } from 'expo-targets';

export interface WidgetData {
  message?: string;
  isLoggedIn?: boolean;
  username?: string;
  avatarURL?: string;
  weatherIcon?: string;
  temperature?: number;
}

export const demoWidget = createTarget('DemoWidget');

export const updateWidget = (message: string) => {
  const currentData = demoWidget.getData<WidgetData>() || {};
  demoWidget.setData({ ...currentData, message });
  demoWidget.refresh();
};

export const setWidgetAuthStatus = (
  isLoggedIn: boolean,
  username?: string,
  avatarURL?: string
) => {
  const currentData = demoWidget.getData<WidgetData>() || {};
  demoWidget.setData({ ...currentData, isLoggedIn, username, avatarURL });
  demoWidget.refresh();
};

export const setWidgetWeather = (icon: string, temperature: number) => {
  const currentData = demoWidget.getData<WidgetData>() || {};
  demoWidget.setData({
    ...currentData,
    weatherIcon: icon,
    temperature,
  });
  demoWidget.refresh();
};

export const setWidgetAvatar = (avatarURL: string) => {
  const currentData = demoWidget.getData<WidgetData>() || {};
  demoWidget.setData({ ...currentData, avatarURL });
  demoWidget.refresh();
};
