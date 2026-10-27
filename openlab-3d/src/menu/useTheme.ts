/** Сурагчийн сонгосон өнгө (Тохиргоо → Өнгө сонгох). Өөрчлөгдөхөд цэс, ☰ товч хоёулаа шууд шинэчлэгдэнэ. */
import { useSettingsStore } from '../store/useSettingsStore';
import { themeById, type Theme } from '../theme/themes';

export function useTheme(): Theme {
  return themeById(useSettingsStore((s) => s.theme));
}
