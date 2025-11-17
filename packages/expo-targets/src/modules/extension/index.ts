import { requireNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

const ExpoTargetsExtensionModule = requireNativeModule('ExpoTargetsExtension');

export interface SharedData {
  text?: string;
  url?: string;
  images?: string[];
  webpageUrl?: string;
  webpageTitle?: string;
  preprocessedData?: any;
}

export class Extension {
  close() {
    console.log('[Extension] close() called, platform:', Platform.OS);
    if (Platform.OS === 'ios') {
      console.log('[Extension] Calling native closeExtension()');
      ExpoTargetsExtensionModule.closeExtension();
      console.log('[Extension] Native closeExtension() returned');
    }
  }

  openHostApp(path: string = '') {
    if (Platform.OS === 'ios') {
      ExpoTargetsExtensionModule.openHostApp(path);
    }
  }

  getSharedData(): SharedData | null {
    if (Platform.OS === 'ios') {
      return ExpoTargetsExtensionModule.getSharedData();
    }
    return null;
  }
}

export const close = () => {
  const ext = new Extension();
  ext.close();
};

export const openHostApp = (path: string = '') => {
  const ext = new Extension();
  ext.openHostApp(path);
};

export const getSharedData = (): SharedData | null => {
  const ext = new Extension();
  return ext.getSharedData();
};

export type { SharedData as ExtensionSharedData };
