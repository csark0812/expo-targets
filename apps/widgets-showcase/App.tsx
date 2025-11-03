import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { updateMessage, getMessage } from './targets/hello-widget';
import {
  updateCounter,
  incrementCounter,
  decrementCounter,
  resetCounter,
  getCounter,
} from './targets/counter-widget';
import {
  weatherWidget,
  updateWeather,
  getWeatherData,
  type WeatherData,
} from './targets/weather-widget';

export default function App() {
  const [selectedWidget, setSelectedWidget] = useState<
    'hello' | 'counter' | 'weather'
  >('hello');

  // Hello Widget State
  const [helloMessage, setHelloMessage] = useState('');

  // Counter Widget State
  const [counterLabel, setCounterLabel] = useState('');
  const [counter, setCounter] = useState(0);

  // Weather Widget State
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
    loadAllWidgetData();
  }, []);

  useEffect(() => {
    if (autoUpdate && selectedWidget === 'weather') {
      const interval = setInterval(simulateWeatherUpdate, 30000);
      return () => clearInterval(interval);
    }
  }, [autoUpdate, selectedWidget]);

  const loadAllWidgetData = () => {
    const msg = getMessage();
    if (msg) setHelloMessage(msg);

    const counterData = getCounter();
    if (counterData) {
      setCounter(counterData.count || 0);
      setCounterLabel(counterData.label || '');
    }

    const weatherData = getWeatherData();
    if (weatherData) {
      setWeather(weatherData);
    }
  };

  const simulateWeatherUpdate = () => {
    const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy', 'Clear'];
    const randomCondition =
      conditions[Math.floor(Math.random() * conditions.length)];
    const randomTemp = Math.floor(Math.random() * 30) + 60;
    const randomHumidity = Math.floor(Math.random() * 40) + 40;
    const randomWind = Math.floor(Math.random() * 15) + 3;

    const newWeather = {
      ...weather,
      temperature: randomTemp,
      condition: randomCondition,
      humidity: randomHumidity,
      windSpeed: randomWind,
      lastUpdated: new Date().toLocaleTimeString(),
    };

    setWeather(newWeather);
    updateWeather(newWeather);
    weatherWidget.refresh();
  };

  const handleHelloUpdate = () => {
    if (!helloMessage.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }
    updateMessage(helloMessage);
    Alert.alert('Success', 'Hello Widget updated!');
  };

  const handleCounterIncrement = () => {
    incrementCounter();
    const data = getCounter();
    if (data) setCounter(data.count || 0);
  };

  const handleCounterDecrement = () => {
    decrementCounter();
    const data = getCounter();
    if (data) setCounter(data.count || 0);
  };

  const handleCounterUpdate = () => {
    updateCounter(counter, counterLabel || undefined);
    Alert.alert('Success', 'Counter Widget updated!');
  };

  const handleCounterReset = () => {
    resetCounter();
    setCounter(0);
    setCounterLabel('');
    Alert.alert('Success', 'Counter Widget reset!');
  };

  const changeLocation = (location: string) => {
    const newWeather = { ...weather, location };
    setWeather(newWeather);
    updateWeather(newWeather);
  };

  const locations = ['San Francisco', 'New York', 'London', 'Tokyo', 'Sydney'];

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />

      <ScrollView style={styles.content}>
        <Text style={styles.title}>📱 Widgets Showcase</Text>
        <Text style={styles.subtitle}>
          Explore different widget development patterns
        </Text>

        {/* Widget Selector */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Widget</Text>
          <View style={styles.widgetSelector}>
            <TouchableOpacity
              style={[
                styles.widgetButton,
                selectedWidget === 'hello' && styles.widgetButtonActive,
              ]}
              onPress={() => setSelectedWidget('hello')}
            >
              <Text
                style={[
                  styles.widgetButtonText,
                  selectedWidget === 'hello' && styles.widgetButtonTextActive,
                ]}
              >
                Hello
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.widgetButton,
                selectedWidget === 'counter' && styles.widgetButtonActive,
              ]}
              onPress={() => setSelectedWidget('counter')}
            >
              <Text
                style={[
                  styles.widgetButtonText,
                  selectedWidget === 'counter' && styles.widgetButtonTextActive,
                ]}
              >
                Counter
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.widgetButton,
                selectedWidget === 'weather' && styles.widgetButtonActive,
              ]}
              onPress={() => setSelectedWidget('weather')}
            >
              <Text
                style={[
                  styles.widgetButtonText,
                  selectedWidget === 'weather' && styles.widgetButtonTextActive,
                ]}
              >
                Weather
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Hello Widget Controls */}
        {selectedWidget === 'hello' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>⭐ Hello Widget (Basic)</Text>
            <Text style={styles.description}>
              Simple widget displaying a custom message. Supports systemSmall
              size only.
            </Text>

            <View style={styles.section}>
              <Text style={styles.label}>Message:</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter message for widget"
                value={helloMessage}
                onChangeText={setHelloMessage}
              />
            </View>

            <TouchableOpacity
              style={styles.updateButton}
              onPress={handleHelloUpdate}
            >
              <Text style={styles.updateButtonText}>Update Hello Widget</Text>
            </TouchableOpacity>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Widget Sizes:</Text>
              <Text style={styles.infoText}>• Small only</Text>
            </View>
          </View>
        )}

        {/* Counter Widget Controls */}
        {selectedWidget === 'counter' && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔢 Counter Widget (Medium)</Text>
            <Text style={styles.description}>
              Widget displaying a count with optional label. Supports
              systemSmall and systemMedium sizes.
            </Text>

            <View style={styles.section}>
              <Text style={styles.label}>Count: {counter}</Text>
              <View style={styles.row}>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={handleCounterDecrement}
                >
                  <Text style={styles.counterButtonText}>-</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.counterButton}
                  onPress={handleCounterIncrement}
                >
                  <Text style={styles.counterButtonText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Label (optional):</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Steps, Tasks, etc."
                value={counterLabel}
                onChangeText={setCounterLabel}
              />
            </View>

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.updateButton, styles.flex]}
                onPress={handleCounterUpdate}
              >
                <Text style={styles.updateButtonText}>Update</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.resetButton, styles.flex]}
                onPress={handleCounterReset}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Widget Sizes:</Text>
              <Text style={styles.infoText}>• Small: Count only</Text>
              <Text style={styles.infoText}>• Medium: Count + label</Text>
            </View>
          </View>
        )}

        {/* Weather Widget Controls */}
        {selectedWidget === 'weather' && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>🌤️ Weather Widget (Advanced)</Text>
              <Text style={styles.description}>
                Advanced widget with timeline entries, multiple sizes, and
                dynamic colors. Supports systemSmall, systemMedium, and
                systemLarge sizes.
              </Text>

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
                  <Text style={styles.detailValue}>
                    {weather.windSpeed} mph
                  </Text>
                </View>
              </View>

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
                <Text style={styles.updateButtonText}>
                  🔄 Update Weather Now
                </Text>
              </TouchableOpacity>
            </View>

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
                        weather.location === loc &&
                          styles.locationButtonTextActive,
                      ]}
                    >
                      {loc}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.infoBox}>
              <Text style={styles.infoTitle}>Widget Sizes:</Text>
              <Text style={styles.infoText}>
                • Small: Temperature & condition
              </Text>
              <Text style={styles.infoText}>
                • Medium: + Humidity & wind details
              </Text>
              <Text style={styles.infoText}>
                • Large: + 5-day forecast timeline
              </Text>
            </View>
          </>
        )}

        {/* Learning Path Info */}
        <View style={styles.infoCard}>
          <Text style={styles.infoEmoji}>💡</Text>
          <View style={styles.infoContent}>
            <Text style={styles.infoTitle}>Learning Path</Text>
            <Text style={styles.infoText}>
              Start with <Text style={styles.bold}>Hello Widget</Text> to learn
              basics, then try <Text style={styles.bold}>Counter Widget</Text>{' '}
              for medium complexity, and explore{' '}
              <Text style={styles.bold}>Weather Widget</Text> for advanced
              patterns like timelines and multiple sizes.
            </Text>
          </View>
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
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    lineHeight: 20,
  },
  section: {
    marginVertical: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  flex: {
    flex: 1,
  },
  updateButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  updateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  counterButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterButtonText: {
    color: 'white',
    fontSize: 32,
    fontWeight: 'bold',
  },
  widgetSelector: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  widgetButton: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  widgetButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  widgetButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  widgetButtonTextActive: {
    color: '#007AFF',
    fontWeight: '600',
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
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 16,
  },
  controlLabel: {
    fontSize: 16,
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
  infoBox: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  infoEmoji: {
    fontSize: 32,
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  bold: {
    fontWeight: '600',
  },
});
