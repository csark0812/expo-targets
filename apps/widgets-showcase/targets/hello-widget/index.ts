import { createTarget } from 'expo-targets';

export const helloWidget = createTarget('HelloWidget');

export interface HelloWidgetData {
  message: string;
}

export const updateMessage = (message: string) => {
  helloWidget.setData({ message });
  helloWidget.refresh();
};

export const getMessage = (): string | null => {
  const data = helloWidget.getData<HelloWidgetData>();
  return data?.message || null;
};
