/**
 * ⚙ дарахад гарах дэлгэц: хоёр таб — "Тохиргоо" ба "Удирдлага". Хүүхдэд ойлгомжтой хэлбэр: том товч (≥44px),
 * сонгосон нь тод шар. Бүх өнгө сонгосон сэдвээс (bg-t-*). Тохиргоо store-д шууд хадгалагдаж, утсанд үлдэнэ.
 *
 * Одоогийн байдал:
 *  - Тохиргоо: хөдөлгөөн багасгах, дууны түвшин, утас гацаж байна уу, өнгө сонгох. "Нарийвчилсан (компьютерт)" эвхэгдэх хэсэгт
 *    хуучин техникийн тохиргоо (хулганы мэдрэмж, харах өнцөг, товчлуур өөрчлөх …) хэвээр орно.
 *  - Удирдлага: хуучин жагсаалтын агуулга ЯГ ИЖИЛ, зөвхөн шинэ загвартай (ControlsScreen).
 */
import { useState, type ReactNode } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { THEMES } from '../theme/themes';
import { SettingsPanel } from '../ui/SettingsPanel';
import { sounds } from '../utils/sounds';
import { ControlsScreen } from './ControlsScreen';
import { PERFORMANCE_OPTIONS, VOLUME_LEVELS, performanceMode, performancePatch, volumeLevelIndex } from './settingsOptions';

type Tab = 'settings' | 'controls';

const TABS: { id: Tab; label: string }[] = [
  { id: 'settings', label: 'Тохиргоо' },
  { id: 'controls', label: 'Удирдлага' },
];

const FOCUS = 'focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--t-accent)]';

function Heading({ children }: { children: ReactNode }) {
  return <h2 className="px-1 font-heading text-base font-bold leading-snug">{children}</h2>;
}

/** Сонгох товчнууд (радио бүлэг) нэг хүрээн дотор: сонгосон нь тод шар */
function Segmented<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string }[]; onChange: (value: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-1.5 rounded-3xl bg-t-card p-1.5" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              onChange(option.value);
              sounds.play('ui');
            }}
            className={`min-h-[52px] rounded-2xl px-2 text-center font-heading text-sm font-bold transition ${FOCUS} ${selected ? 'bg-t-accent text-t-accent-ink' : ''}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Шилжүүлэгч: мөр бүхэлдээ дарагдана (хуруугаар хялбар), доор нь нэг мөр тайлбар */
function SwitchRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => {
        onChange(!checked);
        sounds.play('ui');
      }}
      className={`flex min-h-[64px] w-full items-center gap-3 rounded-3xl bg-t-card px-4 py-3 text-left ${FOCUS}`}
    >
      <span className="flex-1">
        <span className="block font-heading text-sm font-bold">{label}</span>
        <span className="mt-0.5 block text-sm text-t-ink-soft">{hint}</span>
      </span>
      <span className="relative h-8 w-14 shrink-0 rounded-full transition" style={{ background: checked ? 'var(--t-accent)' : 'var(--t-card-active)' }} aria-hidden="true">
        <span className="absolute top-1 h-6 w-6 rounded-full shadow transition-all" style={{ left: checked ? '1.75rem' : '0.25rem', background: checked ? 'var(--t-accent-ink)' : '#fff' }} />
      </span>
    </button>
  );
}

/** Өнгө сонгогч: өнгө бүр өөрийн өнгөөрөө (2 цэгтэй дөрвөлжин) харагдана, сонгосон нь шар хүрээтэй */
function ThemePicker() {
  const theme = useSettingsStore((s) => s.theme);
  const set = useSettingsStore((s) => s.set);
  return (
    <div role="radiogroup" aria-label="Өнгө" className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(8.5rem, 1fr))' }}>
      {THEMES.map((t) => {
        const selected = t.id === theme;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => {
              set({ theme: t.id });
              sounds.play('ui');
            }}
            className={`flex min-h-[100px] flex-col items-center justify-center gap-2 rounded-3xl p-2 text-center transition ${FOCUS} ${selected ? 'bg-t-card-active' : 'bg-t-card'}`}
            style={selected ? { boxShadow: 'inset 0 0 0 3px var(--t-accent)' } : undefined}
          >
            <span className="flex h-11 w-14 items-center justify-center gap-0.5 rounded-xl" style={{ background: t.screenMid }} aria-hidden="true">
              {[t.accent, t.liquid].map((color, i) => (
                <span key={i} className="h-4 w-4 rounded-full" style={{ background: color, boxShadow: '0 0 0 2px rgba(255,255,255,0.9)' }} />
              ))}
            </span>
            <span className="font-heading text-[13px] font-bold leading-tight">{t.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function SettingsTab() {
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const volume = useSettingsStore((s) => s.volume);
  const autoQuality = useSettingsStore((s) => s.autoQuality);
  const quality = useSettingsStore((s) => s.quality);
  const set = useSettingsStore((s) => s.set);
  const [advanced, setAdvanced] = useState(false);
  return (
    <div className="grid gap-4">
      <SwitchRow label="Хөдөлгөөн багасгах" hint="Дэлгэц шилжихэд хөдөлгөөнт эффект гарахгүй" checked={reducedMotion} onChange={(value) => set({ reducedMotion: value })} />

      <Heading>Дууны түвшин</Heading>
      <Segmented
        label="Дууны түвшин"
        value={volumeLevelIndex(volume)}
        options={VOLUME_LEVELS.map((level, index) => ({ value: index, label: level.label }))}
        onChange={(index) => set({ volume: VOLUME_LEVELS[index].value })}
      />

      <Heading>Утас гацаж байна уу?</Heading>
      <Segmented label="Гацаж байна уу" value={performanceMode({ autoQuality, quality })} options={PERFORMANCE_OPTIONS} onChange={(mode) => set(performancePatch(mode))} />

      <Heading>Өнгө сонгох</Heading>
      <ThemePicker />

      {/* Хуучин техникийн тохиргоо (хулганы мэдрэмж, харах өнцөг, товчлуур өөрчлөх …) — компьютерт хэрэгтэй тул нуугдмал */}
      <button
        type="button"
        aria-expanded={advanced}
        aria-controls="settings-advanced"
        onClick={() => {
          setAdvanced((open) => !open);
          sounds.play('ui');
        }}
        className={`flex min-h-[56px] w-full items-center gap-3 rounded-3xl bg-t-card px-4 text-left ${FOCUS}`}
      >
        <span aria-hidden="true" className={`text-lg font-bold transition-transform ${advanced ? 'rotate-90' : ''}`}>
          ›
        </span>
        <span className="flex-1 font-heading text-sm font-bold">Нарийвчилсан (компьютерт)</span>
      </button>
      {advanced && (
        <div id="settings-advanced" className="rounded-3xl bg-white p-3 text-lab-ink">
          <SettingsPanel />
        </div>
      )}
    </div>
  );
}

export function SettingsScreen() {
  const [tab, setTab] = useState<Tab>('settings');
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div role="tablist" aria-label="Тохиргоо ба удирдлага" className="mx-4 grid grid-cols-2 gap-1.5 rounded-3xl bg-t-card p-1.5">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              sounds.play('ui');
            }}
            className={`min-h-[52px] rounded-2xl px-3 font-heading text-base font-bold transition ${FOCUS} ${tab === t.id ? 'bg-t-accent text-t-accent-ink' : ''}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" className="scrollbar-thin flex-1 overflow-y-auto px-4 pb-8 pt-4">
        {tab === 'settings' && <SettingsTab />}
        {tab === 'controls' && <ControlsScreen />}
      </div>
    </div>
  );
}
