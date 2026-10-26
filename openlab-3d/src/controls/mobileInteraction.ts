/** Small, allocation-free gesture helpers shared by mobile interaction and its tests. */
export const MOBILE_TAP_SLOP = 14;
export const MOBILE_THROW_HOLD_MS = 450;

export function isMobileTap(startX: number, startY: number, endX: number, endY: number): boolean {
  const dx = endX - startX;
  const dy = endY - startY;
  return dx * dx + dy * dy <= MOBILE_TAP_SLOP * MOBILE_TAP_SLOP;
}

export type MobileTapAction = 'interact' | 'use' | 'store' | 'place' | 'none';

export function mobileTapAction(input: {
  hasHeld: boolean;
  hasFocus: boolean;
  canStore: boolean;
  hasUseTarget: boolean;
}): MobileTapAction {
  if (!input.hasFocus) return input.hasHeld ? 'place' : 'none';
  if (!input.hasHeld) return 'interact';
  if (input.canStore) return 'store';
  return input.hasUseTarget ? 'use' : 'interact';
}

/** Rewrite keyboard-only guidance for the mobile contextual tap path. */
export function mobileizeControlHint(text: string): string {
  return text
    .replace(/\bE\s*[:—]/g, 'Товшиж')
    .replace(/\bQ\s*[:—]/g, 'Товшиж тавих')
    .replace(/\bR\s*[:—]/g, 'Зорьсон зүйлээ товшиж')
    .replace(/\bT\s*[:—]/g, 'Удаан дарж')
    .replace(/E дарж барьж/g, 'барьж байгаад товшиж')
    .replace(/E дарж/g, 'товшиж')
    .replace(/E дарвал/g, 'товшвол')
    .replace(/E дарна/g, 'товш')
    .replace(/E дар/g, 'товш')
    .replace(/Q дарж тавь/g, 'товшиж тавь')
    .replace(/Q дарж хий/g, 'товшиж хий')
    .replace(/Q дар/g, 'товш')
    .replace(/R дарсаар/g, 'байгаа зүйлээ барьж байгаад зорьсон зүйлээ удаан товшиж')
    .replace(/R дарж барь/g, 'байгаа зүйлээ барьж байгаад зорьсон зүйлээ товш')
    .replace(/R дарж/g, 'зорьсон зүйлээ товшиж')
    .replace(/R дарвал/g, 'зорьсон зүйлээ товшвол')
    .replace(/R дарах бүрт/g, 'зорьсон зүйлээ товших бүрт')
    .replace(/R дарна/g, 'зорьсон зүйлээ товш')
    .replace(/R дар/g, 'зорьсон зүйлээ товш')
    .replace(/T дарж/g, 'удаан дарж')
    .replace(/T дар/g, 'удаан дар');
}
