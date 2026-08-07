import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  Linking,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

/** Typed into the host field by Devicewright (custom keyboard inserts "ET"). */
export const UITEST_KEYBOARD_TYPED = 'ET';

async function openImeSettings() {
  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.settings.INPUT_METHOD_SETTINGS');
      return;
    } catch {
      // fall through
    }
  }
  await Linking.openSettings();
}

export default function App() {
  const [ready] = useState(true);
  const [value, setValue] = useState('');
  const [payload, setPayload] = useState('none');

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET Keyboard</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <Text testID="text-extension-type">keyboard</Text>
      <Text testID="text-bundle-suffix">com.expotargets.example.keyboard</Text>
      <Text style={styles.hint} testID="text-platform-note">
        {Platform.OS === 'android'
          ? 'Enable + select ET Keyboard (Settings → Language & input), then tap the ET key.'
          : 'Type with ET Keyboard (Settings → Keyboards) or system keyboard.'}
      </Text>
      <TextInput
        testID="input-type-field"
        accessibilityLabel="Type into field"
        style={styles.input}
        value={value}
        onChangeText={(text) => {
          setValue(text);
          setPayload(text.length ? `typed:${text}` : 'none');
        }}
        placeholder="Type into field"
        autoCorrect={false}
        autoCapitalize="none"
      />
      <TouchableOpacity
        testID="btn-open-ime-settings"
        style={styles.button}
        onPress={() => {
          void openImeSettings();
        }}
      >
        <Text style={styles.buttonText}>
          {Platform.OS === 'android' ? 'Open IME settings' : 'Open Settings'}
        </Text>
      </TouchableOpacity>
      {Platform.OS === 'android' ? (
        <TouchableOpacity
          testID="btn-show-ime-picker"
          style={styles.button}
          onPress={() => {
            void Linking.openURL('etkeyboard://ime-picker');
          }}
        >
          <Text style={styles.buttonText}>Choose keyboard</Text>
        </TouchableOpacity>
      ) : null}
      <TouchableOpacity
        testID="btn-clear-payload"
        style={styles.button}
        onPress={() => {
          setValue('');
          setPayload('none');
        }}
      >
        <Text style={styles.buttonText}>Clear</Text>
      </TouchableOpacity>
      <Text testID="text-last-payload" style={styles.payload}>
        {payload}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 10,
  },
  title: { fontSize: 20, fontWeight: '600', marginBottom: 12 },
  hint: { color: '#666', fontSize: 13, textAlign: 'center' },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 160,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  payload: { fontFamily: 'Courier', fontSize: 12 },
});
