/**
 * True on phones/tablets: ChemQuest апп (Expo Go) доторх WebView, эсвэл үндсэн заагч нь хуруу.
 * PC дээр (хулгана/trackpad, мэдрэгч дэлгэцтэй зөөврийн компьютер ч гэсэн) false.
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  // react-native-webview энэ объектыг зөвхөн апп доторх WebView-д өгдөг.
  if ((window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView) return true;
  // `pointer: coarse` = үндсэн заагч нь хуруу. `ontouchstart` нь мэдрэгч дэлгэцтэй PC дээр ч үнэн
  // байдаг тул зөвхөн matchMedia дэмждэггүй хуучин browser-д л нөөцөөр хэрэглэнэ.
  if (window.matchMedia) return window.matchMedia('(pointer: coarse)').matches;
  return 'ontouchstart' in window;
}
