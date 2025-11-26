import { createTarget } from 'expo-targets';

export const simpleRemoteviewsWidget = createTarget('simple-remoteviews');

export interface SimpleRemoteviewsData {
  title: string;
  message: string;
}

export const updateWidget = (data: SimpleRemoteviewsData) => {
  simpleRemoteviewsWidget.setData(data);
  simpleRemoteviewsWidget.refresh();
};

export const getWidgetData = (): SimpleRemoteviewsData | null => {
  return simpleRemoteviewsWidget.getData<SimpleRemoteviewsData>();
};
