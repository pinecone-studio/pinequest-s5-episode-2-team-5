/**
 * School names carry their сум / дүүрэг ("…аймгийн Батцэнгэл сумын ерөнхий боловсролын
 * сургууль"). The schools table has no column for it, so the sign-up picker reads it from
 * the name to let students narrow long lists. Names without one stay under "Бусад".
 */
const LETTERS = 'А-ЯЁӨҮа-яёөү';
const PLACE = new RegExp(`([${LETTERS}]+(?:-[${LETTERS}]+)?)\\s+(сумын|сум|дүүргийн|дүүрэг|тосгоны|тосгон)(?![${LETTERS}])`, 'iu');
const KIND: Record<string, string> = {
  сумын: 'сум',
  сум: 'сум',
  дүүргийн: 'дүүрэг',
  дүүрэг: 'дүүрэг',
  тосгоны: 'тосгон',
  тосгон: 'тосгон',
};

const capitalize = (part: string) => part.charAt(0).toLocaleUpperCase('mn') + part.slice(1).toLocaleLowerCase('mn');

/** "Батцэнгэл сум", "Сүхбаатар дүүрэг", "Өндөр-Улаан сум" … or null when the name has none. */
export function districtOf(schoolName: string): string | null {
  const match = PLACE.exec(schoolName);
  if (!match) return null;
  const place = match[1].split('-').map(capitalize).join('-');
  return `${place} ${KIND[match[2].toLocaleLowerCase('mn')]}`;
}

/** Number words as they appear in school names ("хорин тав дугаар", "нэгзуун хоёрдугаар", "тавин долдугаар"). */
const NUMBER_WORDS: Record<string, number> = {
  нэг: 1, хоёр: 2, гурав: 3, гурван: 3, дөрөв: 4, дөрвөн: 4, тав: 5, таван: 5,
  зургаа: 6, зургаан: 6, долоо: 7, долоон: 7, дол: 7, найм: 8, найман: 8, ес: 9, есөн: 9,
  арав: 10, арван: 10, хорь: 20, хорин: 20, гуч: 30, гучин: 30, дөч: 40, дөчин: 40,
  тавь: 50, тавин: 50, жар: 60, жаран: 60, дал: 70, далан: 70, ная: 80, наян: 80, ер: 90, ерэн: 90,
  зуу: 100, зуун: 100,
};
const STEMS = Object.keys(NUMBER_WORDS).sort((a, b) => b.length - a.length);
const ORDINAL = /(дугаар|дүгээр)$/;

/** Splits a word made only of number words ("нэгзуун" → [1, 100]); null if it is not one. */
function numberParts(word: string): number[] | null {
  const parts: number[] = [];
  let rest = word;
  while (rest) {
    const stem = STEMS.find((s) => rest.startsWith(s));
    if (!stem) return null;
    parts.push(NUMBER_WORDS[stem]);
    rest = rest.slice(stem.length);
  }
  return parts.length ? parts : null;
}

function combine(parts: number[]): number {
  let total = 0;
  let pending = 0;
  for (const value of parts) {
    if (value === 100) {
      total += (pending || 1) * 100;
      pending = 0;
    } else pending += value;
  }
  return total + pending;
}

/**
 * School numbers in a name, as digits: "хорин тав дугаар" → 25, "нэг зуун хорин нэг дүгээр" → 121,
 * "3-р" → 3. Number words only count when an ordinal follows, so "Жаргалан хоёр" is not school 2.
 */
export function schoolNumbers(name: string): number[] {
  const found: number[] = [];
  const text = name.toLocaleLowerCase('mn').replace(/([^\d\s])(\d)/g, '$1 $2');
  for (const match of text.matchAll(/\d+/g)) found.push(Number(match[0]));
  const words = text.split(/[\s"«»().,]+/).filter(Boolean);
  let run: number[] = [];
  for (let i = 0; i < words.length; i++) {
    const ordinal = ORDINAL.test(words[i]);
    const parts = numberParts(words[i].replace(ORDINAL, ''));
    if (parts) run.push(...parts);
    const ends = ordinal || (!parts ? false : ORDINAL.test(words[i + 1] ?? '') && words[i + 1].replace(ORDINAL, '') === '');
    if (run.length && ends) {
      found.push(combine(run));
      run = [];
    } else if (!parts) run = [];
  }
  return [...new Set(found)];
}

/** What the school list searches: the name plus its number in digits. */
export function schoolSearchText(name: string): string {
  return [name, ...schoolNumbers(name)].join(' ');
}

/** True when every word of the query appears in the text (case-insensitive); "25-р" searches for 25. */
export function matchesSearch(text: string, query: string): boolean {
  const haystack = text.toLocaleLowerCase('mn');
  return query
    .toLocaleLowerCase('mn')
    .split(/\s+/)
    .map((word) => word.replace(/^(\d+)-?р$/, '$1'))
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}
