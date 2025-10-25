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

// Update weather data
export const updateWeather = async (data: WeatherData) => {
  await weatherWidget.set('weather', data);
};

// Get current weather data
export const getWeatherData = async (): Promise<WeatherData | null> => {
  const data = weatherWidget.get('weather');
  return data ? JSON.parse(data) : null;
};

// Clear weather data
export const clearWeather = async () => {
  await weatherWidget.remove('weather');
};
