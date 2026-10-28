import { useEffect, useState, type ReactNode } from 'react';
import { useSettingsStore, type Quality } from '../store/useSettingsStore';
import { ACTION_LABELS, keyLabel, type ActionName } from '../controls/keyMap';
import { sounds } from '../utils/sounds';
import { isTouchDevice } from '../utils/device';

/** A setting: label and hint on the left, control on the right (or below it when `stacked`). */
function Row({ label, children, hint, stacked = false }: { label: string; children: ReactNode; hint?: string; stacked?: boolean }) {
  return (
    <div className={stacked ? 'flex flex-col gap-2 py-2' : 'flex items-center justify-between gap-4 py-2'}>
      <div>
        <div className="text-sm font-medium text-slate-800">{label}</div>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
      </div>
      <div className={stacked ? '' : 'shrink-0'}>{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => {
        onChange(!checked);
        sounds.play('ui');
      }}
      className={`focus-ring relative h-7 w-12 rounded-full transition ${checked ? 'bg-lab-yellow' : 'bg-slate-300'}`}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all ${checked ? 'left-6' : 'left-1'}`} />
    </button>
  );
}

const QUALITY_LABEL: Record<Quality, string> = { low: 'Бага', medium: 'Дунд', high: 'Өндөр' };

function Segmented<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-xl bg-slate-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => {
            onChange(o.value);
            sounds.play('ui');
          }}
          className={`focus-ring flex-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${value === o.value ? 'bg-white text-lab-ink shadow' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const REMAPPABLE: ActionName[] = ['forward', 'backward', 'left', 'right', 'sprint', 'jump', 'interact', 'inspect', 'drop', 'grab', 'pour', 'throw', 'cursor', 'closeup', 'tools', 'notes', 'turnLeft', 'turnRight'];

function KeyRemap() {
  const bindings = useSettingsStore((s) => s.bindings);
  const rebind = useSettingsStore((s) => s.rebind);
  const reset = useSettingsStore((s) => s.resetBindings);
  const [listening, setListening] = useState<ActionName | null>(null);
  useEffect(() => {
    if (!listening) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      if (e.code !== 'Escape') rebind(listening, e.code);
      setListening(null);
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [listening, rebind]);
  return (
    <div>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {REMAPPABLE.map((a) => (
          <div key={a} className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-slate-50">
            <span className="text-xs text-slate-600">{ACTION_LABELS[a]}</span>
            <button
              type="button"
              data-capture="keys"
              onClick={() => setListening(a)}
              aria-label={`${ACTION_LABELS[a]} товчийг солих, одоо ${keyLabel(bindings[a][0])}`}
              className={`focus-ring kbd min-w-[3.2em] ${listening === a ? 'animate-pulse !border-lab-yellow !bg-amber-50' : ''}`}
            >
              {listening === a ? '…' : keyLabel(bindings[a][0])}
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-slate-500">{listening ? 'Шинэ товчоо дарна уу (Esc цуцална)' : 'Солих товчоо дарна уу.'}</span>
        <button type="button" className="btn-ghost !px-3 !py-1 text-xs" onClick={reset}>
          Анхны товчлуур
        </button>
      </div>
    </div>
  );
}

export function SettingsPanel() {
  const s = useSettingsStore();
  // Phones and tablets have no mouse or keyboard: hide those settings there.
  const touch = isTouchDevice();
  useEffect(() => sounds.setVolume(s.volume), [s.volume]);
  return (
    <div className="divide-y divide-slate-100">
      <section className="pb-3">
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Удирдлага</h3>
        {!touch && (
          <Row label="Харах горим" hint="Товчлуураар: ←/→ эсвэл Q/E эргүүлнэ, Enter ашиглана">
            <Segmented
              label="Харах горим"
              value={s.lookMode}
              onChange={(v) => s.set({ lookMode: v })}
              options={[
                { value: 'mouse', label: 'Хулганаар' },
                { value: 'keyboard', label: 'Товчлуураар' },
              ]}
            />
          </Row>
        )}
        <Row label={`${touch ? 'Харах мэдрэмж' : 'Хулганы мэдрэмж'} · ${s.sensitivity.toFixed(1)}`}>
          <input aria-label={touch ? 'Харах мэдрэмж' : 'Хулганы мэдрэмж'} className="range w-36" type="range" min={0.2} max={3} step={0.1} value={s.sensitivity} onChange={(e) => s.set({ sensitivity: Number(e.target.value) })} />
        </Row>
        <Row label="Босоо тэнхлэгийг урвуулах">
          <Toggle label="Босоо тэнхлэгийг урвуулах" checked={s.invertY} onChange={(v) => s.set({ invertY: v })} />
        </Row>
        <Row label="Үсрэхийг зөвшөөрөх" hint="Space">
          <Toggle label="Үсрэхийг зөвшөөрөх" checked={s.jumpEnabled} onChange={(v) => s.set({ jumpEnabled: v })} />
        </Row>
      </section>
      <section className="py-3">
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Харагдац ба тав тух</h3>
        <Row label={`Харах өнцөг · ${s.fov}°`}>
          <input aria-label="Харах өнцөг" className="range w-36" type="range" min={60} max={100} step={1} value={s.fov} onChange={(e) => s.set({ fov: Number(e.target.value) })} />
        </Row>
        <Row label="Алхахад ганхах">
          <Toggle label="Алхахад ганхах" checked={s.headBob} onChange={(v) => s.set({ headBob: v })} />
        </Row>
        <Row label="Хөдөлгөөн багасгах" hint="Алхахад ганхах болон эд зүйлсийн найгалтыг унтраана">
          <Toggle label="Хөдөлгөөн багасгах" checked={s.reducedMotion} onChange={(v) => s.set({ reducedMotion: v })} />
        </Row>
      </section>
      <section className="py-3">
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">График ба дуу</h3>
        <Row stacked label="Графикийн чанар" hint={s.autoQuality ? `Автомат: 60 FPS барихын тулд чанар, нягтралыг өөрөө тохируулна · одоо ${QUALITY_LABEL[s.quality]}` : 'Бага: нэмэлт эффект, сүүдэр, шилний хугарал унтарна'}>
          <Segmented<Quality | 'auto'>
            label="Графикийн чанар"
            value={s.autoQuality ? 'auto' : s.quality}
            onChange={(v) => (v === 'auto' ? s.set({ autoQuality: true, qualityManuallySet: false }) : s.set({ autoQuality: false, quality: v }))}
            options={[
              { value: 'auto', label: 'Автомат' },
              { value: 'low', label: 'Бага' },
              { value: 'medium', label: 'Дунд' },
              { value: 'high', label: 'Өндөр' },
            ]}
          />
        </Row>
        <Row label="FPS харуулах">
          <Toggle label="FPS харуулах" checked={s.showFps} onChange={(v) => s.set({ showFps: v })} />
        </Row>
        <Row label={`Дууны түвшин · ${Math.round(s.volume * 100)}%`}>
          <input aria-label="Дууны түвшин" className="range w-36" type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => s.set({ volume: Number(e.target.value) })} />
        </Row>
      </section>
      {!touch && (
        <section className="pt-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Товчлуурын тохиргоо</h3>
          <KeyRemap />
        </section>
      )}
    </div>
  );
}
