import test from 'node:test';
import assert from 'node:assert/strict';
import { PERFORMANCE_OPTIONS, VOLUME_LEVELS, performanceMode, performancePatch, volumeLevelIndex } from '../src/menu/settingsOptions.ts';
import { DEFAULT_THEME, THEMES, isThemeId, themeById, themeStyle } from '../src/theme/themes.ts';

test('дууны 4 түвшин: Унтраах / Бага / Дунд / Их', () => {
  assert.deepEqual(VOLUME_LEVELS.map((l) => l.label), ['Унтраах', 'Бага', 'Дунд', 'Их']);
  assert.deepEqual(VOLUME_LEVELS.map((l) => l.value), [0, 0.3, 0.7, 1]);
});

test('хадгалсан дууны утга хамгийн ойр түвшинд таарна (хуучин гулсуулагчийн утга ч)', () => {
  assert.equal(volumeLevelIndex(0.7), 2); // анхны дуу = "Дунд"
  assert.equal(volumeLevelIndex(0), 0);
  assert.equal(volumeLevelIndex(1), 3);
  assert.equal(volumeLevelIndex(0.31), 1);
  assert.equal(volumeLevelIndex(0.62), 2);
  assert.equal(volumeLevelIndex(0.95), 3);
});

test('"Утас гацаж байна уу?": Автомат / Хурдан / Гоё хоёр тийшээ зөв хөрвөнө', () => {
  assert.deepEqual(PERFORMANCE_OPTIONS.map((o) => o.label), ['Автомат', 'Хурдан', 'Гоё']);
  assert.equal(performanceMode({ autoQuality: true, quality: 'high' }), 'auto');
  assert.equal(performanceMode({ autoQuality: false, quality: 'low' }), 'fast');
  assert.equal(performanceMode({ autoQuality: false, quality: 'medium' }), 'pretty'); // хуучин "Дунд" нь "Гоё" гэж харагдана
  assert.equal(performanceMode({ autoQuality: false, quality: 'high' }), 'pretty');
  assert.deepEqual(performancePatch('auto'), { autoQuality: true, qualityManuallySet: false });
  assert.deepEqual(performancePatch('fast'), { autoQuality: false, quality: 'low' });
  assert.deepEqual(performancePatch('pretty'), { autoQuality: false, quality: 'high' });
});

test('5 өнгө: Тэнгис, Индиго, Далайн ногоон, Цайвар, Шөнийн лаб', () => {
  assert.deepEqual(THEMES.map((t) => t.name), ['Тэнгис', 'Индиго', 'Далайн ногоон', 'Цайвар', 'Шөнийн лаб']);
  assert.equal(new Set(THEMES.map((t) => t.id)).size, 5);
  assert.equal(DEFAULT_THEME.id, 'tengis');
});

test('өнгө бүрт бүх өнгөний талбар бий', () => {
  const keys = ['screenTop', 'screenMid', 'screenBottom', 'ink', 'inkSoft', 'card', 'cardActive', 'accent', 'accentInk', 'primary', 'primaryInk', 'liquid'];
  for (const theme of THEMES) for (const key of keys) assert.ok(typeof theme[key] === 'string' && theme[key].length > 0, `${theme.id}.${key}`);
});

test('спецификацийн өнгө таарна (дэвсгэр, товч, шингэн)', () => {
  const by = (id) => THEMES.find((t) => t.id === id);
  assert.deepEqual([by('indigo').screenMid, by('indigo').accent, by('indigo').accentInk, by('indigo').liquid], ['#3B33B8', '#F2B53A', '#3A2600', '#E5398A']);
  assert.deepEqual([by('ocean').screenMid, by('ocean').accent, by('ocean').accentInk, by('ocean').liquid], ['#0E6B67', '#FFFFFF', '#0B4F4C', '#F2B53A']);
  assert.deepEqual([by('light').screenMid, by('light').accent, by('light').accentInk, by('light').liquid], ['#F6F4FC', '#3B33B8', '#FFFFFF', '#E5398A']);
  assert.deepEqual([by('night').screenMid, by('night').accent, by('night').accentInk, by('night').liquid], ['#14123A', '#FF8A3D', '#2A1200', '#22C7E0']);
});

test('алдаатай хадгалсан өнгө анхны өнгө болно', () => {
  assert.equal(isThemeId('night'), true);
  assert.equal(isThemeId('pink'), false);
  assert.equal(isThemeId(undefined), false);
  assert.equal(themeById('pink').id, 'tengis');
  assert.equal(themeById('night').name, 'Шөнийн лаб');
});

test('themeStyle: CSS хувьсагч (--t-*) гаргана, id/name орохгүй', () => {
  const style = themeStyle(THEMES[1]);
  assert.equal(style['--t-screen-top'], '#5047D0');
  assert.equal(style['--t-accent-ink'], '#3A2600');
  assert.equal(style['--t-primary-ink'], '#FFFFFF');
  assert.equal('--t-id' in style, false);
  assert.equal('--t-name' in style, false);
});

// ---- Удирдлага таб: харагдах байдлын туслахууд (src/menu/controlsView.ts) ----
import { iconFor, isKeyInput, keyParts } from '../src/menu/controlsView.ts';

test('isKeyInput: товчлуур бол true, хөдөлгөөний тайлбар (кирилл) бол false', () => {
  assert.equal(isKeyInput('W A S D / ↑ ← ↓ →'), true);
  assert.equal(isKeyInput('Esc'), true);
  assert.equal(isKeyInput('⇧'), true);
  assert.equal(isKeyInput('F'), true);
  assert.equal(isKeyInput('Хулгана'), false);
  assert.equal(isKeyInput('Зүүн чирэх'), false);
  assert.equal(isKeyInput('Зүүн талын joystick'), false);
  assert.equal(isKeyInput('Дугуй / + −'), false);
});

test('keyParts: "/" тусгаарлагчийг хадгална, хоосон зайг алгасна', () => {
  assert.deepEqual(keyParts('W A  / ↑'), ['W', 'A', '/', '↑']);
  assert.deepEqual(keyParts(''), []);
});

test('iconFor: үйлдэл бүрт дүрс, мэдэгдэхгүйд "▸"', () => {
  assert.equal(iconFor('Алхах'), '🚶');
  assert.equal(iconFor('Эргэн харах'), '👀');
  assert.equal(iconFor('Ойроос харах'), '🔍');
  assert.equal(iconFor('Харилцах / авах'), '✋');
  assert.equal(iconFor('Ашиглах: асгах, дусаах, хэмжих, хутгах (дарсаар)'), '🫗');
  assert.equal(iconFor('Шидэх'), '🎯');
  assert.equal(iconFor('Үсрэх'), '🦘');
  assert.equal(iconFor('Багажны шургуулга'), '🧰');
  assert.equal(iconFor('Газрын зураг'), '🗺️');
  assert.equal(iconFor('Огт өөр зүйл'), '▸');
});
