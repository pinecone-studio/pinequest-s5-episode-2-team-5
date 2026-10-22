/**
 * Right-edge yellow semicircle tab → Tools / Inventory drawer. Each card shows a live,
 * slowly spinning 3D thumbnail rendered by drei <View> into one shared canvas.
 * Clicking a card spawns that item onto the nearest free bench spot.
 */
import { createRef, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, View } from '@react-three/drei';
import { motion } from 'framer-motion';
import { ACESFilmicToneMapping, PMREMGenerator, SRGBColorSpace, type Group, type Texture } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CATALOG, SPAWNABLE_KINDS, type EquipmentKind } from '../equipment/equipmentCatalog';
import { FittedModel } from '../equipment/FittedModel';
import { useGameStore } from '../store/useGameStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { openPanelFromGame, resumeWalk } from '../controls/useGameKeys';
import { spawnNearPlayer } from '../interaction/spawn';
import { useSettingsStore } from '../store/useSettingsStore';
import { keyLabel } from '../controls/keyMap';
import { sounds } from '../utils/sounds';

const DRAWER_W = 360;

let envTexture: Texture | null = null;
function SharedEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    if (!envTexture) {
      const pm = new PMREMGenerator(gl);
      envTexture = pm.fromScene(new RoomEnvironment(), 0.04).texture;
      pm.dispose();
    }
    scene.environment = envTexture;
  }, [gl, scene]);
  return null;
}

function Spinner({ children, offset }: { children: React.ReactNode; offset: number }) {
  const ref = useRef<Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.6;
  });
  return (
    <group ref={ref} rotation={[0, offset, 0]}>
      {children}
    </group>
  );
}

function Thumbnail({ kind, track, index, visible }: { kind: EquipmentKind; track: MutableRefObject<HTMLDivElement | null>; index: number; visible: boolean }) {
  return (
    <View track={track as MutableRefObject<HTMLElement>} index={index + 1} visible={visible}>
      <SharedEnvironment />
      <PerspectiveCamera makeDefault position={[0.35, 0.28, 0.55]} fov={32} near={0.005} far={20} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 2]} intensity={1.6} />
      <Spinner offset={index * 0.7}>
        <FittedModel kind={kind} fill={0.92} variant={kind === 'beaker' ? { liquid: '#2f7ff0', fill: 0.5 } : kind === 'erlenmeyer' ? { liquid: '#8b4fd8', fill: 0.4 } : kind === 'testTube' ? { liquid: '#ff5a5a', fill: 0.5 } : undefined} />
      </Spinner>
    </View>
  );
}

export function ToolTab() {
  const open = useGameStore((s) => s.panel === 'tools');
  const mode = useGameStore((s) => s.mode);
  const held = useInventoryStore((s) => s.held);
  const tabKey = useSettingsStore((s) => keyLabel(s.bindings.tools[0]));
  const refs = useMemo(() => SPAWNABLE_KINDS.map(() => createRef<HTMLDivElement>()), []);
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<boolean[]>(() => SPAWNABLE_KINDS.map(() => false));

  // Only fully visible cards draw their thumbnail, so nothing paints over the header.
  useEffect(() => {
    const root = scroller.current;
    if (!root || !mounted) return;
    const io = new IntersectionObserver(
      (entries) => {
        setShown((prev) => {
          const next = [...prev];
          for (const e of entries) {
            const i = refs.findIndex((r) => r.current === e.target);
            if (i >= 0) next[i] = e.intersectionRatio > 0.98;
          }
          return next;
        });
      },
      { root, threshold: [0, 0.98, 1] },
    );
    refs.forEach((r) => r.current && io.observe(r.current));
    return () => io.disconnect();
  }, [mounted, refs]);
  const hideTab = mode === 'microscope' || mode === 'inspect' || mode === 'laptop' || mode === 'loading' || mode === 'start' || mode === 'ended';

  useEffect(() => {
    if (open) setMounted(true);
    else setReady(false);
  }, [open]);

  const spawn = (kind: EquipmentKind) => {
    const res = spawnNearPlayer(kind);
    if (!res.ok) {
      useGameStore.getState().showToast('Too many items', 'Put something away first');
      return;
    }
    sounds.play('clink', 0.7);
    useGameStore.getState().showToast(`${CATALOG[kind].name} placed`, res.onSurface ? 'On the nearest bench' : 'On the floor in front of you');
    useGameStore.getState().logEvent(`Took a ${CATALOG[kind].name} from the tools drawer.`);
  };

  return (
    <>
      {/* The tab itself. */}
      <motion.button
        type="button"
        aria-label={open ? 'Close tools drawer' : 'Open tools drawer'}
        aria-expanded={open}
        onClick={() => (open ? resumeWalk() : openPanelFromGame('tools'))}
        className={`focus-ring fixed top-1/2 z-[45] flex h-20 w-9 -translate-y-1/2 items-center justify-center rounded-l-full bg-lab-yellow pl-1 text-white shadow-hud hover:bg-lab-yellowDark ${hideTab ? 'hidden' : ''}`}
        style={{ right: 0 }}
        initial={false}
        animate={{ right: open ? Math.min(DRAWER_W, window.innerWidth - 40) : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {open ? <path d="M9 6l6 6-6 6" /> : <path d="M15 6l-6 6 6 6" />}
        </svg>
      </motion.button>
      {/* Drawer. */}
      <motion.aside
        role="dialog"
        aria-label="Tools drawer"
        aria-hidden={!open}
        className="fixed bottom-0 right-0 top-0 z-[44] flex flex-col bg-slate-50 shadow-2xl"
        style={{ width: `min(${DRAWER_W}px, calc(100vw - 40px))` }}
        initial={false}
        animate={{ x: open ? 0 : '105%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 32 }}
        onAnimationComplete={() => {
          if (open) {
            window.dispatchEvent(new Event('resize'));
            setReady(true);
          }
        }}
      >
        <header className="flex items-center justify-between bg-lab-yellow px-5 py-4 text-white">
          <div>
            <h2 className="font-display text-lg font-bold leading-tight">Tools & Equipment</h2>
            <p className="text-xs text-white/85">Click an item to place it on the nearest bench</p>
          </div>
          <span className="kbd !border-white/40 !bg-white/20 !text-white !shadow-none">{tabKey}</span>
        </header>
        {held && (
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-5 py-3 text-sm">
            <span>
              Holding <b>{CATALOG[held.kind].name}</b>
            </span>
            <button
              type="button"
              className="btn-ghost !px-3 !py-1 text-xs"
              onClick={() => {
                useInventoryStore.getState().stowHeld();
                sounds.play('pickup');
              }}
            >
              Put away
            </button>
          </div>
        )}
        <div className="relative min-h-0 flex-1">
          <div ref={scroller} className="scrollbar-thin absolute inset-0 overflow-y-auto p-4">
            <ul className="grid grid-cols-2 gap-3">
              {SPAWNABLE_KINDS.map((kind, i) => {
                const def = CATALOG[kind];
                return (
                  <li key={kind}>
                    <button
                      type="button"
                      tabIndex={open ? 0 : -1}
                      onClick={() => spawn(kind)}
                      className="focus-ring group flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:-translate-y-0.5 hover:border-lab-yellow hover:shadow-md"
                      aria-label={`Place ${def.name}`}
                    >
                      <div ref={refs[i]} className="h-24 w-full bg-gradient-to-b from-slate-100 to-white" />
                      <div className="px-3 pb-2.5 pt-1.5">
                        <div className="text-[13px] font-semibold leading-tight text-slate-800">{def.name}</div>
                        <div className="text-[11px] text-slate-500">{def.category}</div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </motion.aside>
      {/* drei <View> assumes its canvas starts at the viewport origin, so the thumbnail
          canvas covers the whole viewport (transparent, click-through) above the drawer. */}
      {mounted && (
        <Canvas
          style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 46, opacity: ready && open ? 1 : 0, transition: 'opacity 0.2s' }}
          frameloop={open ? 'always' : 'never'}
          dpr={[1, 1.5]}
          gl={{ alpha: true, antialias: true, toneMapping: ACESFilmicToneMapping, outputColorSpace: SRGBColorSpace }}
        >
          {SPAWNABLE_KINDS.map((kind, i) => (
            <Thumbnail key={kind} kind={kind} track={refs[i]} index={i} visible={open && ready && shown[i]} />
          ))}
        </Canvas>
      )}
    </>
  );
}
