import { requireNativeModule } from 'expo-modules-core';

type Native = {
  start(title: string, status: string): Promise<string>;
  endAll(): Promise<void>;
};

const native = requireNativeModule<Native>('TrickLiveActivity');

export async function startLiveActivity(
  title = 'ET Trick',
  status = 'live'
): Promise<string> {
  return native.start(title, status);
}

export async function endAllLiveActivities(): Promise<void> {
  return native.endAll();
}
