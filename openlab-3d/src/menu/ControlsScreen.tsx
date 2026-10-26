/**
 * "Удирдлага" таб: "Утсанд / Компьютерт" сонголт, үйлдэл бүр дүрстэй карт.
 * АГУУЛГА хуучин жагсаалттай ЯГ ИЖИЛ (ui/ControlsHelp.tsx-ийн controlRows) — зөвхөн харагдах байдал шинэ.
 * Товчлуурын нэрс хэрэглэгчийн тохируулсан товчлуураас (bindings) уншигдана.
 */
import { useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { controlRows } from '../ui/ControlsHelp';
import { isTouchDevice } from '../utils/device';
import { sounds } from '../utils/sounds';
import { iconFor, isKeyInput, keyParts } from './controlsView';

type Device = 'touch' | 'desktop';

const DEVICES: { id: Device; label: string }[] = [
  { id: 'touch', label: 'Утсанд' },
  { id: 'desktop', label: 'Компьютерт' },
];

/** Хуучин "Удирдлага" самбар дээрх тайлбар (ui/ControlsHelp.tsx) */
const HINTS: Record<Device, string> = {
  touch: 'Онилох үед гэрэлтсэн зүйлийг товш. Баруун талд чирэх нь харах хөдөлгөөн хэвээр.',
  desktop: 'Багаж руу ойртоход цагаанаар гэрэлтэнэ. Дараа нь дэлгэцийн доор харагдах товчлуурыг ашиглаарай.',
};

export function ControlsScreen() {
  const bindings = useSettingsStore((s) => s.bindings);
  const lookMode = useSettingsStore((s) => s.lookMode);
  const [device, setDevice] = useState<Device>(isTouchDevice() ? 'touch' : 'desktop');
  const rows = controlRows(device === 'touch', bindings, lookMode);
  return (
    <div className="grid gap-3">
      <div role="radiogroup" aria-label="Төхөөрөмж" className="grid grid-cols-2 gap-1.5 rounded-3xl bg-t-card p-1.5">
        {DEVICES.map((d) => (
          <button
            key={d.id}
            type="button"
            role="radio"
            aria-checked={device === d.id}
            onClick={() => {
              setDevice(d.id);
              sounds.play('ui');
            }}
            className={`min-h-[52px] rounded-2xl px-3 font-heading text-base font-bold transition focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--t-accent)] ${device === d.id ? 'bg-t-accent text-t-accent-ink' : ''}`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <p className="px-1 text-sm leading-relaxed text-t-ink-soft">{HINTS[device]}</p>

      <ul className="grid gap-2">
        {rows.map(([input, action], index) => (
          <li key={`${action}-${index}`} className="flex min-h-[64px] items-center gap-3 rounded-3xl bg-t-card p-3">
            <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-t-card-active text-2xl">
              {iconFor(action)}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-heading text-sm font-bold leading-snug">{action}</h3>
              <p className="mt-1 flex flex-wrap items-center gap-1 text-sm text-t-ink-soft">
                {isKeyInput(input)
                  ? keyParts(input).map((part, i) =>
                      part === '/' ? (
                        <span key={i}>/</span>
                      ) : (
                        <kbd key={i} className="inline-flex min-w-[1.8em] items-center justify-center rounded-md px-1.5 py-0.5 font-mono text-xs font-bold text-t-ink" style={{ background: 'var(--t-card-active)', boxShadow: '0 2px 0 rgba(0,0,0,0.25)' }}>
                          {part}
                        </kbd>
                      ),
                    )
                  : input}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
