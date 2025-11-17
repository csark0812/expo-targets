import { createTarget } from 'expo-targets';

export const simpleWidget = createTarget('SimpleWidget');

export const updateMessage = (message: string) => {
  simpleWidget.setData({ message });
  simpleWidget.refresh();
};

export const getMessage = (): string | null => {
  const data = simpleWidget.getData<{ message: string }>();
  return data?.message || null;
};

