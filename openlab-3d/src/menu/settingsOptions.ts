/**
 * Тохиргооны хялбар сонголтууд (хүүхдэд ойлгомжтой нэр) ба тэдгээрийг одоо байгаа техникийн тохиргоотой холбох функц.
 * Цэвэр функц (store-оос хамааралгүй) тул тест хийхэд хялбар.
 */

/** Дууны түвшин: гулсуулагч биш, 4 товч. Анхны дуу (0.7) "Дунд" болно. */
export const VOLUME_LEVELS: readonly { label: string; value: number }[] = [
  { label: 'Унтраах', value: 0 },
  { label: 'Бага', value: 0.3 },
  { label: 'Дунд', value: 0.7 },
  { label: 'Их', value: 1 },
];

/** Хадгалсан дууны утгад хамгийн ойр түвшний индекс (хуучин гулсуулагчийн утгыг ч зөв таана) */
export function volumeLevelIndex(volume: number): number {
  let best = 0;
  VOLUME_LEVELS.forEach((level, i) => {
    if (Math.abs(level.value - volume) < Math.abs(VOLUME_LEVELS[best].value - volume)) best = i;
  });
  return best;
}

/** "Утас гацаж байна уу?": Автомат / Хурдан / Гоё (хуучин Бага / Дунд / Өндөр чанар) */
export type PerformanceMode = 'auto' | 'fast' | 'pretty';

export const PERFORMANCE_OPTIONS: readonly { value: PerformanceMode; label: string; hint: string }[] = [
  { value: 'auto', label: 'Автомат', hint: 'Утас өөрөө тохируулна (санал болгох)' },
  { value: 'fast', label: 'Хурдан', hint: 'Гацахгүй, сүүдэр ба гялбаа бага' },
  { value: 'pretty', label: 'Гоё', hint: 'Сүүдэр, гялбаа бүрэн — хүчтэй утас хэрэгтэй' },
];

type Quality = 'low' | 'medium' | 'high';

export function performanceMode(settings: { autoQuality: boolean; quality: Quality }): PerformanceMode {
  if (settings.autoQuality) return 'auto';
  return settings.quality === 'low' ? 'fast' : 'pretty';
}

/** Сонголтыг одоо байгаа тохиргооны талбар болгон хөрвүүлнэ (useSettingsStore.set-д өгнө) */
export function performancePatch(mode: PerformanceMode): { autoQuality: boolean; qualityManuallySet?: boolean; quality?: Quality } {
  if (mode === 'auto') return { autoQuality: true, qualityManuallySet: false };
  return { autoQuality: false, quality: mode === 'fast' ? 'low' : 'high' };
}
