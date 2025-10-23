import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View, Button, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { HelloWidget } from './targets/hello-widget';

export default function App() {
  const [message, setMessage] = useState('');
  const [currentValue, setCurrentValue] = useState('');

  const updateWidget = () => {
    if (message.trim()) {
      HelloWidget.set('message', message);
      HelloWidget.refresh();
      setMessage('');
      Alert.alert('Success', 'Widget updated! Check your home screen.');
    }
  };

  const readValue = () => {
    const value = HelloWidget.get('message');
    setCurrentValue(value || 'No value stored');
  };

  const clearData = () => {
    HelloWidget.remove('message');
    HelloWidget.refresh();
    setCurrentValue('');
    Alert.alert('Success', 'Widget data cleared!');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Widget Basic Test</Text>
      <Text style={styles.subtitle}>Update your widget from the app</Text>

      <View style={styles.section}>
        <TextInput
          style={styles.input}
          placeholder="Enter message for widget"
          value={message}
          onChangeText={setMessage}
        />
        <Button title="Update Widget" onPress={updateWidget} />
      </View>

      <View style={styles.section}>
        <Button title="Read Current Value" onPress={readValue} />
        {currentValue ? (
          <Text style={styles.value}>Current: {currentValue}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Button title="Clear Widget Data" onPress={clearData} color="red" />
      </View>

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
  },
  section: {
    width: '100%',
    marginVertical: 12,
    gap: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 8,
  },
  value: {
    marginTop: 8,
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
  },
});
