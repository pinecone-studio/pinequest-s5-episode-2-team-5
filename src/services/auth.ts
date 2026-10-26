/**
 * Supabase backend: accounts live in Supabase Auth, player data in the `profiles` table
 * (see supabase/schema.sql).
 *
 * The rest of the app only talks to this file and `leaderboard.ts`.
 */
import { supabase } from '@/lib/supabase';
import { fallbackUser } from '@/lib/auth-profile-fallback';
import { fetchLocationProfile } from '@/services/location';
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
  location: null,
  locationStatus: 'unavailable',
});

async function fetchProfile(
  id: string,
  authUser?: { email?: string; user_metadata?: Record<string, unknown>; created_at?: string },
): Promise<User> {
  // Keep this projection compatible with the pre-location schema; never require
  // location columns or the student_profiles table to sign in.
  const { data, error } = await supabase
    .from('profiles')
    .select('id,email,nickname,class_id,xp,completed,created_at')
    .eq('id', id)
    .single();
  if (error || !data) {
    if (authUser) {
      return fallbackUser(id, authUser.email ?? '', authUser.user_metadata ?? {}, authUser.created_at);
    }
    throw new AuthError('Профайлыг ачаалж чадсангүй. Дахин оролдоно уу');
  }
  const user = toUser(data as ProfileRow);
  try {
    const location = await fetchLocationProfile(id);
    return { ...user, location, locationStatus: location ? 'complete' : 'incomplete' };
  } catch {
    // The location migration may not be applied yet. Auth remains usable and the gate
    // fails open; the user can retry location setup later from their profile.
    return { ...user, location: null, locationStatus: 'unavailable' };
  }
}

/** Supabase answers in English; the sign-in and sign-up screens show Mongolian. */
function translate(message: string, fallback: string): AuthError {
  if (/fetch|network/i.test(message)) return new AuthError('Сервертэй холбогдож чадсангүй. Интернэт холболтоо шалгана уу');
  if (/rate limit|too many/i.test(message)) return new AuthError('Хэт олон оролдлого хийлээ. Түр хүлээгээд дахин оролдоно уу');
  if (/not confirmed/i.test(message)) return new AuthError('Имэйлээ баталгаажуулаагүй байна. Ирсэн захидал дахь холбоосыг дарна уу', 'email');
  if (/password should|weak password/i.test(message)) return new AuthError('Нууц үг хэт сул байна. Илүү урт, үсэг тоо хольсон нууц үг сонгоно уу', 'password');
  if (/invalid.*email|email.*invalid/i.test(message)) return new AuthError('Имэйл хаяг буруу байна', 'email');
  if (/signups? not allowed|disabled/i.test(message)) return new AuthError('Одоогоор шинээр бүртгүүлэх боломжгүй байна');
  return new AuthError(fallback);
}

/** False only when we know the nickname is taken; a failed lookup doesn't block the form. */
export async function isNicknameAvailable(nickname: string): Promise<boolean> {
  const { data } = await supabase.rpc('nickname_available', { wanted: nickname.trim() });
  return data !== false;
}

export async function signUp(input: SignUpInput): Promise<User> {
  const email = input.email.trim().toLowerCase();
  const nickname = input.nickname.trim();

  if (!(await isNicknameAvailable(nickname))) {
    throw new AuthError('Энэ хоч нэрийг өөр хүн авсан байна', 'nickname');
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: input.password,
    options: { data: { nickname, class_id: input.classId } },
  });
  if (error) {
    if (/already registered/i.test(error.message)) {
      throw new AuthError('Энэ имэйлээр бүртгэл аль хэдийн үүссэн байна', 'email');
    }
    // Someone grabbed the nickname after our check: the profiles trigger hits the unique index.
    if (/database error saving new user|profiles_nickname_key/i.test(error.message)) {
      throw new AuthError('Энэ хоч нэрийг өөр хүн авсан байна', 'nickname');
    }
    throw translate(error.message, 'Бүртгэл үүсгэж чадсангүй. Дахин оролдоно уу');
  }
  if (!data.user || !data.session) {
    throw new AuthError('Имэйлээ шалгаж бүртгэлээ баталгаажуулаад нэвтэрнэ үү');
  }
  return fetchProfile(data.user.id, data.user);
}

export async function signIn(emailInput: string, password: string): Promise<User> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: emailInput.trim().toLowerCase(),
    password,
  });
  // Wrong credentials are the common case; network or unconfirmed-email problems get their own message.
  if (error || !data.user) throw translate(error?.message ?? '', 'Имэйл эсвэл нууц үг буруу байна');
  return fetchProfile(data.user.id, data.user);
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function restoreSession(): Promise<User | null> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) return null;
  try {
    return await fetchProfile(data.session.user.id, data.session.user);
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
  const { data, error } = await supabase.from('player_directory').select('id, nickname, class_id, xp');
  if (error || !data) return [];
  return data.map((row) => ({
    id: row.id,
    nickname: row.nickname,
    classId: row.class_id as ClassId,
    xp: row.xp,
  }));
}
