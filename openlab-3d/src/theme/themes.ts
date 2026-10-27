/**
 * Шинэ цэсний өнгө — БҮХ өнгө зөвхөн энэ файлд тодорхойлогдоно.
 * Дэлгэц бүр өнгийг CSS хувьсагчаар (--t-*) авдаг тул өнгө солихдоо зөвхөн энд засна.
 * Tailwind-д `bg-t-accent`, `text-t-ink` гэх мэтээр холбогдсон (tailwind.config.js).
 * Сурагч Тохиргоо → "Өнгө сонгох"-оос сонгоно (сонголт useSettingsStore.theme-д хадгалагдана).
 * Шинэ өнгө нэмэх бол доорх THEMES жагсаалтад нэг мөр нэмнэ — өөр код өөрчлөх шаардлагагүй.
 */
import type { CSSProperties } from 'react';

export type ThemeId = 'tengis' | 'indigo' | 'ocean' | 'light' | 'night';

export interface Theme {
  id: ThemeId;
  /** Сурагчид харагдах нэр */
  name: string;
  /** Дэлгэцийн дэвсгэр градиент: дээр → дунд → доор */
  screenTop: string;
  screenMid: string;
  screenBottom: string;
  /** Үндсэн бичиг ба хоёрдогч (бүдэг) бичиг */
  ink: string;
  inkSoft: string;
  /** Хагас тунгалаг карт, сонгогдсон карт */
  card: string;
  cardActive: string;
  /** Гол товч (шар) ба түүний бичиг */
  accent: string;
  accentInk: string;
  /** Хоёр дахь том карт (нил ягаан) ба түүний бичиг */
  primary: string;
  primaryInk: string;
  /** Колбоны шингэн */
  liquid: string;
}

/** Тэнгис — загварын зургаас авсан өнгө (анхны сонголт) */
export const TENGIS: Theme = {
  id: 'tengis',
  name: 'Тэнгис',
  screenTop: '#4189F6',
  screenMid: '#306AE3',
  screenBottom: '#214CB9',
  ink: '#FFFFFF',
  inkSoft: 'rgba(255,255,255,0.82)',
  card: 'rgba(255,255,255,0.16)',
  cardActive: 'rgba(255,255,255,0.28)',
  accent: '#F9DB5D',
  accentInk: '#372A08',
  primary: '#5530D8',
  primaryInk: '#FFFFFF',
  liquid: '#ED688F',
};

/** Индиго: дэвсгэр #3B33B8, товч #F2B53A (бичиг #3A2600), шингэн #E5398A */
const INDIGO: Theme = {
  id: 'indigo',
  name: 'Индиго',
  screenTop: '#5047D0',
  screenMid: '#3B33B8',
  screenBottom: '#2C2693',
  ink: '#FFFFFF',
  inkSoft: 'rgba(255,255,255,0.8)',
  card: 'rgba(255,255,255,0.14)',
  cardActive: 'rgba(255,255,255,0.26)',
  accent: '#F2B53A',
  accentInk: '#3A2600',
  primary: '#7A35E0',
  primaryInk: '#FFFFFF',
  liquid: '#E5398A',
};

/** Далайн ногоон: дэвсгэр #0E6B67, товч #FFFFFF (бичиг #0B4F4C), шингэн #F2B53A */
const OCEAN: Theme = {
  id: 'ocean',
  name: 'Далайн ногоон',
  screenTop: '#168C86',
  screenMid: '#0E6B67',
  screenBottom: '#0A5350',
  ink: '#FFFFFF',
  inkSoft: 'rgba(255,255,255,0.82)',
  card: 'rgba(255,255,255,0.14)',
  cardActive: 'rgba(255,255,255,0.26)',
  accent: '#FFFFFF',
  accentInk: '#0B4F4C',
  primary: '#2E3FA8',
  primaryInk: '#FFFFFF',
  liquid: '#F2B53A',
};

/** Цайвар: дэвсгэр #F6F4FC, товч #3B33B8 (бичиг #FFFFFF), шингэн #E5398A. Бичиг нь бараан */
const LIGHT: Theme = {
  id: 'light',
  name: 'Цайвар',
  screenTop: '#FFFFFF',
  screenMid: '#F6F4FC',
  screenBottom: '#EAE5F8',
  ink: '#2A2470',
  inkSoft: 'rgba(42,36,112,0.74)',
  card: 'rgba(59,51,184,0.08)',
  cardActive: 'rgba(59,51,184,0.16)',
  accent: '#3B33B8',
  accentInk: '#FFFFFF',
  primary: '#6B4FE0',
  primaryInk: '#FFFFFF',
  liquid: '#E5398A',
};

/** Шөнийн лаб: дэвсгэр #14123A, товч #FF8A3D (бичиг #2A1200), шингэн #22C7E0 */
const NIGHT: Theme = {
  id: 'night',
  name: 'Шөнийн лаб',
  screenTop: '#1F1C57',
  screenMid: '#14123A',
  screenBottom: '#0E0C2B',
  ink: '#FFFFFF',
  inkSoft: 'rgba(255,255,255,0.76)',
  card: 'rgba(255,255,255,0.08)',
  cardActive: 'rgba(255,255,255,0.16)',
  accent: '#FF8A3D',
  accentInk: '#2A1200',
  primary: '#3B33B8',
  primaryInk: '#FFFFFF',
  liquid: '#22C7E0',
};

/** Сурагчид харагдах жагсаалт (энэ дарааллаар) */
export const THEMES: readonly Theme[] = [TENGIS, INDIGO, OCEAN, LIGHT, NIGHT];

export const DEFAULT_THEME: Theme = TENGIS;

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}

/** id-аар өнгийг олно. Хадгалсан утга алдаатай бол анхны өнгө (Тэнгис) */
export function themeById(id: unknown): Theme {
  return THEMES.find((theme) => theme.id === id) ?? DEFAULT_THEME;
}

/** camelCase → CSS хувьсагчийн нэр: screenTop → --t-screen-top */
function cssVarName(key: string): string {
  return `--t-${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
}

/** Сэдвийн өнгийг элементийн style-д өгөхөд бэлэн болгоно: <div style={themeStyle(theme)}> */
export function themeStyle(theme: Theme): CSSProperties {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(theme)) {
    if (key !== 'id' && key !== 'name') vars[cssVarName(key)] = value;
  }
  return vars as CSSProperties;
}
