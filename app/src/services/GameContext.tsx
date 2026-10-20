import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Account, Lesson, Tier, TIERS } from '../types';
import { LESSONS, RIVALS } from '../constants/lessons';
import { avatarColors } from '../constants/theme';

interface Game {
  user: Account | null;
  activeTier: Tier;
  setActiveTier: (t: Tier) => void;
  isUnlocked: (t: Tier) => boolean;
  lessonsOf: (t: Tier) => Lesson[];
  signUp: (nickname: string, password: string, tier: Tier) => string | null;
  login: (nickname: string, password: string) => string | null;
  logout: () => void;
  finishLesson: (lessonId: string, correct: number, total: number) => number;
  ranking: { nickname: string; xp: number; tier: Tier; color: string; me: boolean }[];
}

const GameContext = createContext<Game | null>(null);

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [current, setCurrent] = useState<string | null>(null);
  const [activeTier, setActiveTier] = useState<Tier>('Beginner');

  const user = accounts.find((a) => a.nickname === current) ?? null;

  const lessonsOf = useCallback((t: Tier) => LESSONS.filter((l) => l.tier === t), []);

  const isUnlocked = useCallback(
    (t: Tier) => {
      if (!user) return false;
      const i = TIERS.indexOf(t);
      if (i <= TIERS.indexOf(user.startTier)) return true;
      return lessonsOf(TIERS[i - 1]).every((l) => user.completed.includes(l.id));
    },
    [user, lessonsOf],
  );

  const signUp = (nickname: string, password: string, tier: Tier) => {
    const nick = nickname.trim();
    if (nick.length < 3 || nick.length > 12) return 'Nickname must be 3-12 characters.';
    if (password.length < 4) return 'Password must be at least 4 characters.';
    const taken = [...accounts.map((a) => a.nickname), ...RIVALS.map((r) => r.nickname)];
    if (taken.some((n) => n.toLowerCase() === nick.toLowerCase())) return 'Nickname already taken.';
    const color = avatarColors[Math.floor(Math.random() * avatarColors.length)];
    setAccounts((prev) => [...prev, { nickname: nick, password, startTier: tier, xp: 0, completed: [], color }]);
    setCurrent(nick);
    setActiveTier(tier);
    return null;
  };

  const login = (nickname: string, password: string) => {
    const acc = accounts.find((a) => a.nickname.toLowerCase() === nickname.trim().toLowerCase());
    if (!acc || acc.password !== password) return 'Wrong nickname or password.';
    setCurrent(acc.nickname);
    setActiveTier(acc.startTier);
    return null;
  };

  const logout = () => setCurrent(null);

  const finishLesson = (lessonId: string, correct: number, total: number) => {
    if (!user) return 0;
    const passed = correct / total >= 0.5;
    const firstTime = passed && !user.completed.includes(lessonId);
    const gained = correct * (firstTime ? 20 : 5) + (firstTime ? 30 : 0);
    setAccounts((prev) =>
      prev.map((a) =>
        a.nickname === user.nickname
          ? { ...a, xp: a.xp + gained, completed: firstTime ? [...a.completed, lessonId] : a.completed }
          : a,
      ),
    );
    return gained;
  };

  const ranking = useMemo(() => {
    const players = accounts.map((a) => ({
      nickname: a.nickname,
      xp: a.xp,
      tier: a.startTier,
      color: a.color,
      me: a.nickname === current,
    }));
    const rivals = RIVALS.map((r) => ({ ...r, me: false }));
    return [...players, ...rivals].sort((a, b) => b.xp - a.xp);
  }, [accounts, current]);

  const value: Game = {
    user,
    activeTier,
    setActiveTier,
    isUnlocked,
    lessonsOf,
    signUp,
    login,
    logout,
    finishLesson,
    ranking,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside GameProvider');
  return ctx;
}
