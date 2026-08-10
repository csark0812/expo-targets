import { StatusBar } from 'expo-status-bar';
import { LiveActivity, requestPinWidget } from 'expo-targets';
import { type ReactNode, useCallback, useEffect, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  getExpoUiMessage,
  helloExpoUi,
  updateExpoUiMessage,
} from './targets/hello-expo-ui';
import {
  getRemoteViewsMessage,
  helloRemoteViews,
  updateRemoteViewsMessage,
} from './targets/hello-remoteviews';
import { getMessage, helloWidget, updateMessage } from './targets/hello-widget';

/** Seeded host markers for Devicewright (avoid `|` — can confuse AX splits). */
export const UITEST_WIDGET_SEED = 'Hello from host · family:systemSmall';
export const UITEST_EXPO_UI_SEED = 'Hello from host · expo-ui';
export const UITEST_REMOTEVIEWS_SEED = 'Hello from host · remoteviews';

type ActionButtonProps = {
  testID: string;
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'danger';
};

function ActionButton({
  testID,
  label,
  onPress,
  tone = 'primary',
}: ActionButtonProps) {
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        tone === 'secondary' && styles.buttonSecondary,
        tone === 'danger' && styles.buttonDanger,
        pressed && styles.buttonPressed,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          tone === 'secondary' && styles.buttonTextSecondary,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Section({
  eyebrow,
  title,
  body,
  children,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
      <View style={styles.sectionActions}>{children}</View>
    </View>
  );
}

function PayloadLine({
  testID,
  value,
  accessibilityLabel,
}: {
  testID: string;
  value: string;
  accessibilityLabel?: string;
}) {
  return (
    <Text
      testID={testID}
      style={styles.mono}
      numberOfLines={3}
      accessibilityLabel={accessibilityLabel ?? value}
    >
      {value}
    </Text>
  );
}

function useWidgetsHostState() {
  const [payload, setPayload] = useState('none');
  const [expoUiPayload, setExpoUiPayload] = useState('none');
  const [remoteViewsPayload, setRemoteViewsPayload] = useState('none');
  const [ready, setReady] = useState(false);
  const [liveId, setLiveId] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState('idle');
  const [pinStatus, setPinStatus] = useState('idle');

  const refresh = useCallback(() => {
    setPayload(getMessage() ?? 'none');
    setExpoUiPayload(getExpoUiMessage() ?? 'none');
    setRemoteViewsPayload(getRemoteViewsMessage() ?? 'none');
    setReady(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const seedAll = () => {
    updateMessage(UITEST_WIDGET_SEED);
    updateExpoUiMessage(UITEST_EXPO_UI_SEED);
    updateRemoteViewsMessage(UITEST_REMOTEVIEWS_SEED);
    refresh();
  };

  const clearAll = () => {
    helloWidget.setData({ message: '' });
    helloWidget.refresh();
    helloExpoUi.setData({ message: '' }, { refresh: true });
    helloRemoteViews.setData({ message: '' });
    helloRemoteViews.refresh();
    refresh();
  };

  return {
    payload,
    expoUiPayload,
    remoteViewsPayload,
    ready,
    liveId,
    setLiveId,
    liveStatus,
    setLiveStatus,
    pinStatus,
    setPinStatus,
    seedAll,
    clearAll,
  };
}

function Hero({ ready }: { ready: boolean }) {
  return (
    <View style={styles.hero}>
      <Text style={styles.brand}>ET Widgets</Text>
      <Text style={styles.heroTitle}>Three Android widget modes</Text>
      <Text style={styles.heroBody}>
        Native Glance, Expo UI Glance, and RemoteViews — seed from the host, pin
        to the launcher, assert the tile.
      </Text>
      <Text testID="status-target-ready" style={styles.ready}>
        {ready ? 'ready' : 'loading'}
      </Text>
      <Text testID="text-widget-families" style={styles.meta}>
        families:systemSmall,systemMedium
      </Text>
      <Text testID="text-widget-intent-note" style={styles.meta}>
        intent: StaticConfiguration · seed family:systemSmall
      </Text>
      <Text testID="text-expo-ui-mode" style={styles.meta}>
        mode:expo-ui · HelloExpoUi
      </Text>
      <Text testID="text-remoteviews-mode" style={styles.meta}>
        mode:remoteviews · HelloRemoteViews
      </Text>
    </View>
  );
}

function Diagnostics({
  payload,
  expoUiPayload,
  remoteViewsPayload,
  pinStatus,
}: {
  payload: string;
  expoUiPayload: string;
  remoteViewsPayload: string;
  pinStatus: string;
}) {
  return (
    <View style={styles.diagnostics}>
      <Text style={styles.eyebrow}>Diagnostics</Text>
      <Text style={styles.sectionTitle}>Payloads</Text>
      <PayloadLine
        testID="text-last-payload"
        value={payload}
        accessibilityLabel={payload}
      />
      <PayloadLine
        testID="text-seed-message"
        value={
          payload.includes('Hello from host')
            ? 'seed:Hello from host'
            : `seed-miss:${payload}`
        }
      />
      <PayloadLine
        testID="text-seed-family"
        value={
          payload.includes('family:systemSmall')
            ? 'seed:family:systemSmall'
            : `family-miss:${payload}`
        }
      />
      <PayloadLine
        testID="text-expo-ui-payload"
        value={expoUiPayload}
        accessibilityLabel={expoUiPayload}
      />
      <PayloadLine
        testID="text-expo-ui-seed"
        value={
          expoUiPayload.includes('expo-ui')
            ? 'seed:expo-ui'
            : `expo-ui-miss:${expoUiPayload}`
        }
      />
      <PayloadLine
        testID="text-remoteviews-payload"
        value={remoteViewsPayload}
        accessibilityLabel={remoteViewsPayload}
      />
      <PayloadLine
        testID="text-remoteviews-seed"
        value={
          remoteViewsPayload.includes('remoteviews')
            ? 'seed:remoteviews'
            : `remoteviews-miss:${remoteViewsPayload}`
        }
      />
      <Text testID="text-pin-status" style={styles.mono}>
        {pinStatus}
      </Text>
    </View>
  );
}

function AndroidPinButton({
  testID,
  label,
  targetName,
  setPinStatus,
}: {
  testID: string;
  label: string;
  targetName: string;
  setPinStatus: (status: string) => void;
}) {
  if (Platform.OS !== 'android') {
    return <Text style={styles.sectionBody}>Pin is Android-only.</Text>;
  }
  return (
    <ActionButton
      testID={testID}
      label={label}
      onPress={() => {
        setPinStatus(`${targetName}:${requestPinWidget(targetName)}`);
      }}
    />
  );
}

function PinSections({
  setPinStatus,
}: {
  setPinStatus: (status: string) => void;
}) {
  return (
    <>
      <Section
        eyebrow="Glance · native"
        title="Hello Widget"
        body="WidgetKit twin on iOS. Android uses Glance + Live Activity ongoing notification."
      >
        <AndroidPinButton
          testID="btn-pin-hello-widget"
          label="Pin Hello Widget"
          targetName="HelloWidget"
          setPinStatus={setPinStatus}
        />
      </Section>
      <Section
        eyebrow="Glance · expo-ui"
        title="Hello Expo UI"
        body="iOS layout sandbox via expo-widgets. Android Glance reads the same setData props."
      >
        <AndroidPinButton
          testID="btn-pin-hello-expo-ui"
          label="Pin Hello Expo UI"
          targetName="HelloExpoUi"
          setPinStatus={setPinStatus}
        />
      </Section>
      <Section
        eyebrow="RemoteViews"
        title="Hello RemoteViews"
        body="Classic XML AppWidget provider. Android-only dual for the glance path."
      >
        <AndroidPinButton
          testID="btn-pin-hello-remoteviews"
          label="Pin Hello RemoteViews"
          targetName="HelloRemoteViews"
          setPinStatus={setPinStatus}
        />
      </Section>
    </>
  );
}

async function startLiveActivity(
  setLiveId: (id: string | null) => void,
  setLiveStatus: (status: string) => void
) {
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
}

async function updateLiveActivity(
  liveId: string | null,
  setLiveStatus: (status: string) => void
) {
  if (!liveId) {
    setLiveStatus('no-id');
    return;
  }
  await LiveActivity.update(liveId, { status: 'ready' });
  setLiveStatus('updated:ready');
}

async function endLiveActivity(
  liveId: string | null,
  setLiveId: (id: string | null) => void,
  setLiveStatus: (status: string) => void
) {
  if (liveId) {
    await LiveActivity.end(liveId);
  } else {
    await LiveActivity.endAll();
  }
  setLiveId(null);
  setLiveStatus('ended');
}

function LiveActivitySection({
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
  const android = Platform.OS === 'android';
  return (
    <Section
      eyebrow="Live Activity"
      title={android ? 'Ongoing notification' : 'Live Activity'}
      body={
        android
          ? 'Android dual for HelloWidgetAttributes via ongoing notification.'
          : 'ActivityKit order for HelloWidgetAttributes.'
      }
    >
      <ActionButton
        testID="btn-live-start"
        label={
          android ? 'Start LiveActivity (ongoing notif)' : 'Start Live Activity'
        }
        onPress={() => {
          void startLiveActivity(setLiveId, setLiveStatus);
        }}
      />
      <ActionButton
        testID="btn-live-update"
        label="Update Live Activity"
        tone="secondary"
        onPress={() => {
          void updateLiveActivity(liveId, setLiveStatus);
        }}
      />
      <ActionButton
        testID="btn-live-end"
        label="End Live Activity"
        tone="danger"
        onPress={() => {
          void endLiveActivity(liveId, setLiveId, setLiveStatus);
        }}
      />
      <Text testID="text-live-status" style={styles.mono}>
        {liveStatus}
      </Text>
    </Section>
  );
}

export default function App() {
  const host = useWidgetsHostState();

  return (
    <View style={styles.root} testID="screen-root">
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Hero ready={host.ready} />
        <Section
          eyebrow="Host"
          title="Seed & clear"
          body="Writes SharedPreferences / App Group for every widget mode, then refreshes."
        >
          <ActionButton
            testID="btn-seed-payload"
            label="Seed payload"
            onPress={host.seedAll}
          />
          <ActionButton
            testID="btn-clear-payload"
            label="Clear payload"
            tone="secondary"
            onPress={host.clearAll}
          />
        </Section>
        <Diagnostics
          payload={host.payload}
          expoUiPayload={host.expoUiPayload}
          remoteViewsPayload={host.remoteViewsPayload}
          pinStatus={host.pinStatus}
        />
        <PinSections setPinStatus={host.setPinStatus} />
        <LiveActivitySection
          liveId={host.liveId}
          setLiveId={host.setLiveId}
          liveStatus={host.liveStatus}
          setLiveStatus={host.setLiveStatus}
        />
      </ScrollView>
    </View>
  );
}

const ink = '#0F172A';
const mist = '#E2E8F0';
const paper = '#F8FAFC';
const accent = '#0F766E';
const danger = '#B91C1C';

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: paper,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 48,
    gap: 18,
  },
  hero: {
    gap: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: mist,
  },
  brand: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: accent,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: ink,
    letterSpacing: -0.4,
  },
  heroBody: {
    fontSize: 15,
    lineHeight: 22,
    color: '#475569',
  },
  ready: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: accent,
  },
  meta: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 11,
    color: '#64748B',
  },
  diagnostics: {
    gap: 6,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: mist,
  },
  section: {
    gap: 8,
    paddingVertical: 4,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: '#64748B',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ink,
  },
  sectionBody: {
    fontSize: 14,
    lineHeight: 20,
    color: '#475569',
    marginBottom: 4,
  },
  sectionActions: {
    gap: 10,
  },
  button: {
    backgroundColor: accent,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonSecondary: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: mist,
  },
  buttonDanger: {
    backgroundColor: danger,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  buttonTextSecondary: {
    color: ink,
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
    fontSize: 12,
    lineHeight: 18,
    color: '#334155',
  },
});
