/**
 * Supabase backend: accounts live in Supabase Auth, player data in the `profiles` table
 * (see supabase/schema.sql).
 *
 * The rest of the app only talks to this file and `leaderboard.ts`.
 */
import { supabase } from '@/lib/supabase';
import type { ClassId, LessonResult, PublicPlayer, User } from '@/types';

export type AuthField = 'email' | 'password' | 'nickname';

export class AuthError extends Error {
  constructor(
    message: string,
    readonly field?: AuthField,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface SignUpInput {
  email: string;
  password: string;
  nickname: string;
  classId: ClassId;
}

interface ProfileRow {
  id: string;
  email: string;
  nickname: string;
  class_id: ClassId;
  xp: number;
  completed: Record<string, LessonResult>;
  created_at: string;
}

const toUser = (row: ProfileRow): User => ({
  id: row.id,
  email: row.email,
  nickname: row.nickname,
  classId: row.class_id,
  xp: row.xp,
  completed: row.completed ?? {},
  createdAt: row.created_at,
});

async function fetchProfile(id: string): Promise<User> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
  if (error || !data) throw new AuthError('Could not load your profile');
  return toUser(data as ProfileRow);
}

export async function signUp(input: SignUpInput): Promise<User> {
  const email = input.email.trim().toLowerCase();
  const nickname = input.nickname.trim();

  const { data: available } = await supabase.rpc('nickname_available', { wanted: nickname });
  if (available === false) throw new AuthError('That nickname is already taken', 'nickname');

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: { data: { nickname, class_id: input.classId } },
  });
  if (error) {
    if (/already registered/i.test(error.message)) {
      throw new AuthError('An account with this email already exists', 'email');
    }
    throw new AuthError(error.message);
  }
  if (!data.user || !data.session) {
    throw new AuthError('Check your email to confirm your account, then sign in');
  }
  return fetchProfile(data.user.id);
}

export async function signIn(emailInput: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailInput.trim().toLowerCase(),
    password,
  });
  if (error || !data.user) throw new AuthError('Wrong email or password');
  return fetchProfile(data.user.id);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function restoreSession(): Promise<User | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  try {
    return await fetchProfile(data.session.user.id);
  } catch {
    return null;
  }
}

export async function saveUser(user: User): Promise<User> {
  const { error } = await supabase
    .from('profiles')
    .update({ class_id: user.classId, xp: user.xp, completed: user.completed })
    .eq('id', user.id);
  if (error) throw new AuthError('Could not save your progress');
  return user;
}

/** Everyone with an account, as other players see them. */
export async function listPlayers(): Promise<PublicPlayer[]> {
  const { data, error } = await supabase.from('profiles').select('id, nickname, class_id, xp');
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    nickname: row.nickname,
    classId: row.class_id as ClassId,
    xp: row.xp,
  }));
}
