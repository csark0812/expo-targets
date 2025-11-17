import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { demoActionTarget } from '../index';

interface ActionExtensionProps {
  images?: string[];
}

export default function ActionExtension(props: ActionExtensionProps) {
  const handleProcess = () => {
    demoActionTarget.setData({
      processedAt: new Date().toISOString(),
      imageCount: props.images?.length || 0,
    });
    demoActionTarget.close();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Demo Action Extension</Text>
      <Text style={styles.subtitle}>React Native UI</Text>
      {props.images && (
        <Text style={styles.content}>
          Processing {props.images.length} image(s)
        </Text>
      )}
      <TouchableOpacity style={styles.button} onPress={handleProcess}>
        <Text style={styles.buttonText}>Process</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.cancelButton]}
        onPress={() => demoActionTarget.close()}
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

