import { createTarget } from 'expo-targets';

export const helloWidget = createTarget('HelloWidget');
export const helloWidgetLiveActivity = helloWidget.liveActivity();

export const updateMessage = (message: string) => {
  helloWidget.setData({ message });
  helloWidget.refresh();
};

export const getMessage = (): string | null => {
  const data = helloWidget.getData<{ message?: string }>();
  return data?.message || null;
};
