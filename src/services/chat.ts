import { readJson, writeJson } from '@/lib/storage';
import type { ClassId, PublicPlayer, User } from '@/types';

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

interface NewChatMessage {
  userId: string;
  nickname: string;
  classId: ClassId;
  text: string;
}

export function chatMessageTimeLeft(sentAt: string, now = Date.now()) {
  const timestamp = Date.parse(sentAt);
  if (!Number.isFinite(timestamp)) return 0;
  return Math.max(0, CHAT_MESSAGE_TTL_MS - (now - timestamp));
}

/** Device-local chat storage until the app has a shared realtime backend. */
export async function loadChatMessages(): Promise<ChatMessage[]> {
  const saved = await readJson<ChatMessage[]>(CHAT_KEY, []);
  return Array.isArray(saved)
    ? saved.filter((message) => chatMessageTimeLeft(message.sentAt) > 0).slice(-MAX_MESSAGES)
    : [];
}

export async function sendChatMessage(user: User, text: string): Promise<ChatMessage[]> {
  return appendChatMessage({
    userId: user.id,
    nickname: user.nickname,
    classId: user.classId,
    text,
  });
}

export async function sendDemoChatMessage(player: PublicPlayer, text: string): Promise<ChatMessage[]> {
  return appendChatMessage({
    userId: player.id,
    nickname: player.nickname,
    classId: player.classId,
    text,
  });
}

let writeQueue: Promise<void> = Promise.resolve();

function appendChatMessage(input: NewChatMessage): Promise<ChatMessage[]> {
  const nextWrite = writeQueue.then(async () => {
    const messages = await loadChatMessages();
    const message: ChatMessage = {
      id: `${input.userId}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      userId: input.userId,
      nickname: input.nickname,
      classId: input.classId,
      text: input.text.trim().slice(0, 280),
      sentAt: new Date().toISOString(),
    };
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
