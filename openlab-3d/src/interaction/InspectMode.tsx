import { MoleculeViewerButton } from '../ui/MoleculeViewer';
/**
 * F-inspect: the focused object floats in front of the (blurred, paused) lab in its own
 * transparent canvas. Drag to rotate, scroll to zoom. A side card shows the catalog
 * name, description and safety note, and for vessels the full composition: volume,
 * temperature, pH, what is dissolved and what is solid.
 */
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { AnimatePresence, motion } from 'framer-motion';
import { ACESFilmicToneMapping, SRGBColorSpace, Vector3, type Group } from 'three';
import { CATALOG, isContainer, type EquipmentKind } from '../equipment/equipmentCatalog';
import { HAZARD_LABELS, REAGENTS } from '../chemistry/reagents';
import { PH_WORDS, composition, fmtG, fmtMl, observationFlags, phBand, eventText } from '../chemistry/describe';
import { phOf } from '../chemistry/equilibrium';
import { liquidMl, solidMassG, type Mixture } from '../chemistry/mixture';
import { FittedModel } from '../equipment/FittedModel';
import { useGameStore } from '../store/useGameStore';
import { seedMixture, useChemStore, type ToolState } from '../store/useChemStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { requestLock } from '../controls/usePointerLock';
import type { ItemVariant } from '../world/itemsLayout';
import { interactables } from './registry';
import { reactionProjection } from '../experiments/workbench/WorkbenchRuntime';

function close() {
  useGameStore.getState().setMode('walk');
  requestLock();
}

/** The object swings into view with a short eased turn (scale stays fixed so Bounds fits it correctly). */
function FloatIn({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    if (t.current >= 1) return;
    t.current = Math.min(1, t.current + dt * 1.8);
    const k = 1 - Math.pow(1 - t.current, 3);
    if (ref.current) ref.current.rotation.y = (1 - k) * -1.1;
  });
  return <group ref={ref}>{children}</group>;
}

function InspectScene({ kind, variant, mixture, tool }: { kind: EquipmentKind; variant?: ItemVariant; mixture?: Mixture; tool?: ToolState }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    reactionProjection.inspect = () => {
      const p = new Vector3().project(camera);
      return { x: (p.x + 1) * innerWidth / 2, y: (1 - p.y) * innerHeight / 2, visible: p.z > -1 && p.z < 1 };
    };
    return () => { reactionProjection.inspect = () => null; };
  }, [camera]);
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 3, 2]} intensity={1.6} />
      <directionalLight position={[-3, 1, -2]} intensity={0.5} color="#cfe6ff" />
      <Environment resolution={64} frames={1}>
        <Lightformer form="rect" intensity={2} position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[6, 6, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#dbeeff" position={[-3, 1, 1]} rotation={[0, Math.PI / 2, 0]} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={0.8} color="#fff1df" position={[3, 1, 1]} rotation={[0, -Math.PI / 2, 0]} scale={[4, 2, 1]} />
      </Environment>
      <Suspense fallback={null}>
        <FloatIn>
          <FittedModel kind={kind} variant={variant} mixture={mixture} tool={tool} decorative={false} />
        </FloatIn>
      </Suspense>
      <OrbitControls makeDefault enablePan={false} enableDamping autoRotate autoRotateSpeed={1.1} />
    </>
  );
}

const OBSERVATIONS: Record<string, string> = {
  burning: '🔥 Шатаж байна',
  foam: '🫧 Хөөстэй',
  boil: '♨ Буцалж байна',
};

function Contents({ m, capacity }: { m: Mixture; capacity: number }) {
  const ml = liquidMl(m);
  const g = solidMassG(m);
  const ph = phOf(m);
  const { dissolved, solids } = composition(m);
  const notes = [...observationFlags(m)]
    .map((f) => OBSERVATIONS[f] ?? (f.startsWith('ppt:') || f.startsWith('complex:') || f === 'starchIodine' ? eventText(f)?.title : undefined))
    .filter(Boolean) as string[];
  const empty = ml < 0.01 && g < 0.002;
  return (
    <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
      <div className="mb-1 font-semibold">🧪 Агуулга · {empty ? 'хоосон' : `${ml >= 0.01 ? fmtMl(ml) : ''}${ml >= 0.01 && g >= 0.002 ? ' + ' : ''}${g >= 0.002 ? fmtG(g) : ''}`} / {capacity} мл</div>
      {!empty && (
        <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-lg bg-white/70 px-2 py-1">
            🌡 <b>{m.temp.toFixed(1)} °C</b>
          </div>
          <div className="rounded-lg bg-white/70 px-2 py-1">{ph === null ? 'pH — (хуурай)' : <>pH ≈ <b>{ph.toFixed(1)}</b> · {PH_WORDS[phBand(ph)]}</>}</div>
        </div>
      )}
      {notes.length > 0 && <div className="mb-2 text-xs font-semibold text-sky-800">{notes.join(' · ')}</div>}
      {dissolved.length > 0 && (
        <>
          <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700">Уусмалд</div>
          <ul className="mb-1 space-y-0.5">
            {dissolved.map((r) => (
              <li key={r.formula} className="flex items-center gap-2 text-xs">
                <span>
                  {r.name} <span className="text-sky-700">({r.formula})</span>
                </span>
                <span className="ml-auto font-semibold tabular-nums">{r.value}</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {solids.length > 0 && (
        <>
          <div className="text-[11px] font-bold uppercase tracking-wider text-sky-700">Хатуу бодис / тунадас</div>
          <ul className="space-y-0.5">
            {solids.map((r) => (
              <li key={r.formula} className="flex items-center gap-2 text-xs">
                <span>
                  {r.name} <span className="text-sky-700">({r.formula})</span>
                </span>
                <span className="ml-auto font-semibold tabular-nums">{r.value}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function InspectMode() {
  const mode = useGameStore((s) => s.mode);
  const target = useGameStore((s) => s.inspectTarget);
  const open = mode === 'inspect' && !!target;
  const heldVariant = useInventoryStore((s) => (target && s.held?.id === target.sourceId ? s.held.variant : undefined));
  const variant = useMemo(() => {
    if (!target) return undefined;
    const t = interactables.get(target.sourceId)?.useTarget;
    return t?.type === 'item' ? t.variant : heldVariant;
  }, [target, heldVariant]);
  const live = useChemStore((s) => (target ? s.mixtures[target.sourceId] : undefined));
  const tool = useChemStore((s) => (target ? s.tools[target.sourceId] : undefined));
  const mixture = live ?? seedMixture(variant);
  const def = target ? CATALOG[target.kind] : null;
  const reagent = variant?.reagent ? REAGENTS[variant.reagent] : undefined;
  const title = reagent ? reagent.name : def?.name;

  return (
    <AnimatePresence>
      {open && def && target && (
        <motion.div key="inspect" className="fixed inset-0 z-40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <div className="absolute inset-0 bg-slate-900/20" />
          <div className="absolute inset-0">
            <Canvas
              camera={{ position: [0.4, 0.3, 0.6], fov: 35, near: 0.005, far: 50 }}
              gl={{ alpha: true, antialias: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
              dpr={[1, 2]}
              style={{ cursor: 'grab' }}
            >
              <InspectScene kind={target.kind} variant={variant} mixture={mixture} tool={tool} />
            </Canvas>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center max-sm:inset-x-4 max-sm:items-end max-sm:pb-4">
            <motion.aside
              className="panel-card scrollbar-thin pointer-events-auto max-h-[calc(100vh-32px)] w-[min(380px,calc(100vw-32px))] overflow-y-auto p-5 max-sm:max-h-[32vh]"
              initial={{ x: 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 40, opacity: 0 }}
              transition={{ delay: 0.08 }}
              aria-live="polite"
            >
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-lab-yellowDark">{reagent ? 'Урвалж' : def.category}</div>
              <h2 className="font-display text-2xl font-bold leading-tight">{title}</h2>
              {title !== def.name && <div className="text-sm font-medium text-slate-500">{def.name}{reagent ? ` · ${reagent.label}` : ''}</div>}
              <p className="mt-3 text-sm leading-relaxed text-slate-600">{reagent ? reagent.note : def.description}</p>
              {reagent && reagent.hazards.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {reagent.hazards.map((h) => (
                    <span key={h} className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
                      {HAZARD_LABELS[h].icon} {HAZARD_LABELS[h].label}
                    </span>
                  ))}
                </div>
              )}
              {isContainer(target.kind) && <><Contents m={mixture} capacity={def.capacityMl ?? 0} /><MoleculeViewerButton id={target.sourceId}/></>}
              {target.kind === 'thermometer' && tool?.reading !== undefined && (
                <div className="mt-4 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">🌡 Сүүлийн хэмжилт: <b>{tool.reading.toFixed(1)} °C</b></div>
              )}
              {target.kind === 'burette' && (
                <div className="mt-2 text-xs text-slate-500">Гарсан эзэлхүүн: <b>{(tool?.delivered ?? 0).toFixed(1)} мл</b> (E — кран, дугуй — урсгал)</div>
              )}
              <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-lab-ink">
                <div className="mb-1 font-semibold">⚠ Аюулгүй ажиллагааны зөвлөгөө</div>
                {def.safety}
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Хэмжээ ≈ {def.size.map((v) => Math.round(v * 1000)).join(' × ')} мм · {Math.round(def.massKg * 1000)} г
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Чирж эргүүлэх · Гүйлгэж томруулах</span>
                <button className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm" onClick={close} aria-label="Ойроос харах цонхыг хаах">
                  Болсон <span className="kbd ml-1 !text-[0.7em]">F</span>
                </button>
              </div>
            </motion.aside>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
