/**
 * The laptop's interactive data app. When the camera docks at the laptop, this overlay
 * fades in exactly over the 3D screen: a table of recorded drops (time, voltage,
 * velocity, computed charge) and a scatter chart of q against whole multiples of e.
 */
import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { computeResults, estimateElementaryCharge, useExperimentStore, type MeasurementResult } from '../store/useExperimentStore';
import { requestLock } from '../controls/usePointerLock';
import { LAPTOP_SCREEN, laptopDockDistance } from '../world/rooms/physicsStations';
import { MILLIKAN } from '../utils/constants';

const DESIGN_W = 1000;
const DESIGN_H = Math.round((DESIGN_W * LAPTOP_SCREEN.h) / LAPTOP_SCREEN.w);
const E19 = MILLIKAN.e / 1e-19;
const KIND = { fall: 'Fall', field: 'Field run', balance: 'Balanced' } as const;

function useScreenRect() {
  const [rect, setRect] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const update = () => {
      const aspect = window.innerWidth / window.innerHeight;
      const d = laptopDockDistance(aspect);
      const visibleH = 2 * d * Math.tan(((LAPTOP_SCREEN.fov / 2) * Math.PI) / 180);
      const h = (LAPTOP_SCREEN.h / visibleH) * window.innerHeight;
      setRect({ w: (h * LAPTOP_SCREEN.w) / LAPTOP_SCREEN.h, h });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return rect;
}

function close() {
  useGameStore.getState().setMode('walk');
  requestLock();
}

function exportCsv(rows: MeasurementResult[]) {
  const header = ['id', 'drop', 'type', 'time_s', 'distance_mm', 'voltage_V', 'polarity', 'velocity_mm_per_s', 'charge_C', 'q_over_e'];
  const lines = rows.map((r) => [r.id, r.dropLabel, r.kind, r.timeS.toFixed(3), r.distanceMm, r.voltage, r.polarity, r.velocityMmS.toFixed(5), r.charge?.toExponential(4) ?? '', r.units?.toFixed(3) ?? ''].join(','));
  const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'millikan-measurements.csv';
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <div className="text-[13px] font-medium text-slate-500">{label}</div>
      <div className="mt-0.5 font-display text-[26px] font-bold tabular-nums leading-tight text-slate-900">{value}</div>
      {sub && <div className="text-[12px] text-slate-500">{sub}</div>}
    </div>
  );
}

function DataTable({ results }: { results: MeasurementResult[] }) {
  const del = useExperimentStore((s) => s.deleteMeasurement);
  if (results.length === 0) {
    return <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-[15px] text-slate-500">No measurements yet — time a drop in the eyepiece and press Record.</div>;
  }
  return (
    <div className="scrollbar-thin h-full overflow-y-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full text-left text-[14px] tabular-nums">
        <thead className="sticky top-0 bg-slate-50 text-[12px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-2">Drop</th>
            <th className="px-2">Type</th>
            <th className="px-2 text-right">Time (s)</th>
            <th className="px-2 text-right">Dist (mm)</th>
            <th className="px-2 text-right">Voltage</th>
            <th className="px-2 text-right">Velocity (mm/s)</th>
            <th className="px-2 text-right">q (×10⁻¹⁹ C)</th>
            <th className="px-2 text-right">q / e</th>
            <th className="px-2" aria-label="Delete" />
          </tr>
        </thead>
        <tbody>
          {results.map((r, i) => (
            <tr key={r.id} className="border-t border-slate-100 hover:bg-amber-50/60">
              <td className="px-3 py-1.5 text-slate-400">{i + 1}</td>
              <td className="px-2 font-semibold">{r.dropLabel}</td>
              <td className="px-2">{KIND[r.kind]}</td>
              <td className="px-2 text-right">{r.kind === 'balance' ? '—' : r.timeS.toFixed(2)}</td>
              <td className="px-2 text-right">{r.kind === 'balance' ? '—' : r.distanceMm.toFixed(1)}</td>
              <td className="px-2 text-right">
                {r.voltage} V {r.polarity === 1 ? '+' : r.polarity === -1 ? '−' : ''}
              </td>
              <td className="px-2 text-right">{r.velocityMmS.toFixed(4)}</td>
              <td className="px-2 text-right">{r.charge === null ? (r.kind === 'fall' ? '—' : 'needs fall') : (r.charge / 1e-19).toFixed(2)}</td>
              <td className={`px-2 text-right font-semibold ${r.units !== null && Math.abs(r.units - Math.round(r.units)) < 0.15 ? 'text-green-700' : ''}`}>{r.units === null ? '—' : r.units.toFixed(2)}</td>
              <td className="px-2 text-right">
                <button className="focus-ring rounded px-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" onClick={() => del(r.id)} aria-label={`Delete measurement ${i + 1}`}>
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SERIES = { field: '#2a78d6', balance: '#eb6834' } as const;

/** Scatter of solved charges with reference lines at n·e. Two series: field runs (circles) and balances (diamonds). */
function ChargeChart({ results }: { results: MeasurementResult[] }) {
  const solved = results.filter((r) => r.charge !== null);
  const [hover, setHover] = useState<number | null>(null);
  const W = 900;
  const H = 380;
  const m = { l: 64, r: 52, t: 36, b: 44 };
  const maxQ = Math.max(4 * E19, ...solved.map((r) => (r.charge as number) / 1e-19)) * 1.12;
  const nMax = Math.ceil(maxQ / E19);
  const x = (i: number) => m.l + ((i + 0.5) / Math.max(solved.length, 1)) * (W - m.l - m.r);
  const y = (q: number) => H - m.b - (q / maxQ) * (H - m.t - m.b);
  const yTicks = Array.from({ length: Math.floor(maxQ / 2) + 1 }, (_, k) => k * 2);
  if (solved.length === 0) {
    return <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-300 text-[15px] text-slate-500">Charges appear here once a drop has a fall run and a field run (or balance).</div>;
  }
  const h = hover !== null ? solved[hover] : null;
  return (
    <div className="relative h-full rounded-xl border border-slate-200 bg-white p-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label={`Measured charges of ${solved.length} drops compared with whole multiples of e`}>
        {/* Legend (two series). */}
        <g transform={`translate(${m.l} 16)`} fontSize={13} fill="#52514e" fontFamily="Inter, sans-serif">
          <circle cx={6} cy={0} r={5} fill={SERIES.field} />
          <text x={16} y={4}>Field run</text>
          <rect x={98} y={-5} width={10} height={10} fill={SERIES.balance} transform="rotate(45 103 0)" />
          <text x={116} y={4}>Balanced</text>
          <line x1={210} x2={234} y1={0} y2={0} stroke="#a8a7a1" strokeDasharray="4 4" strokeWidth={1.5} />
          <text x={240} y={4}>whole multiples of e</text>
        </g>
        {/* Recessive grid + y axis. */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={m.l - 4} x2={m.l} y1={y(t)} y2={y(t)} stroke="#c3c2b7" strokeWidth={1} />
            <text x={m.l - 8} y={y(t) + 4} textAnchor="end" fontSize={12} fill="#7c7b76" fontFamily="Inter, sans-serif">
              {t}
            </text>
          </g>
        ))}
        <text x={16} y={H / 2} transform={`rotate(-90 16 ${H / 2})`} textAnchor="middle" fontSize={12} fill="#52514e" fontFamily="Inter, sans-serif">
          q (×10⁻¹⁹ C)
        </text>
        {/* n·e reference lines with direct labels. */}
        {Array.from({ length: nMax }, (_, k) => k + 1).map((n) => (
          <g key={n}>
            <line x1={m.l} x2={W - m.r} y1={y(n * E19)} y2={y(n * E19)} stroke="#a8a7a1" strokeDasharray="5 5" strokeWidth={1.4} />
            <text x={W - m.r + 6} y={y(n * E19) + 4} fontSize={12} fontWeight={600} fill="#52514e" fontFamily="Inter, sans-serif">
              {n}e
            </text>
          </g>
        ))}
        <line x1={m.l} x2={W - m.r} y1={H - m.b} y2={H - m.b} stroke="#c3c2b7" strokeWidth={1} />
        <text x={(m.l + W - m.r) / 2} y={H - 10} textAnchor="middle" fontSize={12} fill="#52514e" fontFamily="Inter, sans-serif">
          Measurement (in recording order)
        </text>
        {solved.map((r, i) => {
          const cx = x(i);
          const cy = y((r.charge as number) / 1e-19);
          const color = r.kind === 'balance' ? SERIES.balance : SERIES.field;
          return (
            <g key={r.id} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ cursor: 'default' }}>
              <circle cx={cx} cy={cy} r={16} fill="transparent" />
              {hover === i && <line x1={cx} x2={cx} y1={m.t} y2={H - m.b} stroke="#c3c2b7" strokeWidth={1} />}
              {r.kind === 'balance' ? (
                <rect x={cx - 5.5} y={cy - 5.5} width={11} height={11} fill={color} stroke="#ffffff" strokeWidth={2} transform={`rotate(45 ${cx} ${cy})`} />
              ) : (
                <circle cx={cx} cy={cy} r={hover === i ? 7 : 5.5} fill={color} stroke="#ffffff" strokeWidth={2} />
              )}
              <text x={cx} y={H - m.b + 16} textAnchor="middle" fontSize={11} fill="#7c7b76" fontFamily="Inter, sans-serif">
                {i + 1}
              </text>
            </g>
          );
        })}
      </svg>
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute rounded-lg bg-slate-900 px-3 py-2 text-[13px] text-white shadow-lg"
          style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y((h.charge as number) / 1e-19) / H) * 100}%`, transform: 'translate(-50%, -125%)' }}
        >
          <div className="font-semibold">
            {h.dropLabel} · {KIND[h.kind]}
          </div>
          <div className="tabular-nums text-white/85">
            q = {((h.charge as number) / 1e-19).toFixed(2)} × 10⁻¹⁹ C · q/e = {(h.units as number).toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}

function Guide() {
  return (
    <div className="scrollbar-thin h-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 text-[15px] leading-relaxed text-slate-700">
      <h3 className="font-display text-[18px] font-bold text-slate-900">How the charge is computed</h3>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5">
        <li>
          <b>Fall run (field off):</b> the drop reaches terminal speed v<sub>f</sub> = mg / (6πηr), which gives its radius r = √(9ηv<sub>f</sub> / 2ρg) and mass m = ⁴⁄₃πr³ρ.
        </li>
        <li>
          <b>Field run:</b> with E = V/d the drop moves at v where qE − mg = 6πηr·v, so q = 6πηr(v + v<sub>f</sub>) / E.
        </li>
        <li>
          <b>Balance:</b> if the drop hovers, qE = mg, so q = mg·d / V.
        </li>
      </ol>
      <p className="mt-3 text-[14px] text-slate-500">d = 6.0 mm · η = 1.81 × 10⁻⁵ Pa·s · ρ = 886 kg/m³ · g = 9.81 m/s²</p>
    </div>
  );
}

type Tab = 'data' | 'chart' | 'guide';

export function LaptopScreen() {
  const open = useGameStore((s) => s.mode === 'laptop');
  const measurements = useExperimentStore((s) => s.measurements);
  const clear = useExperimentStore((s) => s.clearMeasurements);
  const results = useMemo(() => computeResults(measurements), [measurements]);
  const estimate = useMemo(() => estimateElementaryCharge(results), [results]);
  const rect = useScreenRect();
  const [tab, setTab] = useState<Tab>('data');
  const drops = new Set(measurements.map((m) => m.dropId)).size;
  const errorPct = estimate ? ((estimate.e - MILLIKAN.e) / MILLIKAN.e) * 100 : null;
  const scale = rect.w / DESIGN_W;

  return (
    <AnimatePresence>
      {open && rect.w > 0 && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.6, duration: 0.3 } }} exit={{ opacity: 0, transition: { duration: 0.15 } }}>
          <div className="overflow-hidden rounded-[4px] shadow-[0_0_0_2px_rgba(0,0,0,0.6)]" style={{ width: rect.w, height: rect.h }}>
            <div className="origin-top-left bg-gradient-to-br from-blue-900 via-blue-600 to-sky-400 p-4" style={{ width: DESIGN_W, height: DESIGN_H, transform: `scale(${scale})` }}>
              <div className="flex h-full flex-col overflow-hidden rounded-2xl bg-slate-50 shadow-2xl" role="dialog" aria-label="OpenLab Drop Logger">
                <header className="flex items-center gap-3 bg-lab-yellow px-5 py-3 text-white">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/25 text-[15px] font-bold">↗</div>
                  <div className="flex-1 font-display text-[19px] font-bold">OpenLab Drop Logger</div>
                  <nav className="flex gap-1 rounded-xl bg-white/20 p-1" role="tablist">
                    {(['data', 'chart', 'guide'] as Tab[]).map((t) => (
                      <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`focus-ring rounded-lg px-4 py-1.5 text-[14px] font-semibold capitalize ${tab === t ? 'bg-white text-lab-ink' : 'text-white hover:bg-white/20'}`}>
                        {t}
                      </button>
                    ))}
                  </nav>
                  <button className="focus-ring ml-2 rounded-lg bg-white/20 px-3 py-1.5 text-[14px] font-semibold hover:bg-white/30" onClick={close}>
                    Close · Esc
                  </button>
                </header>
                <div className="grid grid-cols-4 gap-3 px-5 pt-4">
                  <Stat label="Measurements" value={String(measurements.length)} sub={`${drops} drop${drops === 1 ? '' : 's'}`} />
                  <Stat label="Solved charges" value={String(results.filter((r) => r.charge !== null).length)} sub="need a fall + field run" />
                  <Stat label="Estimate of e" value={estimate ? `${(estimate.e / 1e-19).toFixed(3)}` : '—'} sub="× 10⁻¹⁹ C" />
                  <Stat label="vs accepted 1.602" value={errorPct === null ? '—' : `${errorPct >= 0 ? '+' : ''}${errorPct.toFixed(1)}%`} sub="relative error" />
                </div>
                <div className="min-h-0 flex-1 px-5 py-3">
                  {tab === 'data' && <DataTable results={results} />}
                  {tab === 'chart' && <ChargeChart results={results} />}
                  {tab === 'guide' && <Guide />}
                </div>
                <footer className="flex items-center justify-between border-t border-slate-200 px-5 py-2.5 text-[13px] text-slate-500">
                  <span>Charges cluster at whole numbers of e — that is charge quantization.</span>
                  <span className="flex gap-2">
                    <button className="btn-ghost !px-3 !py-1 text-[13px]" disabled={measurements.length === 0} onClick={() => exportCsv(results)}>
                      Export CSV
                    </button>
                    <button className="btn-ghost !px-3 !py-1 text-[13px] text-red-600" disabled={measurements.length === 0} onClick={clear}>
                      Clear data
                    </button>
                  </span>
                </footer>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
