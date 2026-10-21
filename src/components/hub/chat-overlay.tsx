import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { HUB_CHATTER } from '@/data/players';
import { haptics } from '@/lib/haptics';
import {
  chatMessageTimeLeft,
  loadChatMessages,
  sendChatMessage,
  sendDemoChatMessage,
  type ChatMessage,
} from '@/services/chat';
import type { PublicPlayer, User } from '@/types';

const MAX_LENGTH = 280;
const STREAM_MESSAGES = 24;

export function HubChatOverlay({ user, players }: { user: User; players: PublicPlayer[] }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const list = useRef<FlatList<ChatMessage> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      loadChatMessages().then((saved) => {
        if (active) setMessages(saved);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  useFocusEffect(
    useCallback(() => {
      if (players.length === 0) return;
      let active = true;
      let timeout: ReturnType<typeof setTimeout>;

      const postDemoMessage = async () => {
        const player = players[Math.floor(Math.random() * players.length)];
        const text = HUB_CHATTER[Math.floor(Math.random() * HUB_CHATTER.length)];
        try {
          const next = await sendDemoChatMessage(player, text);
          if (active) setMessages(next);
        } catch {
          // Keep the demo chat running if local storage is temporarily unavailable.
        }
        if (active) timeout = setTimeout(postDemoMessage, 2_000 + Math.random() * 3_000);
      };

      timeout = setTimeout(postDemoMessage, 2_000 + Math.random() * 3_000);
      return () => {
        active = false;
        clearTimeout(timeout);
      };
    }, [players]),
  );

  useEffect(() => {
    if (messages?.length) list.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    if (!messages?.length) return;
    const timeouts = messages.map((message) =>
      setTimeout(() => {
        setMessages((current) => current?.filter((item) => item.id !== message.id) ?? null);
      }, chatMessageTimeLeft(message.sentAt)),
    );
    return () => timeouts.forEach(clearTimeout);
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;

    setSending(true);
    setSendError(false);
    try {
      setMessages(await sendChatMessage(user, text));
      setDraft('');
      haptics.tap();
    } catch {
      setSendError(true);
    } finally {
      setSending(false);
    }
  };

  const streamWidth = Math.min(280, width * 0.5);
  const top = insets.top + 104;
  const streamHeight = Math.min(360, height * 0.45, Math.max(148, height - top - insets.bottom - 12));

  return (
    <View
      pointerEvents="box-none"
      style={[styles.anchor, { top, left: 8, width: streamWidth, height: streamHeight }]}>
      <View style={styles.stream}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open full Global Chat"
          onPress={() => router.push('/chat')}
          style={styles.header}>
          <MaterialCommunityIcons name="chat-processing-outline" size={17} color={Colors.cyan} />
          <AppText style={styles.headerTitle}>GLOBAL CHAT</AppText>
          <View style={styles.localTag}>
            <AppText style={styles.localText}>LOCAL</AppText>
          </View>
        </Pressable>

        {messages === null ? (
          <ActivityIndicator color={Colors.cyan} size="small" style={styles.loading} />
        ) : messages.length === 0 ? (
          <View pointerEvents="none" style={styles.empty}>
            <AppText style={styles.emptyText}>Chat is quiet. Say hi!</AppText>
          </View>
        ) : (
          <FlatList
            ref={list}
            style={styles.list}
            data={messages.slice(-STREAM_MESSAGES)}
            keyExtractor={(message) => message.id}
            renderItem={({ item }) => <StreamMessage message={item} />}
            contentContainerStyle={styles.messages}
            onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Write a chat message"
            value={draft}
            onChangeText={setDraft}
            placeholder="Say something…"
            placeholderTextColor={Colors.textDim}
            selectionColor={Colors.cyan}
            maxLength={MAX_LENGTH}
            editable={!sending}
            returnKeyType="send"
            onSubmitEditing={send}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send chat message"
            accessibilityState={{ disabled: !draft.trim() || sending, busy: sending }}
            disabled={!draft.trim() || sending}
            onPress={send}
            hitSlop={6}
            style={[styles.send, (!draft.trim() || sending) && styles.sendDisabled]}>
            {sending ? (
              <ActivityIndicator size="small" color={Colors.night} />
            ) : (
              <MaterialCommunityIcons name="send" size={16} color={Colors.night} />
            )}
          </Pressable>
        </View>
        {sendError && <AppText style={styles.sendError}>Message could not be saved.</AppText>}
      </View>
    </View>
  );
}

function StreamMessage({ message }: { message: ChatMessage }) {
  return (
    <Text style={styles.message} numberOfLines={4}>
      <Text style={styles.nickname}>{message.nickname}: </Text>
      <Text>{message.text}</Text>
    </Text>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'absolute' },
  stream: {
    flex: 1,
    padding: 7,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(18, 12, 51, 0.34)',
  },
  header: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 3,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.14)',
  },
  headerTitle: { flexShrink: 1, color: Colors.text, fontFamily: Fonts.bold, fontSize: 12, letterSpacing: 0.25 },
  localTag: {
    marginLeft: 'auto',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 201, 60, 0.18)',
  },
  localText: { color: Colors.gold, fontFamily: Fonts.bold, fontSize: 9, letterSpacing: 0.3 },
  loading: { flex: 1 },
  list: { flex: 1 },
  empty: { flex: 1, justifyContent: 'flex-end', paddingBottom: 12 },
  emptyText: {
    padding: 6,
    color: Colors.textMuted,
    fontFamily: Fonts.medium,
    fontSize: 11,
    lineHeight: 15,
    textShadowColor: 'rgba(18, 12, 51, 0.9)',
    textShadowRadius: 4,
  },
  messages: { flexGrow: 1, justifyContent: 'flex-end', gap: 9, paddingTop: 10, paddingBottom: 12 },
  message: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 9,
    overflow: 'hidden',
    color: Colors.text,
    backgroundColor: 'rgba(18, 12, 51, 0.74)',
    fontFamily: Fonts.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  nickname: { color: Colors.cyan, fontFamily: Fonts.bold },
  composer: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 8,
    paddingRight: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.17)',
    backgroundColor: 'rgba(18, 12, 51, 0.88)',
  },
  sendError: { paddingHorizontal: 3, paddingTop: 3, color: Colors.danger, fontSize: 9, lineHeight: 12 },
  input: {
    flex: 1,
    minWidth: 0,
    height: 44,
    paddingVertical: 0,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 13,
  },
  send: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cyan,
  },
  sendDisabled: { backgroundColor: Colors.locked },
});
