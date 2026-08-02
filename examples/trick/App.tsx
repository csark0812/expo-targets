/**
 * ET Trick — showcase host for deepened Apple extension targets + Live Activities.
 */
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  registerFileDomain,
  unregisterFileDomain,
} from './modules/trick-file-domain';
import {
  endAllLiveActivities,
  startLiveActivity,
} from './modules/trick-live-activity';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const NCE_CATEGORY = 'myNotificationCategory';

type Cap = {
  id: string;
  title: string;
  appex: string;
  how: string;
  surface: string;
};

const CAPS: Cap[] = [
  {
    id: 'nse',
    title: 'Notification Service',
    appex: 'ET Trick NSE',
    how: 'simctl push with mutable-content:1. NSE appends [expo-targets] (App Group marker).',
    surface: 'usernotifications.service',
  },
  {
    id: 'nce',
    title: 'Notification Content',
    appex: 'ET Trick NCE',
    how: 'Schedule / push category myNotificationCategory, then expand.',
    surface: 'content-extension · ET Trick NCE',
  },
  {
    id: 'photo',
    title: 'Photo Editing',
    appex: 'ET Trick Photo',
    how: 'Photos → Edit → Extensions · grayscale PHContentEditingController.',
    surface: 'com.apple.photo-editing',
  },
  {
    id: 'files',
    title: 'File Provider',
    appex: 'ET Trick Files',
    how: 'Register domain below, then Files → Browse.',
    surface: 'fileprovider-nonui',
  },
  {
    id: 'keyboard',
    title: 'Keyboard',
    appex: 'ET Trick Keyboard',
    how: 'Settings → General → Keyboard → Add New Keyboard.',
    surface: 'keyboard-service',
  },
  {
    id: 'safari',
    title: 'Safari Web Extension',
    appex: 'ET Trick Safari',
    how: 'Settings → Apps → Safari → Extensions → Allow.',
    surface: 'Safari.web-extension',
  },
  {
    id: 'blocker',
    title: 'Content Blocker',
    appex: 'ET Trick Blocker',
    how: 'Settings → Apps → Safari → Extensions / Content Blockers.',
    surface: 'content-blocking',
  },
  {
    id: 'share',
    title: 'Share',
    appex: 'ET Trick Share',
    how: 'Share Sheet from any app → ET Trick Share.',
    surface: 'share-services',
  },
  {
    id: 'action',
    title: 'Action',
    appex: 'ET Trick Action',
    how: 'Share Sheet action row for images.',
    surface: 'ui-services',
  },
  {
    id: 'messages',
    title: 'Messages',
    appex: 'ET Trick Messages',
    how: 'Messages app → Apps drawer.',
    surface: 'message-payload-provider',
  },
  {
    id: 'widgets',
    title: 'Widget + Live Activity',
    appex: 'ET Trick Widget',
    how: 'Home Screen widget · Start Live Activity below (ActivityKit).',
    surface: 'WidgetKit + ActivityKit',
  },
];

function CapCard({ cap }: { cap: Cap }) {
  return (
    <View style={styles.card} testID={`cap-${cap.id}`}>
      <Text style={styles.cardTitle}>{cap.title}</Text>
      <Text style={styles.appex}>{cap.appex}</Text>
      <Text style={styles.body}>{cap.how}</Text>
      <Text style={styles.surface}>{cap.surface}</Text>
    </View>
  );
}

function HostMeta(props: {
  ready: boolean;
  perm: string;
  filesDomain: string;
  liveId: string;
  statusLine: string;
}) {
  const { ready, perm, filesDomain, liveId, statusLine } = props;
  return (
    <>
      <Text style={styles.brand}>ET Trick</Text>
      <Text style={styles.tagline}>
        Apple extension negative space — NSE, NCE, Photos, Files, keyboard,
        Safari, share, messages, widgets + Live Activities.
      </Text>
      <Text testID="status-target-ready" style={styles.ready}>
        {ready ? 'ready' : 'booting'}
      </Text>
      <Text testID="text-notif-perm" style={styles.meta}>
        notifications: {perm}
      </Text>
      <Text testID="text-files-domain" style={styles.meta}>
        files domain: {filesDomain}
      </Text>
      <Text testID="text-live-id" style={styles.meta}>
        live activity: {liveId}
      </Text>
      <Text testID="text-bundle-suffix" style={styles.meta}>
        com.expotargets.example.trick
      </Text>
      {statusLine ? (
        <Text testID="text-status-line" style={styles.status}>
          {statusLine}
        </Text>
      ) : null}
    </>
  );
}

function HostActions(props: {
  lastLocal: string;
  onScheduleNce: () => void;
  onRegisterFiles: () => void;
  onUnregisterFiles: () => void;
  onStartLive: () => void;
  onEndLive: () => void;
}) {
  return (
    <>
      <Pressable
        testID="btn-schedule-nce"
        style={styles.cta}
        onPress={props.onScheduleNce}
      >
        <Text style={styles.ctaText}>Schedule NCE notification</Text>
      </Pressable>
      <Text testID="text-last-local" style={styles.meta}>
        last local id: {props.lastLocal}
      </Text>
      <Pressable
        testID="btn-register-files"
        style={styles.ctaSecondary}
        onPress={props.onRegisterFiles}
      >
        <Text style={styles.ctaText}>Register Files domain</Text>
      </Pressable>
      <Pressable
        testID="btn-unregister-files"
        style={styles.ctaGhost}
        onPress={props.onUnregisterFiles}
      >
        <Text style={styles.ctaGhostText}>Unregister Files domain</Text>
      </Pressable>
      <Pressable
        testID="btn-start-live"
        style={styles.ctaSecondary}
        onPress={props.onStartLive}
      >
        <Text style={styles.ctaText}>Start Live Activity</Text>
      </Pressable>
      <Pressable
        testID="btn-end-live"
        style={styles.ctaGhost}
        onPress={props.onEndLive}
      >
        <Text style={styles.ctaGhostText}>End Live Activities</Text>
      </Pressable>
    </>
  );
}

// biome-ignore lint/complexity/noExcessiveLinesPerFunction: host state + demo action surface
function useTrickHost() {
  const [ready, setReady] = useState(false);
  const [perm, setPerm] = useState('pending');
  const [lastLocal, setLastLocal] = useState('none');
  const [filesDomain, setFilesDomain] = useState('not-registered');
  const [liveId, setLiveId] = useState('none');
  const [statusLine, setStatusLine] = useState('');

  const boot = useCallback(async () => {
    try {
      await Notifications.setNotificationCategoryAsync(NCE_CATEGORY, []);
      const current = await Notifications.getPermissionsAsync();
      let status = current.status;
      if (status !== 'granted') {
        const asked = await Notifications.requestPermissionsAsync();
        status = asked.status;
      }
      setPerm(status);
      try {
        const name = await registerFileDomain();
        setFilesDomain(`registered:${name}`);
      } catch (e) {
        setFilesDomain(`error:${String(e)}`);
      }
    } catch (e) {
      setPerm(`error:${String(e)}`);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void boot();
  }, [boot]);

  return {
    ready,
    perm,
    lastLocal,
    filesDomain,
    liveId,
    statusLine,
    onScheduleNce: () => {
      void Notifications.scheduleNotificationAsync({
        content: {
          title: 'ET Trick',
          body: 'Expand me for rich NCE content',
          categoryIdentifier: NCE_CATEGORY,
        },
        trigger: null,
      }).then((id) => setLastLocal(id));
    },
    onRegisterFiles: () => {
      void registerFileDomain()
        .then((name) => {
          setFilesDomain(`registered:${name}`);
          setStatusLine('Files domain registered');
        })
        .catch((e) => {
          setFilesDomain(`error:${String(e)}`);
          setStatusLine(String(e));
        });
    },
    onUnregisterFiles: () => {
      void unregisterFileDomain()
        .then(() => {
          setFilesDomain('not-registered');
          setStatusLine('Files domain removed');
        })
        .catch((e) => setStatusLine(String(e)));
    },
    onStartLive: () => {
      void startLiveActivity('ET Trick Live', 'active')
        .then((id) => {
          setLiveId(id);
          setStatusLine(`Live Activity ${id}`);
        })
        .catch((e) => setStatusLine(String(e)));
    },
    onEndLive: () => {
      void endAllLiveActivities()
        .then(() => {
          setLiveId('none');
          setStatusLine('Live Activities ended');
        })
        .catch((e) => setStatusLine(String(e)));
    },
  };
}

export default function App() {
  const host = useTrickHost();
  return (
    <View style={styles.root} testID="screen-root">
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <HostMeta
          ready={host.ready}
          perm={host.perm}
          filesDomain={host.filesDomain}
          liveId={host.liveId}
          statusLine={host.statusLine}
        />
        <HostActions
          lastLocal={host.lastLocal}
          onScheduleNce={host.onScheduleNce}
          onRegisterFiles={host.onRegisterFiles}
          onUnregisterFiles={host.onUnregisterFiles}
          onStartLive={host.onStartLive}
          onEndLive={host.onEndLive}
        />
        {CAPS.map((cap) => (
          <CapCard key={cap.id} cap={cap} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0B1220' },
  scroll: { padding: 24, paddingTop: 64, paddingBottom: 48, gap: 12 },
  brand: {
    fontSize: 36,
    fontWeight: '800',
    color: '#F4F7FB',
    letterSpacing: -0.5,
  },
  tagline: { fontSize: 15, lineHeight: 22, color: '#9AA8BC' },
  ready: { color: '#5CFFB0', fontWeight: '700', marginTop: 4 },
  meta: { color: '#6B7C93', fontSize: 12, fontFamily: 'Courier' },
  status: { color: '#FFD166', fontSize: 12 },
  cta: {
    marginTop: 8,
    backgroundColor: '#2F6BFF',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaSecondary: {
    backgroundColor: '#1E3A6E',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  ctaGhost: {
    paddingVertical: 10,
    alignItems: 'center',
  },
  ctaText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ctaGhostText: { color: '#9AA8BC', fontWeight: '600', fontSize: 13 },
  card: {
    marginTop: 4,
    padding: 16,
    borderRadius: 14,
    backgroundColor: '#141E2E',
    borderWidth: 1,
    borderColor: '#243247',
    gap: 6,
  },
  cardTitle: { color: '#F4F7FB', fontSize: 17, fontWeight: '700' },
  appex: { color: '#7EB6FF', fontSize: 13, fontWeight: '600' },
  body: { color: '#C5D0DF', fontSize: 13, lineHeight: 19 },
  surface: { color: '#6B7C93', fontSize: 11, marginTop: 4 },
});
