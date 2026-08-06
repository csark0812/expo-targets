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

async function openAutofillSettings() {
  if (Platform.OS === 'android') {
    try {
      await Linking.sendIntent('android.settings.REQUEST_SET_AUTOFILL_SERVICE');
      return;
    } catch {
      // fall through
    }
  }
  await Linking.openSettings();
}

function CredentialsForm({
  user,
  pass,
  payload,
  setUser,
  setPass,
  setPayload,
}: {
  user: string;
  pass: string;
  payload: string;
  setUser: (v: string) => void;
  setPass: (v: string) => void;
  setPayload: (v: string) => void;
}) {
  return (
    <>
      <TextInput
        testID="input-username"
        style={styles.input}
        value={user}
        onChangeText={setUser}
        placeholder="username"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="username"
        importantForAutofill="yes"
      />
      <TextInput
        testID="input-password"
        style={styles.input}
        value={pass}
        onChangeText={setPass}
        placeholder="password"
        secureTextEntry
        textContentType="password"
        importantForAutofill="yes"
      />
      <TouchableOpacity
        testID="btn-open-autofill-settings"
        style={styles.button}
        onPress={() => {
          void openAutofillSettings();
          setPayload('opened-settings');
        }}
      >
        <Text style={styles.buttonText}>
          {Platform.OS === 'android'
            ? 'Open Autofill settings'
            : 'Open Settings'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-clear-payload"
        style={styles.button}
        onPress={() => {
          setUser('');
          setPass('');
          setPayload('none');
        }}
      >
        <Text style={styles.buttonText}>Clear</Text>
      </TouchableOpacity>
      <Text testID="text-last-payload" style={styles.payload}>
        {payload}
      </Text>
    </>
  );
}

export default function App() {
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [payload, setPayload] = useState('none');

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>ET Creds</Text>
      <Text testID="status-target-ready">ready</Text>
      <Text testID="text-extension-type">credentials-provider</Text>
      <Text testID="text-bundle-suffix">
        com.expotargets.example.credentials-provider
      </Text>
      <Text style={styles.hint} testID="text-platform-note">
        {Platform.OS === 'android'
          ? 'Android: AutofillService registered; set preferred service in Settings (leftover).'
          : 'iOS: Credential Provider extension + AutoFill Settings.'}
      </Text>
      <CredentialsForm
        user={user}
        pass={pass}
        payload={payload}
        setUser={setUser}
        setPass={setPass}
        setPayload={setPayload}
      />
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  payload: { fontFamily: 'Courier', fontSize: 12 },
});
