import { createTarget } from 'expo-targets';

export const counterWidget = createTarget('CounterWidget');

export interface CounterData {
  count: number;
  label?: string;
}

export const updateCounter = (count: number, label?: string) => {
  counterWidget.setData({ count, label });
  counterWidget.refresh();
};

export const incrementCounter = () => {
  const data = counterWidget.getData<CounterData>() || { count: 0 };
  updateCounter((data.count || 0) + 1, data.label);
};

export const decrementCounter = () => {
  const data = counterWidget.getData<CounterData>() || { count: 0 };
  updateCounter(Math.max(0, (data.count || 0) - 1), data.label);
};

export const resetCounter = () => {
  updateCounter(0);
};

export const getCounter = (): CounterData | null => {
  return counterWidget.getData<CounterData>();
};
