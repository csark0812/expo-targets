import { defineTarget } from 'expo-targets';

export const weatherWidget = defineTarget({
  type: 'widget',
  name: 'WeatherWidget',
  displayName: 'Weather',
  platforms: ['ios'],
  appGroup: 'group.com.test.widgetinteractive',
  ios: {
    deploymentTarget: '17.0',
    bundleIdentifier: 'com.test.widgetinteractive.weather',
    displayName: 'Weather Widget',
    colors: {
      AccentColor: { light: '#007AFF', dark: '#0A84FF' },
      SunnyColor: { light: '#FFB800', dark: '#FFD60A' },
      CloudyColor: { light: '#8E8E93', dark: '#98989D' },
      RainyColor: { light: '#5AC8FA', dark: '#64D2FF' },
      BackgroundColor: { light: '#FFFFFF', dark: '#1C1C1E' },
      TextPrimary: { light: '#000000', dark: '#FFFFFF' },
      TextSecondary: { light: '#666666', dark: '#98989D' },
    },
  },
});

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
  await weatherWidget.setData('weather', data);
};

// Get current weather data
export const getWeatherData = async (): Promise<WeatherData | null> => {
  return await weatherWidget.getData('weather');
};

// Clear weather data
export const clearWeather = async () => {
  await weatherWidget.remove('weather');
};
