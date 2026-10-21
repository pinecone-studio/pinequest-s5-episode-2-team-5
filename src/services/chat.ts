import { readJson, writeJson } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import type { ClassId, User } from '@/types';

const CHAT_KEY = 'chemquest.global-chat.v1';
const MAX_MESSAGES = 200;
export const CHAT_MESSAGE_TTL_MS = 5_000;

export interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  classId: ClassId;
  text: string;
  sentAt: string;
}

export function chatMessageTimeLeft(sentAt: string, now = Date.now()) {
  const timestamp = Date.parse(sentAt);
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, CHAT_MESSAGE_TTL_MS - (now - timestamp));
}

/** Messages are shared over Supabase Realtime and kept on the device only for their short lifetime. */
export async function loadChatMessages(): Promise<ChatMessage[]> {
  const saved = await readJson<ChatMessage[]>(CHAT_KEY, []);
  return Array.isArray(saved)
    ? saved.filter((message) => chatMessageTimeLeft(message.sentAt) > 0).slice(-MAX_MESSAGES)
    : [];
}

const CLASS_IDS: ClassId[] = ['beginner', 'medium', 'hard'];

type Listener = (messages: ChatMessage[]) => void;

const listeners = new Set<Listener>();
let channel: ReturnType<typeof supabase.channel> | null = null;

let writeQueue: Promise<void> = Promise.resolve();

function storeMessage(message: ChatMessage): Promise<ChatMessage[]> {
  const nextWrite = writeQueue.then(async () => {
    const messages = await loadChatMessages();
    if (messages.some((item) => item.id === message.id)) return messages;
    const next = [...messages, message].slice(-MAX_MESSAGES);
    await writeJson(CHAT_KEY, next);
    return next;
  });

  writeQueue = nextWrite.then(
    () => undefined,
    () => undefined,
  );
  return nextWrite;
}

/** Messages from other devices are untrusted, so check the shape and stamp them with our own clock. */
function parseIncoming(payload: unknown): ChatMessage | null {
  if (!payload || typeof payload !== 'object') return null;
  const m = payload as Record<string, unknown>;
  if (
    typeof m.id !== 'string' ||
    typeof m.userId !== 'string' ||
    typeof m.nickname !== 'string' ||
    typeof m.text !== 'string' ||
    !CLASS_IDS.includes(m.classId as ClassId)
  ) {
    return null;
  }
  const text = m.text.trim().slice(0, 280);
  if (!text) return null;
  // Using the receive time keeps a skewed sender clock from expiring the message instantly.
  return {
    id: m.id.slice(0, 80),
    userId: m.userId,
    nickname: m.nickname.slice(0, 40),
    classId: m.classId as ClassId,
    text,
    sentAt: new Date().toISOString(),
  };
}

function ensureChannel() {
  if (channel) return channel;
  const created = supabase.channel('chat:global');
  created
    .on('broadcast', { event: 'message' }, ({ payload }) => {
      const message = parseIncoming(payload);
      if (!message) return;
      void storeMessage(message).then((next) => listeners.forEach((listener) => listener(next)));
    })
    .subscribe();
  channel = created;
  return created;
}

/** Calls `listener` with the full message list whenever someone else sends a message. */
export function subscribeToChat(listener: Listener): () => void {
  listeners.add(listener);
  ensureChannel();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && channel) {
      void supabase.removeChannel(channel);
      channel = null;
    }
  };
}

export async function sendChatMessage(user: User, text: string): Promise<ChatMessage[]> {
  const message: ChatMessage = {
    id: `${user.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    userId: user.id,
    nickname: user.nickname,
    classId: user.classId,
    text: text.trim().slice(0, 280),
    sentAt: new Date().toISOString(),
  };
  const next = await storeMessage(message);
  await ensureChannel().send({ type: 'broadcast', event: 'message', payload: message });
  return next;
}
