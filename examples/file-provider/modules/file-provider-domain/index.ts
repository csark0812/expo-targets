import { requireNativeModule } from 'expo-modules-core';

type FileProviderDomainNative = {
  register(): Promise<string>;
  unregister(): Promise<void>;
};

const native =
  requireNativeModule<FileProviderDomainNative>('FileProviderDomain');

export async function registerFileDomain(): Promise<string> {
  return native.register();
}

export async function unregisterFileDomain(): Promise<void> {
  return native.unregister();
}
