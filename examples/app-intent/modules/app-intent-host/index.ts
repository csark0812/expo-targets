import { requireNativeModule } from 'expo-modules-core';

type AppIntentHostNative = {
  donateShortcuts(): Promise<string>;
};

const native = requireNativeModule<AppIntentHostNative>('AppIntentHost');

export async function donateShortcuts(): Promise<string> {
  return native.donateShortcuts();
}
