import { createTarget } from 'expo-targets';

export const helloRemoteViewsBundle = createTarget('HelloRemoteViewsBundle');

export const updateBundleMessage = (message: string) => {
  helloRemoteViewsBundle.setData({ message });
  helloRemoteViewsBundle.refresh();
};
