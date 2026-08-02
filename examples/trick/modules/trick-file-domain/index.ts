import { requireNativeModule } from 'expo-modules-core';

type TrickFileDomainNative = {
  register(): Promise<string>;
  unregister(): Promise<void>;
};

const native = requireNativeModule<TrickFileDomainNative>('TrickFileDomain');

export async function registerFileDomain(): Promise<string> {
  return native.register();
}

export async function unregisterFileDomain(): Promise<void> {
  return native.unregister();
}
