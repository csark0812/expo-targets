import { StatusBar } from 'expo-status-bar';
import { LiveActivity } from 'expo-targets';
import { useCallback, useEffect, useState } from 'react';
import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getMessage, helloWidget, updateMessage } from './targets/hello-widget';

/** Seeded host marker for Devicewright (avoid `|` — can confuse AX splits). */
export const UITEST_WIDGET_SEED = 'Hello from host · family:systemSmall';

function PayloadButtons({ refresh }: { refresh: () => void }) {
  return (
    <>
      <TouchableOpacity
        testID="btn-seed-payload"
        style={styles.button}
        onPress={() => {
          updateMessage(UITEST_WIDGET_SEED);
          refresh();
        }}
      >
        <Text style={styles.buttonText}>Seed payload</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-clear-payload"
        style={styles.button}
        onPress={() => {
          helloWidget.setData({ message: '' });
          helloWidget.refresh();
          refresh();
        }}
      >
        <Text style={styles.buttonText}>Clear payload</Text>
      </TouchableOpacity>
    </>
  );
}

function LiveActivityControls({
  liveId,
  setLiveId,
  liveStatus,
  setLiveStatus,
}: {
  liveId: string | null;
  setLiveId: (id: string | null) => void;
  liveStatus: string;
  setLiveStatus: (status: string) => void;
}) {
  return (
    <>
      <TouchableOpacity
        testID="btn-live-start"
        style={styles.button}
        onPress={() => {
          void (async () => {
            if (!(await LiveActivity.areActivitiesEnabled())) {
              setLiveStatus('disabled');
              return;
            }
            const order = LiveActivity.create('HelloWidgetAttributes');
            const id = await order.start({
              attributes: { title: 'Hello' },
              contentState: { status: 'preparing' },
            });
            setLiveId(id);
            setLiveStatus(`started:${id.slice(0, 8)}`);
          })();
        }}
      >
        <Text style={styles.buttonText}>
          {Platform.OS === 'android'
            ? 'Start LiveActivity (ongoing notif)'
            : 'Start Live Activity'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-live-update"
        style={styles.button}
        onPress={() => {
          void (async () => {
            if (!liveId) {
              setLiveStatus('no-id');
              return;
            }
            await LiveActivity.update(liveId, { status: 'ready' });
            setLiveStatus('updated:ready');
          })();
        }}
      >
        <Text style={styles.buttonText}>Update Live Activity</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="btn-live-end"
        style={styles.button}
        onPress={() => {
          void (async () => {
            if (liveId) {
              await LiveActivity.end(liveId);
            } else {
              await LiveActivity.endAll();
            }
            setLiveId(null);
            setLiveStatus('ended');
          })();
        }}
      >
        <Text style={styles.buttonText}>End Live Activity</Text>
      </TouchableOpacity>
      <Text testID="text-live-status" style={styles.payload}>
        {liveStatus}
      </Text>
    </>
  );
}

function PayloadReadout({ payload }: { payload: string }) {
  return (
    <>
      <Text
        testID="text-last-payload"
        style={styles.payload}
        numberOfLines={4}
        accessibilityLabel={payload}
      >
        {payload}
      </Text>
      <Text testID="text-seed-message" style={styles.payload}>
        {payload.includes('Hello from host')
          ? 'seed:Hello from host'
          : `seed-miss:${payload}`}
      </Text>
      <Text testID="text-seed-family" style={styles.payload}>
        {payload.includes('family:systemSmall')
          ? 'seed:family:systemSmall'
          : `family-miss:${payload}`}
      </Text>
    </>
  );
}

export default function App() {
  const [payload, setPayload] = useState('none');
  const [ready, setReady] = useState(false);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState('idle');

  const refresh = useCallback(() => {
    setPayload(getMessage() ?? 'none');
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <View style={styles.container} testID="screen-root">
      <StatusBar style="auto" />
      <Text style={styles.title}>Widgets example</Text>
      <Text testID="status-target-ready">{ready ? 'ready' : 'loading'}</Text>
      <Text testID="text-widget-families">
        families:systemSmall,systemMedium
      </Text>
      <Text testID="text-widget-intent-note">
        intent: StaticConfiguration · seed family:systemSmall
      </Text>
      <PayloadButtons refresh={refresh} />
      <LiveActivityControls
        liveId={liveId}
        setLiveId={setLiveId}
        liveStatus={liveStatus}
        setLiveStatus={setLiveStatus}
      />
      <PayloadReadout payload={payload} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700' },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600' },
  payload: { fontFamily: 'Courier', fontSize: 12 },
});
