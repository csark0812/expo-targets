import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import {
  weatherWidget,
  updateWeather,
  getWeatherData,
} from './targets/weather-widget';

interface WeatherData {
  temperature: number;
  condition: string;
  location: string;
  humidity: number;
  windSpeed: number;
  lastUpdated: string;
}

export default function App() {
  const [weather, setWeather] = useState<WeatherData>({
    temperature: 72,
    condition: 'Sunny',
    location: 'San Francisco',
    humidity: 65,
    windSpeed: 8,
    lastUpdated: new Date().toLocaleTimeString(),
  });

  const [autoUpdate, setAutoUpdate] = useState(false);

  useEffect(() => {
    loadWeather();
  }, []);

  useEffect(() => {
    if (autoUpdate) {
      const interval = setInterval(simulateWeatherUpdate, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoUpdate]);

  const loadWeather = async () => {
    const data = await getWeatherData();
    if (data) {
      setWeather(data);
    }
  };

  const simulateWeatherUpdate = async () => {
    const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy', 'Clear'];
    const randomCondition =
      conditions[Math.floor(Math.random() * conditions.length)];
    const randomTemp = Math.floor(Math.random() * 30) + 60; // 60-90°F
    const randomHumidity = Math.floor(Math.random() * 40) + 40; // 40-80%
    const randomWind = Math.floor(Math.random() * 15) + 3; // 3-18 mph

    const newWeather = {
      ...weather,
      temperature: randomTemp,
      condition: randomCondition,
      humidity: randomHumidity,
      windSpeed: randomWind,
      lastUpdated: new Date().toLocaleTimeString(),
    };

    setWeather(newWeather);
    await updateWeather(newWeather);
    await weatherWidget.refresh();
  };

  const changeLocation = async (location: string) => {
    const newWeather = { ...weather, location };
    setWeather(newWeather);
    await updateWeather(newWeather);
    await weatherWidget.refresh();
  };

  const locations = ['San Francisco', 'New York', 'London', 'Tokyo', 'Sydney'];

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <ScrollView style={styles.content}>
        <Text style={styles.title}>🌤️ Weather Widget</Text>
        <Text style={styles.subtitle}>
          Interactive widget with timeline updates
        </Text>

        {/* Current Weather */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Current Weather</Text>
          <View style={styles.weatherDisplay}>
            <Text style={styles.temperature}>{weather.temperature}°F</Text>
            <Text style={styles.condition}>{weather.condition}</Text>
            <Text style={styles.location}>{weather.location}</Text>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Humidity</Text>
              <Text style={styles.detailValue}>{weather.humidity}%</Text>
            </View>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Wind</Text>
              <Text style={styles.detailValue}>{weather.windSpeed} mph</Text>
            </View>
          </View>

          <Text style={styles.updateTime}>
            Last updated: {weather.lastUpdated}
          </Text>
        </View>

        {/* Controls */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Widget Controls</Text>

          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>Auto-update (30s)</Text>
            <Switch
              value={autoUpdate}
              onValueChange={setAutoUpdate}
              trackColor={{ false: '#767577', true: '#007AFF' }}
            />
          </View>

          <TouchableOpacity
            style={styles.updateButton}
            onPress={simulateWeatherUpdate}
          >
            <Text style={styles.updateButtonText}>🔄 Update Weather Now</Text>
          </TouchableOpacity>
        </View>

        {/* Location Selection */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Change Location</Text>
          <View style={styles.locationGrid}>
            {locations.map((loc) => (
              <TouchableOpacity
                key={loc}
                style={[
                  styles.locationButton,
                  weather.location === loc && styles.locationButtonActive,
                ]}
                onPress={() => changeLocation(loc)}
              >
                <Text
                  style={[
                    styles.locationButtonText,
                    weather.location === loc && styles.locationButtonTextActive,
                  ]}
                >
                  {loc}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Widget Sizes Info */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Widget Sizes</Text>
          <View style={styles.sizeInfo}>
            <Text style={styles.sizeItem}>
              📱 Small: Temperature & condition
            </Text>
            <Text style={styles.sizeItem}>📱 Medium: + humidity & wind</Text>
            <Text style={styles.sizeItem}>
              📱 Large: + 5-day forecast timeline
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoEmoji}>💡</Text>
          <Text style={styles.infoText}>
            This widget uses Timeline Entries to show different content
            throughout the day. Widget updates automatically refresh all sizes!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginTop: 60,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  weatherDisplay: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  temperature: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  condition: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: 8,
  },
  location: {
    fontSize: 18,
    color: '#666',
    marginTop: 4,
  },
  detailsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  updateTime: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: 12,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlLabel: {
    fontSize: 16,
  },
  updateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  updateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  locationButton: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  locationButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  locationButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  locationButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  sizeInfo: {
    gap: 12,
  },
  sizeItem: {
    fontSize: 15,
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  infoEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
});
