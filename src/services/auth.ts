/**
 * Mock backend: accounts are stored on this device only (AsyncStorage).
 *
 * The rest of the app only talks to this file and `leaderboard.ts`, so swapping in a
 * real backend (Firebase, Supabase, your own API…) means re-implementing these
 * functions with the same signatures.
 */
import * as Crypto from 'expo-crypto';

import { MOCK_PLAYERS } from '@/data/players';
import { readJson, removeKey, writeJson } from '@/lib/storage';
import type { ClassId, PublicPlayer, User } from '@/types';

const ACCOUNTS_KEY = 'chemquest.accounts.v1';
const SESSION_KEY = 'chemquest.session.v1';

interface StoredAccount {
  user: User;
  salt: string;
  passwordHash: string;
}

/** Keyed by lowercase email. */
type AccountTable = Record<string, StoredAccount>;

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

/** Simulated network latency so loading states are visible during development. */
const latency = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms));

const loadAccounts = () => readJson<AccountTable>(ACCOUNTS_KEY, {});
const saveAccounts = (accounts: AccountTable) => writeJson(ACCOUNTS_KEY, accounts);

function hashPassword(password: string, salt: string) {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${password}`);
}

function isNicknameTaken(nickname: string, accounts: AccountTable): boolean {
  const wanted = nickname.toLowerCase();
  return (
    MOCK_PLAYERS.some((p) => p.nickname.toLowerCase() === wanted) ||
    Object.values(accounts).some((a) => a.user.nickname.toLowerCase() === wanted)
  );
}

export async function signUp(input: SignUpInput): Promise<User> {
  await latency();
  const email = input.email.trim().toLowerCase();
  const nickname = input.nickname.trim();
  const accounts = await loadAccounts();

  if (accounts[email]) throw new AuthError('An account with this email already exists', 'email');
  if (isNicknameTaken(nickname, accounts)) throw new AuthError('That nickname is already taken', 'nickname');

  const user: User = {
    id: Crypto.randomUUID(),
    email,
    nickname,
    classId: input.classId,
    xp: 0,
    completed: {},
    createdAt: new Date().toISOString(),
  };
  const salt = Crypto.randomUUID();
  accounts[email] = { user, salt, passwordHash: await hashPassword(input.password, salt) };
  await saveAccounts(accounts);
  await writeJson(SESSION_KEY, { email });
  return user;
}

export async function signIn(emailInput: string, password: string): Promise<User> {
  await latency();
  const email = emailInput.trim().toLowerCase();
  const account = (await loadAccounts())[email];
  if (!account || (await hashPassword(password, account.salt)) !== account.passwordHash) {
    throw new AuthError('Wrong email or password');
  }
  await writeJson(SESSION_KEY, { email });
  return account.user;
}

export async function signOut(): Promise<void> {
  await removeKey(SESSION_KEY);
}

export async function restoreSession(): Promise<User | null> {
  const session = await readJson<{ email: string } | null>(SESSION_KEY, null);
  if (!session) return null;
  return (await loadAccounts())[session.email]?.user ?? null;
}

export async function saveUser(user: User): Promise<User> {
  const accounts = await loadAccounts();
  const account = accounts[user.email];
  if (!account) throw new AuthError('Account not found');
  accounts[user.email] = { ...account, user };
  await saveAccounts(accounts);
  return user;
}

/** Everyone who signed up on this device, as other players see them. */
export async function listLocalPlayers(): Promise<PublicPlayer[]> {
  return Object.values(await loadAccounts()).map(({ user }) => ({
    id: user.id,
    nickname: user.nickname,
    classId: user.classId,
    xp: user.xp,
  }));
}
