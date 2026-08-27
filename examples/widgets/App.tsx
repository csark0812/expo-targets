import { StatusBar } from 'expo-status-bar';
import {
  addUserInteractionListener,
  areLiveActivitiesEnabled,
  LiveActivity,
  requestPinWidget,
} from 'expo-targets';
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
  helloExpoUiCompact,
  helloExpoUiLiveActivity,
  helloExpoUiLiveActivityHandle,
  updateExpoUiMessage,
} from './targets/hello-expo-ui';
import {
  getRemoteViewsMessage,
  helloRemoteViews,
  updateRemoteViewsMessage,
} from './targets/hello-remoteviews';
import { helloRemoteViewsBundle } from './targets/hello-remoteviews-bundle';
import {
  getMessage,
  helloWidget,
  helloWidgetLiveActivity,
  updateMessage,
} from './targets/hello-widget';

// Keep layout registration reachable (tree-shake guard).
void helloExpoUiLiveActivity;
void helloExpoUiCompact;

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

function useLivePair() {
  const [liveId, setLiveId] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState('idle');
  return { liveId, setLiveId, liveStatus, setLiveStatus };
}

function usePayloadState() {
  const [payload, setPayload] = useState('none');
  const [expoUiPayload, setExpoUiPayload] = useState('none');
  const [remoteViewsPayload, setRemoteViewsPayload] = useState('none');
  const refreshPayloads = useCallback(() => {
    setPayload(getMessage() ?? 'none');
    setExpoUiPayload(getExpoUiMessage() ?? 'none');
    setRemoteViewsPayload(getRemoteViewsMessage() ?? 'none');
  }, []);
  return { payload, expoUiPayload, remoteViewsPayload, refreshPayloads };
}

function seedAllPayloads(refresh: () => void) {
  updateMessage(UITEST_WIDGET_SEED);
  updateExpoUiMessage(UITEST_EXPO_UI_SEED);
  updateRemoteViewsMessage(UITEST_REMOTEVIEWS_SEED);
  helloRemoteViewsBundle.setData({ message: UITEST_REMOTEVIEWS_SEED });
  helloRemoteViewsBundle.refresh();
  refresh();
}

function clearAllPayloads(refresh: () => void) {
  helloWidget.setData({ message: '' });
  helloWidget.refresh();
  helloExpoUi.setData({ message: '' }, { refresh: true });
  helloRemoteViews.setData({ message: '' });
  helloRemoteViews.refresh();
  helloRemoteViewsBundle.setData({ message: '' });
  helloRemoteViewsBundle.refresh();
  refresh();
}

function useWidgetsHostState() {
  const payloads = usePayloadState();
  const [ready, setReady] = useState(false);
  const nativeLive = useLivePair();
  const expoUiLive = useLivePair();
  const [pinStatus, setPinStatus] = useState('idle');
  const [interaction, setInteraction] = useState('none');
  const refresh = useCallback(() => {
    payloads.refreshPayloads();
    setReady(true);
  }, [payloads.refreshPayloads]);

  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    const sub = addUserInteractionListener((event) => {
      setInteraction(`${event.source}:${event.target}`);
      refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return {
    payload: payloads.payload,
    expoUiPayload: payloads.expoUiPayload,
    remoteViewsPayload: payloads.remoteViewsPayload,
    ready,
    ...nativeLive,
    expoUiLiveId: expoUiLive.liveId,
    setExpoUiLiveId: expoUiLive.setLiveId,
    expoUiLiveStatus: expoUiLive.liveStatus,
    setExpoUiLiveStatus: expoUiLive.setLiveStatus,
    pinStatus,
    setPinStatus,
    interaction,
    seedAll: () => seedAllPayloads(refresh),
    clearAll: () => clearAllPayloads(refresh),
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

function seedLabel(opts: {
  value: string;
  needle: string;
  ok: string;
  miss: string;
}) {
  return opts.value.includes(opts.needle)
    ? opts.ok
    : `${opts.miss}:${opts.value}`;
}

function diagnosticRows(props: {
  payload: string;
  expoUiPayload: string;
  remoteViewsPayload: string;
  interaction: string;
}) {
  return [
    { testID: 'text-last-payload', value: props.payload, a11y: props.payload },
    {
      testID: 'text-seed-message',
      value: seedLabel({
        value: props.payload,
        needle: 'Hello from host',
        ok: 'seed:Hello from host',
        miss: 'seed-miss',
      }),
    },
    {
      testID: 'text-seed-family',
      value: seedLabel({
        value: props.payload,
        needle: 'family:systemSmall',
        ok: 'seed:family:systemSmall',
        miss: 'family-miss',
      }),
    },
    {
      testID: 'text-expo-ui-payload',
      value: props.expoUiPayload,
      a11y: props.expoUiPayload,
    },
    {
      testID: 'text-expo-ui-seed',
      value: seedLabel({
        value: props.expoUiPayload,
        needle: 'expo-ui',
        ok: 'seed:expo-ui',
        miss: 'expo-ui-miss',
      }),
    },
    {
      testID: 'text-expo-ui-interaction',
      value:
        props.interaction === 'none'
          ? 'interaction:none'
          : `interaction:${props.interaction}`,
    },
    {
      testID: 'text-remoteviews-payload',
      value: props.remoteViewsPayload,
      a11y: props.remoteViewsPayload,
    },
    {
      testID: 'text-remoteviews-seed',
      value: seedLabel({
        value: props.remoteViewsPayload,
        needle: 'remoteviews',
        ok: 'seed:remoteviews',
        miss: 'remoteviews-miss',
      }),
    },
  ];
}

function Diagnostics(props: {
  payload: string;
  expoUiPayload: string;
  remoteViewsPayload: string;
  pinStatus: string;
  interaction: string;
}) {
  return (
    <View style={styles.diagnostics}>
      <Text style={styles.eyebrow}>Diagnostics</Text>
      <Text style={styles.sectionTitle}>Payloads</Text>
      {diagnosticRows(props).map((row) => (
        <PayloadLine
          key={row.testID}
          testID={row.testID}
          value={row.value}
          accessibilityLabel={row.a11y}
        />
      ))}
      <Text testID="text-pin-status" style={styles.mono}>
        {props.pinStatus}
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

function RemoteViewsBundlePins({
  setPinStatus,
}: {
  setPinStatus: (status: string) => void;
}) {
  return (
    <Section
      eyebrow="RemoteViews · providers[]"
      title="Hello RV Bundle"
      body="One target, two AppWidgetProvider picker rows (Status layout and Agenda layout)."
    >
      <AndroidPinButton
        testID="btn-pin-hello-status"
        label="Pin Hello Status"
        targetName="Status"
        setPinStatus={setPinStatus}
      />
      <AndroidPinButton
        testID="btn-pin-hello-agenda"
        label="Pin Hello Agenda"
        targetName="Agenda"
        setPinStatus={setPinStatus}
      />
    </Section>
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
      <RemoteViewsBundlePins setPinStatus={setPinStatus} />
    </>
  );
}

async function startLiveActivity(
  setLiveId: (id: string | null) => void,
  setLiveStatus: (status: string) => void
) {
  if (!(await areLiveActivitiesEnabled())) {
    setLiveStatus('disabled');
    return;
  }
  const id = await helloWidgetLiveActivity.start({
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

async function endDemoLiveActivity(
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

async function startExpoUiLiveActivity(
  setLiveId: (id: string | null) => void,
  setLiveStatus: (status: string) => void
) {
  if (!(await areLiveActivitiesEnabled())) {
    setLiveStatus('disabled');
    return;
  }
  const id = await helloExpoUiLiveActivityHandle.start({
    attributes: { title: 'Expo UI' },
    contentState: { status: 'preparing' },
  });
  setLiveId(id);
  setLiveStatus(`expo-ui-started:${id.slice(0, 8)}`);
}

function NativeLiveActivitySection({
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
          : 'ActivityKit order for HelloWidgetAttributes (native deepen).'
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
          void endDemoLiveActivity(liveId, setLiveId, setLiveStatus);
        }}
      />
      <Text testID="text-live-status" style={styles.mono}>
        {liveStatus}
      </Text>
    </Section>
  );
}

function ExpoUiLiveActivitySection({
  expoUiLiveId,
  setExpoUiLiveId,
  expoUiLiveStatus,
  setExpoUiLiveStatus,
}: {
  expoUiLiveId: string | null;
  setExpoUiLiveId: (id: string | null) => void;
  expoUiLiveStatus: string;
  setExpoUiLiveStatus: (status: string) => void;
}) {
  if (Platform.OS === 'android') {
    return null;
  }
  return (
    <Section
      eyebrow="Expo UI · Live Activity"
      title="HelloExpoUiAttributes"
      body="Same entry as home Layout; WidgetLiveActivity multi-slot UI. Push tokens are CLAIMS on Simulator."
    >
      <ActionButton
        testID="btn-expo-ui-live-start"
        label="Start Expo UI Live Activity"
        onPress={() => {
          void startExpoUiLiveActivity(setExpoUiLiveId, setExpoUiLiveStatus);
        }}
      />
      <ActionButton
        testID="btn-expo-ui-live-update"
        label="Update Expo UI Live Activity"
        tone="secondary"
        onPress={() => {
          void updateLiveActivity(expoUiLiveId, setExpoUiLiveStatus);
        }}
      />
      <ActionButton
        testID="btn-expo-ui-live-end"
        label="End Expo UI Live Activity"
        tone="danger"
        onPress={() => {
          void endDemoLiveActivity(
            expoUiLiveId,
            setExpoUiLiveId,
            setExpoUiLiveStatus
          );
        }}
      />
      <Text testID="text-expo-ui-live-status" style={styles.mono}>
        {expoUiLiveStatus}
      </Text>
    </Section>
  );
}

function LiveActivitySection(props: {
  liveId: string | null;
  setLiveId: (id: string | null) => void;
  liveStatus: string;
  setLiveStatus: (status: string) => void;
  expoUiLiveId: string | null;
  setExpoUiLiveId: (id: string | null) => void;
  expoUiLiveStatus: string;
  setExpoUiLiveStatus: (status: string) => void;
}) {
  return (
    <>
      <NativeLiveActivitySection
        liveId={props.liveId}
        setLiveId={props.setLiveId}
        liveStatus={props.liveStatus}
        setLiveStatus={props.setLiveStatus}
      />
      <ExpoUiLiveActivitySection
        expoUiLiveId={props.expoUiLiveId}
        setExpoUiLiveId={props.setExpoUiLiveId}
        expoUiLiveStatus={props.expoUiLiveStatus}
        setExpoUiLiveStatus={props.setExpoUiLiveStatus}
      />
    </>
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
          interaction={host.interaction}
        />
        <PinSections setPinStatus={host.setPinStatus} />
        <LiveActivitySection
          liveId={host.liveId}
          setLiveId={host.setLiveId}
          liveStatus={host.liveStatus}
          setLiveStatus={host.setLiveStatus}
          expoUiLiveId={host.expoUiLiveId}
          setExpoUiLiveId={host.setExpoUiLiveId}
          expoUiLiveStatus={host.expoUiLiveStatus}
          setExpoUiLiveStatus={host.setExpoUiLiveStatus}
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
