import { router, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import { AppText } from '@/components/ui/app-text';
import { IconButton } from '@/components/ui/icon-button';
import { LabBackground } from '@/components/ui/lab-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { useSession } from '@/context/session';
import { loadInvestigation, saveInvestigation, validInvestigationId } from '@/lib/investigation-storage';
import { useOpenLabCatalog } from '@/hooks/use-openlab-catalog';
import { fetchPublishedExperiments } from '@/services/experiments';
import { supabase } from '@/lib/supabase';
import { CLASSES } from '@/data/classes';

/**
 * OpenLab 3D is a separate Vite web app in `openlab-3d/`. `npm run build:chemquest` there
 * writes it to `public/openlab/`, which Expo web serves as static files; this screen shows
 * it full screen in an iframe.
 */
const OPENLAB_URL = '/openlab/index.html?v=touch-fix-1';
/** The built page's <title>; an SPA fallback page would not contain it. */
const OPENLAB_MARKER = '<title>OpenLab 3D</title>';

type Status = 'checking' | 'ready' | 'missing';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

/** The hub's OpenLab building: the full OpenLab 3D lab (web). */
export function OpenLab3DScreen() {
  return Platform.OS === 'web' ? <OpenLabWeb /> : <OpenLabNative />;
}

function OpenLabWeb() {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { experiment } = useLocalSearchParams<{experiment?:string}>();
  const requested = typeof experiment === 'string' && validInvestigationId(experiment) ? experiment : null;
  const labUrl = OPENLAB_URL + (requested ? `&experiment=${encodeURIComponent(requested)}` : '');
  const [status, setStatus] = useState<Status>('checking');
  const frame = useRef<HTMLIFrameElement>(null);
  const sendCatalog = useOpenLabCatalog(frame, requested, user?.id);

  useEffect(() => {
    let cancelled = false;
    fetch(OPENLAB_URL, { cache: 'no-store' })
      .then((res) => (res.ok ? res.text() : ''))
      .then((html) => {
        if (!cancelled) setStatus(html.includes(OPENLAB_MARKER) ? 'ready' : 'missing');
      })
      .catch(() => {
        if (!cancelled) setStatus('missing');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The lab report's "Лабаас гарах" button asks to leave: go back to the hub.
  useEffect(() => {
    const receive = (event: MessageEvent<unknown>) => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow) return;
      const data = event.data;
      if (data && typeof data === 'object' && 'type' in data && data.type === 'openlab:exit') goBack();
      if (user && data && typeof data === 'object' && 'type' in data && data.type === 'openlab:investigation-result' && 'version' in data && data.version === 1 && 'id' in data && typeof data.id === 'string' && validInvestigationId(data.id) && 'attempt' in data) {
        void saveInvestigation(user.id, data.id, data.attempt).catch(() => undefined);
      }
    };
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [user]);

  if (status === 'checking') {
    return (
      <LabBackground bubbles={4}>
        <ActivityIndicator color={Colors.lime} size="large" style={styles.loading} />
      </LabBackground>
    );
  }

  if (status === 'missing') return <NotBuilt />;

  return (
    <View style={styles.fill}>
      <iframe
        ref={frame}
        src={labUrl}
        title="OpenLab 3D virtual laboratory"
        allow="fullscreen; autoplay"
        onLoad={() => { frame.current?.focus(); sendCatalog(frame.current?.contentWindow ?? null); }}
        style={{ border: 0, width: '100%', height: '100%', display: 'block', backgroundColor: '#eef0f2' }}
      />
      {/* Top center: OpenLab keeps its own menu (top left) and Notes/End (top right). */}
      <View style={[styles.back, { top: insets.top + 12 }]} pointerEvents="box-none">
        <IconButton icon="chevron-left" accessibilityLabel="Back to the ChemQuest hub" size={38} onPress={goBack} />
        <AppText variant="caption" color={Colors.text} style={styles.backLabel}>
          ChemQuest
        </AppText>
      </View>
    </View>
  );
}

function NotBuilt() {
  return (
    <LabBackground bubbles={5}>
      <ScreenHeader title="OpenLab" subtitle="3D virtual laboratory" onBack={goBack} />
      <View style={styles.card}>
        <AppText variant="heading">OpenLab is not built yet</AppText>
        <AppText style={styles.gap}>
          All three parts (Person 1, 2 and 3) must be inside the openlab-3d folder. Then build it once:
        </AppText>
        <View style={styles.code}>
          <AppText style={styles.codeText}>cd openlab-3d</AppText>
          <AppText style={styles.codeText}>npm install</AppText>
          <AppText style={styles.codeText}>npm run build:chemquest</AppText>
        </View>
        <AppText variant="caption" style={styles.gap}>
          Then restart ChemQuest with npm run web and enter the OpenLab building again.
        </AppText>
      </View>
    </LabBackground>
  );
}

function OpenLabNative() {
  const insets = useSafeAreaInsets();
  const { user } = useSession();
  const { experiment } = useLocalSearchParams<{experiment?:string}>();
  const requested = typeof experiment === 'string' && validInvestigationId(experiment) ? experiment : null;
  const webView = useRef<WebView<object> | null>(null);
  const [failed, setFailed] = useState(false);
  const hostUri = Constants.expoConfig?.hostUri?.split('/')[0];
  const configuredUrl = process.env.EXPO_PUBLIC_OPENLAB_URL?.replace(/\/$/, '');
  const baseUrl = configuredUrl || (__DEV__ && hostUri ? `http://${hostUri}` : null);
  const labUrl = baseUrl ? `${baseUrl}/openlab/index.html?v=touch-fix-1${requested ? `&experiment=${encodeURIComponent(requested)}` : ''}` : null;
  const sendToLab = (message: Record<string, unknown>) => {
    const event = JSON.stringify(message);
    webView.current?.injectJavaScript(`window.dispatchEvent(new MessageEvent('message',{data:${event},origin:window.location.origin,source:window}));true;`);
  };
  const handleMessage = (event: WebViewMessageEvent) => {
    let data: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(event.nativeEvent.data);
      if (!parsed || typeof parsed !== 'object') return;
      data = parsed as Record<string, unknown>;
    } catch { return; }
    if (data.type === 'openlab:exit') { goBack(); return; }
    if (data.type === 'openlab:catalog-ready' && data.version === 1) {
      void fetchPublishedExperiments(new AbortController().signal).then((rows) => sendToLab({ type: 'chemquest:experiment-catalog', version: 1, rows, lessons: CLASSES })).catch(() => sendToLab({ type: 'chemquest:experiment-catalog', version: 1, rows: [], lessons: CLASSES }));
      // Same as web: the lab resumes the hub notebook's prediction and earlier measurements.
      if (requested && user) void loadInvestigation(user.id, requested).then((attempt) => sendToLab({ type: 'chemquest:investigation-load', version: 1, id: requested, attempt })).catch(() => undefined);
      return;
    }
    if (data.type === 'openlab:investigation-result' && user && typeof data.id === 'string' && validInvestigationId(data.id)) {
      void saveInvestigation(user.id, data.id, data.attempt).catch(() => undefined);
      return;
    }
    if (data.type === 'openlab:ask-pip' && data.version === 1 && typeof data.id === 'string' && typeof data.question === 'string' && Array.isArray(data.history) && typeof data.context === 'string') {
      const id = data.id;
      void supabase.functions.invoke('openlab-tutor', { body: { question: data.question, history: data.history, context: data.context } })
        .then(({ data: result, error }) => sendToLab({ type: 'chemquest:pip-answer', version: 1, id, answer: !error && result && typeof result.answer === 'string' ? result.answer : null }))
        .catch(() => sendToLab({ type: 'chemquest:pip-answer', version: 1, id, answer: null }));
    }
  };
  if (!labUrl) return (
    <LabBackground bubbles={5}>
      <ScreenHeader title="OpenLab" subtitle="3D virtual laboratory" onBack={goBack} />
      <View style={styles.card}>
        <AppText variant="heading">OpenLab-ийн веб хаяг тохируулаагүй байна</AppText>
        <AppText style={styles.gap}>Хөгжүүлэлтийн үед npm run web-ийг --host 0.0.0.0 тохиргоотой эхлүүлнэ. Нийтэлсэн app-д EXPO_PUBLIC_OPENLAB_URL-д вебийн HTTPS хаягийг тохируулна.</AppText>
      </View>
    </LabBackground>
  );
  return (
    <View style={styles.fill}>
      <WebView
        ref={webView}
        source={{ uri: labUrl }}
        originWhitelist={['http://*', 'https://*']}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        onMessage={handleMessage}
        // The lab handles every drag itself (joystick, look). Native scrolling and bounce would
        // take over a drag and cancel the page's touch mid-move.
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        onLoadStart={() => setFailed(false)}
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
        style={styles.webView}
      />
      {failed && <View style={styles.webError}><AppText>OpenLab веб хаягт холбогдож чадсангүй. Сервер болон сүлжээгээ шалгана уу.</AppText></View>}
      {/* Дээд голд: OpenLab-ийн E, F, Q, R товчнууд энэ товчны хоёр талд (2 + 2) байрлана. */}
      <View style={[styles.back, { top: insets.top + 12 }]} pointerEvents="box-none">
        <IconButton icon="chevron-left" accessibilityLabel="ChemQuest руу буцах" size={38} onPress={goBack} />
        <AppText variant="caption" color={Colors.text} style={styles.backLabel}>
          ChemQuest
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: Colors.night },
  webView: { flex: 1, backgroundColor: '#eef0f2' },
  webError: { position: 'absolute', left: 16, right: 16, bottom: 24, padding: 16, borderRadius: Radius.lg, backgroundColor: Colors.panel },
  loading: { flex: 1 },
  back: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 4,
    paddingRight: 14,
    paddingVertical: 4,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(18, 12, 51, 0.72)',
  },
  backLabel: { fontFamily: Fonts.semibold },
  card: {
    margin: 16,
    padding: 20,
    borderRadius: Radius.lg,
    backgroundColor: Colors.panel,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  gap: { marginTop: 10 },
  code: {
    marginTop: 12,
    padding: 14,
    borderRadius: Radius.md,
    backgroundColor: Colors.input,
    gap: 4,
  },
  codeText: { fontFamily: Platform.select({ web: 'monospace', default: undefined }), color: Colors.lime, fontSize: 15 },
});
