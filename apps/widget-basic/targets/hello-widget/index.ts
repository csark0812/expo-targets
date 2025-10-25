import { createTarget } from 'expo-targets';

export const HelloWidget = createTarget('hello-widget');

export type HelloWidgetData = {
  message: string;
  count?: number;
};
