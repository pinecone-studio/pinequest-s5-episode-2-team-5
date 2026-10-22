import { useEffect, useState, type ReactNode } from 'react';
import { useSettingsStore, type Quality } from '../store/useSettingsStore';
import { ACTION_LABELS, keyLabel, type ActionName } from '../controls/keyMap';
import { sounds } from '../utils/sounds';

function Row({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <div className="text-sm font-medium text-slate-800">{label}</div>
        {hint && <div className="text-xs text-slate-500">{hint}</div>}
      </div>
      <div className="shrink-0">{children}</div>
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
          className={`focus-ring rounded-lg px-3 py-1.5 text-xs font-semibold transition ${value === o.value ? 'bg-white text-lab-ink shadow' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const REMAPPABLE: ActionName[] = ['forward', 'backward', 'left', 'right', 'sprint', 'jump', 'interact', 'inspect', 'drop', 'tools', 'notes', 'map', 'turnLeft', 'turnRight'];

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
              aria-label={`Rebind ${ACTION_LABELS[a]}, currently ${keyLabel(bindings[a][0])}`}
              className={`focus-ring kbd min-w-[3.2em] ${listening === a ? 'animate-pulse !border-lab-yellow !bg-amber-50' : ''}`}
            >
              {listening === a ? '…' : keyLabel(bindings[a][0])}
            </button>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-slate-500">{listening ? 'Press a key (Esc cancels)' : 'Click a key to remap it.'}</span>
        <button type="button" className="btn-ghost !px-3 !py-1 text-xs" onClick={reset}>
          Reset keys
        </button>
      </div>
    </div>
  );
}

export function SettingsPanel() {
  const s = useSettingsStore();
  useEffect(() => sounds.setVolume(s.volume), [s.volume]);
  return (
    <div className="divide-y divide-slate-100">
      <section className="pb-3">
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Controls</h3>
        <Row label="Look mode" hint="Keyboard turn: ←/→ or Q/E rotate, Enter interacts">
          <Segmented
            label="Look mode"
            value={s.lookMode}
            onChange={(v) => s.set({ lookMode: v })}
            options={[
              { value: 'mouse', label: 'Mouse look' },
              { value: 'keyboard', label: 'Keyboard turn' },
            ]}
          />
        </Row>
        <Row label={`Mouse sensitivity · ${s.sensitivity.toFixed(1)}`}>
          <input aria-label="Mouse sensitivity" className="range w-36" type="range" min={0.2} max={3} step={0.1} value={s.sensitivity} onChange={(e) => s.set({ sensitivity: Number(e.target.value) })} />
        </Row>
        <Row label="Invert Y axis">
          <Toggle label="Invert Y axis" checked={s.invertY} onChange={(v) => s.set({ invertY: v })} />
        </Row>
        <Row label="Allow jumping" hint="Space">
          <Toggle label="Allow jumping" checked={s.jumpEnabled} onChange={(v) => s.set({ jumpEnabled: v })} />
        </Row>
      </section>
      <section className="py-3">
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">View & comfort</h3>
        <Row label={`Field of view · ${s.fov}°`}>
          <input aria-label="Field of view" className="range w-36" type="range" min={60} max={100} step={1} value={s.fov} onChange={(e) => s.set({ fov: Number(e.target.value) })} />
        </Row>
        <Row label="Head bob">
          <Toggle label="Head bob" checked={s.headBob} onChange={(v) => s.set({ headBob: v })} />
        </Row>
        <Row label="Reduced motion" hint="Disables head bob and item sway">
          <Toggle label="Reduced motion" checked={s.reducedMotion} onChange={(v) => s.set({ reducedMotion: v })} />
        </Row>
        <Row label="Guided mode" hint="Floor arrows lead to the next step">
          <Toggle label="Guided mode" checked={s.guided} onChange={(v) => s.set({ guided: v })} />
        </Row>
      </section>
      <section className="py-3">
        <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">Graphics & sound</h3>
        <Row label="Graphics quality" hint="Low disables post-processing, shadows and glass refraction">
          <Segmented<Quality>
            label="Graphics quality"
            value={s.quality}
            onChange={(v) => s.set({ quality: v })}
            options={[
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
            ]}
          />
        </Row>
        <Row label="Show FPS">
          <Toggle label="Show FPS" checked={s.showFps} onChange={(v) => s.set({ showFps: v })} />
        </Row>
        <Row label={`Master volume · ${Math.round(s.volume * 100)}%`}>
          <input aria-label="Master volume" className="range w-36" type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => s.set({ volume: Number(e.target.value) })} />
        </Row>
      </section>
      <section className="pt-3">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Key bindings</h3>
        <KeyRemap />
      </section>
    </div>
  );
}
