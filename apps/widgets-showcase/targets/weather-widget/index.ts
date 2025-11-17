import { createTarget } from 'expo-targets';

export const weatherWidget = createTarget('WeatherWidget');

export interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
  humidity: number;
  windSpeed: number;
  lastUpdated: string;
}

export const updateWeather = (data: WeatherData) => {
  weatherWidget.setData({ weather: data });
  weatherWidget.refresh();
};

export const getWeatherData = (): WeatherData | null => {
  const data = weatherWidget.getData<{ weather: WeatherData }>();
  return data?.weather || null;
};

export const clearWeather = () => {
  weatherWidget.setData({ weather: null });
  weatherWidget.refresh();
};
