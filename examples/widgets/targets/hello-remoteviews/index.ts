import { createTarget } from 'expo-targets';

export const helloRemoteViews = createTarget('HelloRemoteViews');

export const updateRemoteViewsMessage = (message: string) => {
  helloRemoteViews.setData({ message });
  helloRemoteViews.refresh();
};

export const getRemoteViewsMessage = (): string | null => {
  const data = helloRemoteViews.getData<{ message?: string }>();
  return data?.message || null;
};
