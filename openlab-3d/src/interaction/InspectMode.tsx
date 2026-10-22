/**
 * F-inspect: the focused object floats in front of the (blurred, paused) lab in its own
 * transparent canvas. Drag to rotate, scroll to zoom. A side card shows the catalog
 * name, description and safety note.
 */
import { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { AnimatePresence, motion } from 'framer-motion';
import { ACESFilmicToneMapping, SRGBColorSpace, type Group } from 'three';
import { CATALOG } from '../equipment/equipmentCatalog';
import { FittedModel } from '../equipment/FittedModel';
import { useGameStore } from '../store/useGameStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { requestLock } from '../controls/usePointerLock';
import type { ItemVariant } from '../world/itemsLayout';

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

function InspectScene({ kind, variant }: { kind: keyof typeof CATALOG; variant?: ItemVariant }) {
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
          <FittedModel kind={kind} variant={variant} />
        </FloatIn>
      </Suspense>
      <OrbitControls makeDefault enablePan={false} enableDamping autoRotate autoRotateSpeed={1.1} />
    </>
  );
}

export function InspectMode() {
  const mode = useGameStore((s) => s.mode);
  const target = useGameStore((s) => s.inspectTarget);
  const worldItems = useInventoryStore((s) => s.worldItems);
  const held = useInventoryStore((s) => s.held);
  const open = mode === 'inspect' && !!target;
  const variant = useMemo(() => {
    if (!target) return undefined;
    if (held?.id === target.sourceId) return held.variant;
    return worldItems.find((w) => w.id === target.sourceId)?.variant;
  }, [target, worldItems, held]);
  const def = target ? CATALOG[target.kind] : null;

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
              <InspectScene kind={target.kind} variant={variant} />
            </Canvas>
          </div>
          <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center max-sm:inset-x-4 max-sm:items-end max-sm:pb-4">
          <motion.aside
            className="panel-card pointer-events-auto max-h-[calc(100vh-32px)] w-[min(360px,calc(100vw-32px))] overflow-y-auto p-5"
            initial={{ x: 40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 40, opacity: 0 }}
            transition={{ delay: 0.08 }}
            aria-live="polite"
          >
            <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-lab-yellowDark">{def.category}</div>
            <h2 className="font-display text-2xl font-bold leading-tight">{def.name}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{def.description}</p>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <div className="mb-1 font-semibold">⚠ Аюулгүй ажиллагааны зөвлөгөө</div>
              {def.safety}
            </div>
            <div className="mt-3 text-xs text-slate-500">
              Хэмжээ ≈ {def.size.map((v) => Math.round(v * 1000)).join(' × ')} мм
            </div>
            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-slate-500">Чирж эргүүлэх · Гүйлгэж томруулах</span>
              <button className="btn-yellow text-sm" onClick={close} aria-label="Ойроос харах цонхыг хаах">
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
