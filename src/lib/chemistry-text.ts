export interface TextToken { text: string; style: 'plain' | 'bold' | 'italic' | 'sub' | 'sup' }

/** Tokenize the pack's inline markup without injecting HTML. */
export function chemistryText(text: string): TextToken[] {
  const tokens: TextToken[] = [];
  const pattern = /(\*\*([^*]+)\*\*|\*([^*]+)\*|_([0-9]+)|\^([0-9]*[+−-]))/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index! > cursor) tokens.push({ text: text.slice(cursor, match.index), style: 'plain' });
    if (match[2]) tokens.push(...chemistryText(match[2]).map((token) => token.style === 'plain' ? { ...token, style: 'bold' as const } : token));
    else if (match[3]) tokens.push(...chemistryText(match[3]).map((token) => token.style === 'plain' ? { ...token, style: 'italic' as const } : token));
    else if (match[4]) tokens.push({ text: match[4], style: 'sub' });
    else if (match[5]) tokens.push({ text: match[5], style: 'sup' });
    else tokens.push({ text: match[0], style: 'plain' });
    cursor = match.index! + match[0].length;
  }
  if (cursor < text.length) tokens.push({ text: text.slice(cursor), style: 'plain' });
  return tokens;
}

export function chemistrySegments(text: string) {
  const result: ({ kind: 'text'; value: string } | { kind: 'nuclide'; mass: string; atomic: string; symbol: string })[] = [];
  let cursor = 0;
  for (const match of text.matchAll(/\{\{nuc:(\d+):(\d+):([A-Za-z]+)\}\}/g)) {
    if (match.index! > cursor) result.push({ kind: 'text', value: text.slice(cursor, match.index) });
    result.push({ kind: 'nuclide', mass: match[1], atomic: match[2], symbol: match[3] });
    cursor = match.index! + match[0].length;
  }
  if (cursor < text.length) result.push({ kind: 'text', value: text.slice(cursor) });
  return result;
}
