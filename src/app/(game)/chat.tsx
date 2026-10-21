import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PlayerPortrait } from '@/components/avatar/player-portrait';
import { AppText } from '@/components/ui/app-text';
import { LabBackground } from '@/components/ui/lab-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { Colors, Fonts, Radius } from '@/constants/theme';
import { useSession } from '@/context/session';
import { haptics } from '@/lib/haptics';
import { chatMessageTimeLeft, loadChatMessages, sendChatMessage, subscribeToChat, type ChatMessage } from '@/services/chat';
import type { User } from '@/types';

const MAX_LENGTH = 280;

export default function ChatScreen() {
  const { user } = useSession();
  return user ? <GlobalChat user={user} /> : null;
}

function GlobalChat({ user }: { user: User }) {
  const insets = useSafeAreaInsets();
  const list = useRef<FlatList<ChatMessage> | null>(null);
  const [messages, setMessages] = useState<ChatMessage[] | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => subscribeToChat(setMessages), []);

  useEffect(() => {
    if (messages?.length) list.current?.scrollToEnd({ animated: true });
  }, [messages?.length]);

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
    setError(null);
    try {
      const next = await sendChatMessage(user, text);
      setMessages(next);
      setDraft('');
      haptics.tap();
    } catch {
      setError('Could not save your message. Try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <LabBackground bubbles={4}>
      <ScreenHeader title="Global Chat" subtitle="Campus conversation" right={<LocalBadge />} />
      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.notice}>
          <MaterialCommunityIcons name="information-outline" size={18} color={Colors.cyan} />
          <AppText style={styles.noticeText}>
            Live chat. Everyone in the game sees your message, and it fades after a few seconds.
          </AppText>
        </View>

        {messages === null ? (
          <ActivityIndicator color={Colors.cyan} size="large" style={styles.loading} />
        ) : (
          <FlatList
            ref={list}
            data={messages}
            keyExtractor={(message) => message.id}
            renderItem={({ item }) => <MessageRow message={item} isMine={item.userId === user.id} />}
            contentContainerStyle={messages.length ? styles.messageList : styles.emptyList}
            ListEmptyComponent={<EmptyChat />}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        )}

        <View style={[styles.composerArea, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {error && <AppText style={styles.error}>{error}</AppText>}
          <View style={styles.composer}>
            <TextInput
              accessibilityLabel="Chat message"
              value={draft}
              onChangeText={setDraft}
              placeholder="Write a message…"
              placeholderTextColor={Colors.textDim}
              selectionColor={Colors.cyan}
              maxLength={MAX_LENGTH}
              multiline
              editable={!sending}
              style={styles.input}
              returnKeyType="default"
              blurOnSubmit={false}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              accessibilityState={{ disabled: !draft.trim() || sending, busy: sending }}
              disabled={!draft.trim() || sending}
              onPress={send}
              style={({ pressed }) => [
                styles.sendButton,
                (!draft.trim() || sending) && styles.sendButtonDisabled,
                pressed && styles.sendButtonPressed,
              ]}>
              {sending ? (
                <ActivityIndicator size="small" color={Colors.night} />
              ) : (
                <MaterialCommunityIcons name="send" size={20} color={Colors.night} />
              )}
            </Pressable>
          </View>
          <AppText style={styles.counter}>{draft.length}/{MAX_LENGTH}</AppText>
        </View>
      </KeyboardAvoidingView>
    </LabBackground>
  );
}

function LocalBadge() {
  return (
    <View style={styles.localBadge}>
      <View style={styles.localDot} />
      <AppText style={styles.localText}>LIVE</AppText>
    </View>
  );
}

function EmptyChat() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <MaterialCommunityIcons name="message-text-outline" size={32} color={Colors.cyan} />
      </View>
      <AppText variant="heading" align="center">Start the conversation</AppText>
      <AppText variant="caption" align="center" style={styles.emptyCopy}>
        Say hi to your fellow chemists.
      </AppText>
    </View>
  );
}

function MessageRow({ message, isMine }: { message: ChatMessage; isMine: boolean }) {
  return (
    <View style={[styles.messageRow, isMine && styles.messageRowMine]}>
      {!isMine && <PlayerPortrait nickname={message.nickname} classId={message.classId} size={34} />}
      <View style={[styles.messageBody, isMine && styles.messageBodyMine]}>
        {!isMine && <AppText style={styles.sender}>{message.nickname}</AppText>}
        <View style={[styles.bubble, isMine ? styles.myBubble : styles.otherBubble]}>
          <AppText style={[styles.messageText, isMine && styles.myMessageText]}>{message.text}</AppText>
        </View>
        <AppText style={[styles.time, isMine && styles.myTime]}>{formatTime(message.sentAt)}</AppText>
      </View>
    </View>
  );
}

function formatTime(sentAt: string) {
  return new Date(sentAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

const styles = StyleSheet.create({
  keyboard: { flex: 1 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(61, 224, 245, 0.28)',
    backgroundColor: 'rgba(18, 12, 51, 0.72)',
  },
  noticeText: { flex: 1, fontFamily: Fonts.medium, fontSize: 12.5, lineHeight: 17, color: Colors.textMuted },
  loading: { flex: 1 },
  messageList: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16, gap: 16 },
  emptyList: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 28, paddingBottom: 36 },
  emptyState: { alignItems: 'center', gap: 8 },
  emptyIcon: {
    width: 64,
    height: 64,
    marginBottom: 8,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.panel,
  },
  emptyCopy: { maxWidth: 250 },
  messageRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  messageRowMine: { justifyContent: 'flex-end' },
  messageBody: { maxWidth: '82%', gap: 4, alignItems: 'flex-start' },
  messageBodyMine: { alignItems: 'flex-end' },
  sender: { marginLeft: 4, color: Colors.cyan, fontFamily: Fonts.semibold, fontSize: 13 },
  bubble: { paddingHorizontal: 13, paddingVertical: 9, borderRadius: Radius.md },
  otherBubble: { borderBottomLeftRadius: 5, backgroundColor: Colors.panelRaised },
  myBubble: { borderBottomRightRadius: 5, backgroundColor: Colors.cyan },
  messageText: { color: Colors.text, fontFamily: Fonts.medium, fontSize: 15, lineHeight: 21 },
  myMessageText: { color: Colors.night },
  time: { marginLeft: 4, color: Colors.textDim, fontFamily: Fonts.medium, fontSize: 11 },
  myTime: { marginRight: 4 },
  composerArea: { paddingTop: 10, paddingHorizontal: 14, backgroundColor: 'rgba(18, 12, 51, 0.86)' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.input,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 104,
    paddingTop: 10,
    paddingBottom: 8,
    color: Colors.text,
    fontFamily: Fonts.medium,
    fontSize: 15,
    lineHeight: 21,
    textAlignVertical: 'center',
  },
  sendButton: {
    width: 42,
    height: 42,
    marginBottom: 1,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cyan,
  },
  sendButtonDisabled: { backgroundColor: Colors.locked },
  sendButtonPressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
  counter: { alignSelf: 'flex-end', marginTop: 4, color: Colors.textDim, fontSize: 11 },
  error: { marginBottom: 6, color: Colors.danger, fontSize: 13 },
  localBadge: {
    minWidth: 52,
    height: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.panel,
  },
  localDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.gold },
  localText: { color: Colors.gold, fontFamily: Fonts.bold, fontSize: 10, letterSpacing: 0.4 },
});
