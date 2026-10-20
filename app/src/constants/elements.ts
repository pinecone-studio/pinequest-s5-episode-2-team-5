import { ELEMENTS_1 } from './elements1';
import { ELEMENTS_2 } from './elements2';
import { ELEMENTS_3 } from './elements3';

export type Category =
  | 'Alkali metal'
  | 'Alkaline earth'
  | 'Transition metal'
  | 'Post-transition'
  | 'Metalloid'
  | 'Nonmetal'
  | 'Halogen'
  | 'Noble gas'
  | 'Lanthanide'
  | 'Actinide';

export interface Element {
  number: number;
  symbol: string;
  name: string;
  category: Category;
  row: number;
  col: number;
}

export const CATEGORY_COLORS: Record<Category, string> = {
  'Alkali metal': '#f87171',
  'Alkaline earth': '#fb923c',
  'Transition metal': '#fbbf24',
  'Post-transition': '#a3e635',
  Metalloid: '#34d399',
  Nonmetal: '#22d3ee',
  Halogen: '#60a5fa',
  'Noble gas': '#a78bfa',
  Lanthanide: '#f472b6',
  Actinide: '#e879f9',
};

const NONMETALS = [1, 6, 7, 8, 15, 16, 34];
const HALOGENS = [9, 17, 35, 53, 85, 117];
const NOBLE = [2, 10, 18, 36, 54, 86, 118];
const ALKALI = [3, 11, 19, 37, 55, 87];
const ALKALINE = [4, 12, 20, 38, 56, 88];
const METALLOID = [5, 14, 32, 33, 51, 52];
const POST = [13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116];

function categoryOf(n: number): Category {
  if (NONMETALS.includes(n)) return 'Nonmetal';
  if (HALOGENS.includes(n)) return 'Halogen';
  if (NOBLE.includes(n)) return 'Noble gas';
  if (ALKALI.includes(n)) return 'Alkali metal';
  if (ALKALINE.includes(n)) return 'Alkaline earth';
  if (METALLOID.includes(n)) return 'Metalloid';
  if (POST.includes(n)) return 'Post-transition';
  if (n >= 57 && n <= 71) return 'Lanthanide';
  if (n >= 89 && n <= 103) return 'Actinide';
  return 'Transition metal';
}

// Grid has 18 columns; rows 0-6 are periods 1-7, rows 8-9 hold the f-block.
const PERIOD_STARTS = [0, 2, 10, 18, 36, 54, 86, 118];

function positionOf(n: number): { row: number; col: number } {
  let period = 1;
  while (n - 1 >= PERIOD_STARTS[period]) period++;
  const idx = n - 1 - PERIOD_STARTS[period - 1];
  const row = period - 1;
  if (period === 1) return { row, col: idx === 0 ? 0 : 17 };
  if (period <= 3) return { row, col: idx < 2 ? idx : idx + 10 };
  if (period <= 5) return { row, col: idx };
  if (idx < 2) return { row, col: idx };
  if (idx < 17) return { row: period + 2, col: idx };
  return { row, col: idx - 14 };
}

export const ELEMENTS: Element[] = [...ELEMENTS_1, ...ELEMENTS_2, ...ELEMENTS_3].map(
  ([symbol, name], i) => ({
    number: i + 1,
    symbol,
    name,
    category: categoryOf(i + 1),
    ...positionOf(i + 1),
  }),
);
