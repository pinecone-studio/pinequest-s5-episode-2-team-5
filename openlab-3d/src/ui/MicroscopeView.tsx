/**
 * Full-screen eyepiece overlay.
 *  - Millikan: circular field of view (1.2 mm) with an illuminated reticle (0.1 mm lines),
 *    glowing droplets from the live simulation, click-to-select, a stopwatch (Space) and
 *    Record buttons that log fall / field / balance measurements.
 *  - Specimen: prepared slides for the biology microscopes; scroll focuses, 1/2/3 switch
 *    objectives.
 * Esc or E closes the view.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore, type MicroscopeTarget } from '../store/useGameStore';
import { useExperimentStore, type MeasurementKind } from '../store/useExperimentStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { requestLock } from '../controls/usePointerLock';
import { FIELD_H, getDrop, sim, sprayDrops, startSimLoop } from '../experiment/millikanSim';
import { drawSpecimen, type CellPattern } from '../utils/textures';
import { sounds } from '../utils/sounds';
import { MILLIKAN } from '../utils/constants';
import { keyLabel } from '../controls/keyMap';

function closeView() {
  useGameStore.getState().setMode('walk');
  requestLock();
}

function useEyepieceSize(): number {
  const [size, setSize] = useState(() => Math.min(window.innerWidth * 0.92, window.innerHeight * 0.64));
  useEffect(() => {
    const onResize = () => setSize(Math.min(window.innerWidth * 0.92, window.innerHeight * 0.64));
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${String(m).padStart(2, '0')}:${rest.toFixed(2).padStart(5, '0')}`;
}

const DISTANCES = [0.1, 0.2, 0.5, 1.0];

function MillikanEyepiece({ size }: { size: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const power = useExperimentStore((s) => s.power);
  const voltage = useExperimentStore((s) => s.voltage);
  const polarity = useExperimentStore((s) => s.polarity);
  const selected = useExperimentStore((s) => s.selectedDrop);
  const stopwatch = useExperimentStore((s) => s.stopwatch);
  const distance = useExperimentStore((s) => s.distanceMm);
  const dropCount = useExperimentStore((s) => s.dropCount);
  const startY = useRef<number | null>(null);
  const direction = useRef<1 | -1>(1);
  const [, force] = useState(0);
  const timeLabel = useRef<HTMLSpanElement>(null);
  const motionLabel = useRef<HTMLSpanElement>(null);
  const fieldOn = power && polarity !== 0 && voltage > 0;

  // Render loop: drops, reticle, stopwatch readout.
  useEffect(() => {
    startSimLoop();
    const c = canvas.current;
    if (!c) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(size * dpr);
    c.height = Math.round(size * dpr);
    const ctx = c.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    const pxPerMm = size / FIELD_H;
    const toY = (y: number) => size / 2 + (FIELD_H / 2 - y) * pxPerMm;
    const toX = (x: number) => size / 2 + x * pxPerMm;
    const draw = () => {
      const exp = useExperimentStore.getState();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Background (illumination).
      if (exp.power) {
        const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.05, size / 2, size / 2, size * 0.55);
        g.addColorStop(0, '#13263b');
        g.addColorStop(1, '#03070c');
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = '#010102';
      }
      ctx.fillRect(0, 0, size, size);
      // Reticle (illuminated when the lamp is on).
      const lineAlpha = exp.power ? 1 : 0.18;
      for (let k = 0; k <= Math.round(FIELD_H / 0.1); k++) {
        const y = toY(k * 0.1);
        const major = k % 5 === 0;
        ctx.strokeStyle = `rgba(150,210,255,${(major ? 0.55 : 0.22) * lineAlpha})`;
        ctx.lineWidth = major ? 1.6 : 1;
        ctx.beginPath();
        ctx.moveTo(size * 0.12, y);
        ctx.lineTo(size * 0.88, y);
        ctx.stroke();
        if (major) {
          ctx.fillStyle = `rgba(170,220,255,${0.85 * lineAlpha})`;
          ctx.font = `600 ${Math.round(size * 0.026)}px Inter, sans-serif`;
          ctx.textAlign = 'right';
          ctx.fillText(`${(k * 0.1).toFixed(1)} mm`, size * 0.11, y + size * 0.009);
        }
      }
      ctx.strokeStyle = `rgba(150,210,255,${0.3 * lineAlpha})`;
      ctx.beginPath();
      ctx.moveTo(size / 2, toY(0));
      ctx.lineTo(size / 2, toY(FIELD_H));
      ctx.stroke();
      for (let k = 0; k <= 24; k++) {
        const y = toY(k * 0.05);
        ctx.beginPath();
        ctx.moveTo(size / 2 - (k % 2 ? 4 : 8), y);
        ctx.lineTo(size / 2 + (k % 2 ? 4 : 8), y);
        ctx.stroke();
      }
      // Droplets.
      if (exp.power) {
        const t = performance.now() / 1000;
        for (const d of sim.drops) {
          if (d.y < -0.1 || d.y > FIELD_H + 0.1) continue;
          const x = toX(d.x);
          const y = toY(d.y);
          const rel = d.radius / 1e-6;
          const r = 1.4 + rel * 2.6;
          const bright = Math.min(1, 0.35 + rel * rel * 0.9) * (0.85 + 0.15 * Math.sin(t * 7 + d.twinkle));
          const g = ctx.createRadialGradient(x, y, 0, x, y, r * 4);
          g.addColorStop(0, `rgba(255,252,235,${bright})`);
          g.addColorStop(0.25, `rgba(255,236,170,${bright * 0.75})`);
          g.addColorStop(1, 'rgba(255,220,140,0)');
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, y, r * 4, 0, Math.PI * 2);
          ctx.fill();
          if (d.id === exp.selectedDrop) {
            ctx.strokeStyle = '#38e1ff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, r * 4 + 6, 0, Math.PI * 2);
            ctx.stroke();
            ctx.fillStyle = '#38e1ff';
            ctx.font = `700 ${Math.round(size * 0.028)}px Inter, sans-serif`;
            ctx.textAlign = 'left';
            ctx.fillText(d.label, x + r * 4 + 10, y - 6);
          }
        }
      }
      // Live readouts without React re-renders.
      const sw = exp.stopwatch;
      const elapsed = sw.running ? (performance.now() - sw.startedAt) / 1000 : sw.elapsed;
      if (timeLabel.current) timeLabel.current.textContent = formatTime(elapsed);
      const drop = getDrop(exp.selectedDrop);
      if (motionLabel.current) {
        if (!drop) motionLabel.current.textContent = exp.dropCount > 0 ? 'Click a drop to select it' : 'No drops — squeeze the atomizer (B)';
        else {
          const inView = drop.y >= 0 && drop.y <= FIELD_H;
          const state = Math.abs(drop.vy) < 0.004 ? 'hovering' : drop.vy > 0 ? 'rising ↑' : 'falling ↓';
          motionLabel.current.textContent = `${drop.label} · ${inView ? state : drop.y > FIELD_H ? 'above the view' : 'below the view'}`;
        }
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  const exp = useExperimentStore.getState;

  const toggleTimer = useCallback(() => {
    const e = exp();
    const drop = getDrop(e.selectedDrop);
    if (!e.stopwatch.running) {
      startY.current = drop ? drop.y : null;
    } else if (drop && startY.current !== null) {
      direction.current = drop.y >= startY.current ? 1 : -1;
    }
    e.toggleStopwatch(e.selectedDrop);
    sounds.play('beep');
  }, [exp]);

  const record = useCallback(
    (kind: MeasurementKind) => {
      const e = exp();
      const drop = getDrop(e.selectedDrop) ?? sim.drops.find((d) => d.id === e.stopwatch.dropId);
      const game = useGameStore.getState();
      if (!drop) {
        game.showToast('Select a drop first', 'Click a glowing drop in the eyepiece');
        return;
      }
      if (kind !== 'balance' && (e.stopwatch.running || e.stopwatch.elapsed <= 0.05)) {
        game.showToast('Time the drop first', 'Space to start, Space again to stop');
        return;
      }
      const m = e.record(kind, drop.id, drop.label, e.stopwatch.elapsed, direction.current);
      if (!m) {
        game.showToast(kind === 'fall' ? 'Turn the field off for a fall run' : 'Turn the field on', kind === 'fall' ? 'Set polarity to 0 (or 0 V)' : 'Polarity + or − with voltage above 0');
        sounds.play('tick');
        return;
      }
      sounds.play('success', 0.7);
      game.logEvent(
        kind === 'balance'
          ? `Recorded ${drop.label} balanced at ${m.voltage} V.`
          : `Recorded ${drop.label}: ${m.distanceMm} mm in ${m.timeS.toFixed(2)} s (${kind === 'fall' ? 'field off' : `${m.voltage} V`}).`,
      );
      game.showToast('Measurement recorded', `${drop.label} · ${kind === 'fall' ? 'fall' : kind === 'balance' ? 'balance' : 'field run'}`);
      e.resetStopwatch();
      force((n) => n + 1);
    },
    [exp],
  );

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      const e = exp();
      switch (ev.code) {
        case 'Space':
          ev.preventDefault();
          toggleTimer();
          break;
        case 'KeyR':
          e.resetStopwatch();
          break;
        case 'Digit1':
          record('fall');
          break;
        case 'Digit2':
          record('field');
          break;
        case 'Digit3':
        case 'KeyH':
          record('balance');
          break;
        case 'BracketRight':
        case 'ArrowRight':
          ev.preventDefault();
          e.nudgeVoltage(10);
          sounds.play('tick');
          break;
        case 'BracketLeft':
        case 'ArrowLeft':
          ev.preventDefault();
          e.nudgeVoltage(-10);
          sounds.play('tick');
          break;
        case 'KeyP':
          e.cyclePolarity();
          sounds.play('click');
          break;
        case 'KeyB':
          e.squeeze();
          sprayDrops();
          sounds.play('puff');
          break;
        case 'ArrowUp':
        case 'ArrowDown': {
          ev.preventDefault();
          const visible = sim.drops.filter((d) => d.y >= 0 && d.y <= FIELD_H);
          if (visible.length === 0) break;
          const idx = visible.findIndex((d) => d.id === e.selectedDrop);
          const next = visible[(idx + (ev.code === 'ArrowUp' ? -1 : 1) + visible.length) % visible.length];
          e.selectDrop(next.id);
          break;
        }
        default:
          break;
      }
    };
    const onWheel = (ev: WheelEvent) => {
      exp().nudgeVoltage(ev.deltaY < 0 ? 10 : -10);
      sounds.play('tick', 0.6);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('wheel', onWheel);
    };
  }, [exp, record, toggleTimer]);

  const onCanvasClick = (ev: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = ev.currentTarget.getBoundingClientRect();
    const px = ev.clientX - rect.left;
    const py = ev.clientY - rect.top;
    const pxPerMm = size / FIELD_H;
    let best: number | null = null;
    let bestD = 28;
    for (const d of sim.drops) {
      const x = size / 2 + d.x * pxPerMm;
      const y = size / 2 + (FIELD_H / 2 - d.y) * pxPerMm;
      const dist = Math.hypot(x - px, y - py);
      if (dist < bestD) {
        bestD = dist;
        best = d.id;
      }
    }
    exp().selectDrop(best);
    if (best !== null) sounds.play('tick');
  };

  const fieldKvPerM = fieldOn ? voltage / MILLIKAN.plateSeparation / 1000 : 0;
  const pol = polarity === 1 ? '+' : polarity === -1 ? '−' : '0';
  const btn = 'focus-ring rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40';

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-3">
      <div className="relative" style={{ width: size, height: size }}>
        <canvas
          ref={canvas}
          onClick={onCanvasClick}
          className="h-full w-full cursor-crosshair rounded-full"
          style={{ boxShadow: '0 0 0 10px #050505, 0 0 0 14px #1d1f22, 0 0 80px 30px rgba(0,0,0,0.9)' }}
          aria-label="Microscope field of view with oil droplets. Click a drop to select it."
        />
        <div className="pointer-events-none absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, transparent 58%, rgba(0,0,0,0.55) 70%, #000 72%)' }} />
        {!power && <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-center text-sm font-medium text-slate-400">Light source is OFF<br />Turn the apparatus on to see the drops</div>}
        {power && dropCount === 0 && <div className="pointer-events-none absolute inset-x-0 bottom-[22%] text-center text-sm text-slate-400">No droplets yet — press B to squeeze the atomizer</div>}
      </div>
      {/* Control strip (part of the eyepiece view, not the main HUD). */}
      <div className="flex w-full max-w-4xl flex-wrap items-stretch justify-center gap-2 text-white">
        <div className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2 text-xs backdrop-blur">
          <div>
            <div className="text-white/50">Voltage</div>
            <div className="font-mono text-base font-bold tabular-nums">{String(voltage).padStart(3, '0')} V</div>
          </div>
          <div className="flex flex-col gap-1">
            <button className={`${btn} bg-white/15 hover:bg-white/25`} onClick={() => exp().nudgeVoltage(10)} aria-label="Increase voltage">
              ▲
            </button>
            <button className={`${btn} bg-white/15 hover:bg-white/25`} onClick={() => exp().nudgeVoltage(-10)} aria-label="Decrease voltage">
              ▼
            </button>
          </div>
          <div>
            <div className="text-white/50">Polarity</div>
            <button className={`${btn} mt-0.5 bg-white/15 font-mono text-base hover:bg-white/25`} onClick={() => exp().cyclePolarity()} aria-label={`Polarity ${pol}, press to flip`}>
              {pol}
            </button>
          </div>
          <div className="hidden sm:block">
            <div className="text-white/50">Field E</div>
            <div className="font-mono tabular-nums">{fieldKvPerM.toFixed(1)} kV/m</div>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl bg-white/10 px-3 py-2 backdrop-blur">
          <div>
            <div className="text-[11px] text-white/50">Stopwatch</div>
            <span ref={timeLabel} className="font-mono text-2xl font-bold tabular-nums text-lab-yellow">
              00:00.00
            </span>
          </div>
          <button className={`${btn} bg-lab-yellow text-white hover:bg-lab-yellowDark`} onClick={toggleTimer}>
            {stopwatch.running ? 'Stop' : 'Start'} <span className="opacity-70">Space</span>
          </button>
          <button className={`${btn} bg-white/15 hover:bg-white/25`} onClick={() => exp().resetStopwatch()}>
            Reset <span className="opacity-60">R</span>
          </button>
        </div>
        <div className="flex flex-col justify-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs backdrop-blur">
          <div className="text-white/50">Distance between lines</div>
          <div className="flex gap-1" role="radiogroup" aria-label="Timed distance">
            {DISTANCES.map((d) => (
              <button key={d} role="radio" aria-checked={distance === d} className={`${btn} ${distance === d ? 'bg-white text-lab-ink' : 'bg-white/15 hover:bg-white/25'}`} onClick={() => exp().setDistance(d)}>
                {d} mm
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs backdrop-blur">
          <span ref={motionLabel} className="text-white/80">
            Click a drop to select it
          </span>
          <div className="flex flex-wrap gap-1">
            <button className={`${btn} bg-sky-500/80 hover:bg-sky-500`} disabled={fieldOn || selected === null} onClick={() => record('fall')}>
              Record fall <span className="opacity-70">1</span>
            </button>
            <button className={`${btn} bg-emerald-500/80 hover:bg-emerald-500`} disabled={!fieldOn || selected === null} onClick={() => record('field')}>
              Record field run <span className="opacity-70">2</span>
            </button>
            <button className={`${btn} bg-violet-500/80 hover:bg-violet-500`} disabled={!fieldOn || selected === null} onClick={() => record('balance')}>
              Balanced <span className="opacity-70">3</span>
            </button>
          </div>
        </div>
      </div>
      <div className="text-center text-[11px] text-white/45">
        Scroll / ← → voltage ±10 V · P polarity · B spray drops · ↑ ↓ cycle drops · Field off (polarity 0): time a fall · Field on: time a rise or balance it
      </div>
    </div>
  );
}

const ZOOM = [1, 1.9, 3.4];
const OBJECTIVE_LABEL = ['4×', '10×', '40×'];
const BEST_FOCUS = [0.55, 0.62, 0.7];

function SpecimenEyepiece({ size, target }: { size: number; target: Extract<MicroscopeTarget, { kind: 'specimen' }> }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const focus = useExperimentStore((s) => s.focus[target.id] ?? 0.5);
  const [objective, setObjective] = useState(0);
  const source = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 1024;
    const ctx = c.getContext('2d');
    if (ctx) drawSpecimen(ctx, 1024, 1024, target.specimen as CellPattern, target.id.length + 7);
    return c;
  }, [target.specimen, target.id]);
  useEffect(() => {
    const c = canvas.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round(size * dpr);
    c.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const z = ZOOM[objective];
    const srcSize = 1024 / z;
    ctx.fillStyle = '#fff8ea';
    ctx.fillRect(0, 0, size, size);
    ctx.drawImage(source, (1024 - srcSize) / 2, (1024 - srcSize) / 2, srcSize, srcSize, 0, 0, size, size);
    const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.52);
    g.addColorStop(0, 'rgba(255,250,235,0)');
    g.addColorStop(1, 'rgba(60,40,20,0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
  }, [size, source, objective]);
  useEffect(() => {
    const onWheel = (ev: WheelEvent) => {
      useExperimentStore.getState().setFocusValue(target.id, (useExperimentStore.getState().focus[target.id] ?? 0.5) + (ev.deltaY < 0 ? 0.02 : -0.02));
    };
    const onKey = (ev: KeyboardEvent) => {
      if (ev.code === 'Digit1' || ev.code === 'Digit2' || ev.code === 'Digit3') {
        setObjective(Number(ev.code.slice(5)) - 1);
        sounds.play('click', 0.6);
      }
      if (ev.code === 'ArrowUp' || ev.code === 'ArrowDown') {
        ev.preventDefault();
        useExperimentStore.getState().setFocusValue(target.id, focus + (ev.code === 'ArrowUp' ? 0.02 : -0.02));
      }
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKey);
    };
  }, [target.id, focus]);
  const blur = Math.min(14, Math.abs(focus - BEST_FOCUS[objective]) * 70);
  const sharp = blur < 1.2;
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-3">
      <div className="relative" style={{ width: size, height: size }}>
        <canvas ref={canvas} className="h-full w-full rounded-full" style={{ filter: `blur(${blur}px)`, boxShadow: '0 0 0 10px #050505, 0 0 0 14px #1d1f22, 0 0 80px 30px rgba(0,0,0,0.9)' }} aria-label={`${target.label} under the microscope`} />
        <div className="pointer-events-none absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, transparent 60%, rgba(0,0,0,0.5) 70%, #000 72%)' }} />
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 text-white">
        <div className="rounded-xl bg-white/10 px-4 py-2 text-sm backdrop-blur">
          <span className="text-white/50">Slide · </span>
          <b>{target.label}</b>
        </div>
        <div className="flex gap-1 rounded-xl bg-white/10 p-1 backdrop-blur" role="radiogroup" aria-label="Objective lens">
          {OBJECTIVE_LABEL.map((l, i) => (
            <button key={l} role="radio" aria-checked={objective === i} onClick={() => setObjective(i)} className={`focus-ring rounded-lg px-3 py-1.5 text-xs font-semibold ${objective === i ? 'bg-white text-lab-ink' : 'hover:bg-white/15'}`}>
              {l} <span className="opacity-60">{i + 1}</span>
            </button>
          ))}
        </div>
        <div className={`rounded-xl px-4 py-2 text-sm font-semibold backdrop-blur ${sharp ? 'bg-emerald-500/30 text-emerald-200' : 'bg-white/10 text-white/80'}`}>{sharp ? '✓ In focus' : 'Scroll to focus'}</div>
      </div>
    </div>
  );
}

export function MicroscopeView() {
  const open = useGameStore((s) => s.mode === 'microscope');
  const target = useGameStore((s) => s.microscope);
  const size = useEyepieceSize();
  const interactKey = useSettingsStore((s) => keyLabel(s.bindings.interact[0]));
  useEffect(() => {
    if (!open) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.code === 'Escape' || ev.code === useSettingsStore.getState().bindings.interact[0]) {
        ev.preventDefault();
        sounds.play('whoosh');
        closeView();
      }
      if (ev.code === 'Tab') ev.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);
  return (
    <AnimatePresence>
      {open && target && (
        <motion.div className="fixed inset-0 z-[55] overflow-y-auto bg-black" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} role="dialog" aria-modal="true" aria-label="Microscope view">
          <motion.div className="h-full min-h-[560px] w-full" initial={{ scale: 1.25 }} animate={{ scale: 1 }} transition={{ duration: 0.45, ease: 'easeOut' }}>
            {target.kind === 'millikan' ? <MillikanEyepiece size={Math.min(size, 620)} /> : <SpecimenEyepiece size={Math.min(size, 660)} target={target} />}
          </motion.div>
          <button type="button" onClick={closeView} className="focus-ring fixed right-4 top-4 rounded-lg bg-white/10 px-3 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20" aria-label="Leave the eyepiece">
            <span className="kbd mr-1 !border-white/30 !bg-white/10 !text-white !shadow-none">Esc</span> / <span className="kbd mx-1 !border-white/30 !bg-white/10 !text-white !shadow-none">{interactKey}</span> exit
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

