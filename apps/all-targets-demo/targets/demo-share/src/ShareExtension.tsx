import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { demoShareTarget } from '../index';

interface ShareExtensionProps {
  text?: string;
  url?: string;
  images?: string[];
}

export default function ShareExtension(props: ShareExtensionProps) {
  const handleSave = () => {
    demoShareTarget.setData({
      sharedAt: new Date().toISOString(),
      content: props,
    });
    demoShareTarget.close();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Demo Share Extension</Text>
      <Text style={styles.subtitle}>React Native UI</Text>
      {props.text && <Text style={styles.content}>Text: {props.text}</Text>}
      {props.url && <Text style={styles.content}>URL: {props.url}</Text>}
      {props.images && (
        <Text style={styles.content}>Images: {props.images.length}</Text>
      )}
      <TouchableOpacity style={styles.button} onPress={handleSave}>
        <Text style={styles.buttonText}>Save</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.cancelButton]}
        onPress={() => demoShareTarget.close()}
      >
        <Text style={cancelButtonTextStyle.buttonText}>Cancel</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  content: {
    fontSize: 14,
    marginBottom: 8,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  cancelButton: {
    backgroundColor: '#F2F2F7',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

const cancelButtonTextStyle = StyleSheet.create({
  buttonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '600',
  },
});

