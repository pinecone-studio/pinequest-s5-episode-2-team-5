/**
 * Right-edge yellow semicircle tab → Tools drawer with two shelves: equipment by category
 * and every substance by category (acids, bases, salts, indicators, special, solids,
 * water & dyes). Each card has a live, slowly spinning 3D thumbnail rendered by drei
 * <View> into one shared canvas; clicking it puts the item on the nearest free bench spot.
 * Cards also say where the item is kept in the lab.
 */
import { Fragment, createRef, useEffect, useMemo, useRef, useState, type MutableRefObject, type RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, View } from '@react-three/drei';
import { motion } from 'framer-motion';
import { NeutralToneMapping, PMREMGenerator, SRGBColorSpace, type Group, type Texture } from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CATALOG, EQUIPMENT_CATEGORIES, SPAWNABLE_KINDS, type EquipmentKind } from '../equipment/equipmentCatalog';
import { CATEGORY_LABELS, HAZARD_LABELS, REAGENTS, REAGENT_LIST, type ReagentCategory } from '../chemistry/reagents';
import { stock, type ItemVariant } from '../world/itemsLayout';
import { FittedModel } from '../equipment/FittedModel';
import { useGameStore } from '../store/useGameStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { toggleTools } from '../controls/useGameKeys';
import { spawnNearPlayer } from '../interaction/spawn';
import { useSettingsStore } from '../store/useSettingsStore';
import { keyLabel } from '../controls/keyMap';
import { sounds } from '../utils/sounds';

import { useLabStore } from '../store/useLabStore';
import { useSandbox } from '../experiments/nacl/sandbox';
import { suppliesFor, useWorkbench, collectSupply, matchesSupply, NACL_SUPPLIES, PART_KINDS, type BenchSupply } from '../experiments/workbench/session';
import { supplyLocation } from '../experiments/workbench/PreparationHints';
const DRAWER_W = 380;

interface DrawerEntry {
  key: string;
  kind?: EquipmentKind;
  supply?: BenchSupply;
  name: string;
  sub: string;
  where: string;
  group: string;
  variant?: ItemVariant;
  hazards?: string;
}

const EQUIPMENT_WHERE: Partial<Record<EquipmentKind, string>> = {
  beaker: '«Шилэн сав» шургуулга',
  erlenmeyer: '«Шилэн сав» шургуулга',
  testTube: '«Хуруу шил» шургуулга',
  testTubeRack: '«Хуруу шил» шургуулга, ширээн дээр',
  graduatedCylinder: '«Хэмжих багаж» шургуулга',
  volumetricFlask: '«Хэмжих багаж» шургуулга',
  thermometer: '«Хэмжих багаж» шургуулга',
  phPaper: '«Жижиг багаж», «Хэмжих багаж»',
  burette: 'B арлын ширээ',
  bunsenBurner: 'Арлын ширээнүүд',
  tripod: '«Халаах» шургуулга, ширээн дээр',
  evaporatingDish: '«Халаах», «Аяга, таваг» шургуулга',
  spatula: '«Жижиг багаж» шургуулга',
  glassRod: '«Жижиг багаж» шургуулга',
  pipette: '«Жижиг багаж» шургуулга',
  tongs: '«Халаах» шургуулга',
  testTubeHolder: '«Жижиг багаж», «Халаах»',
  wireLoop: '«Жижиг багаж» шургуулга, C ширээ',
  funnel: '«Шүүх, нунтаглах» шургуулга',
  mortar: '«Шүүх, нунтаглах» шургуулга',
  petriDish: '«Аяга, таваг» шургуулга',
  watchGlass: '«Аяга, таваг» шургуулга',
  goggles: '«Хамгаалалт» шургуулга',
  gloves: '«Хамгаалалт» шургуулга',
  washBottle: '«УС, БУДАГ» шүүгээ',
  scale: 'Баруун хананы ширээ',
  fireExtinguisher: 'Өмнөд хана',
};

const REAGENT_WHERE: Record<ReagentCategory, string> = {
  acid: '«ХҮЧИЛ» шүүгээ',
  base: '«ШҮЛТ» шүүгээ',
  salt: '«ДАВСНЫ УУСМАЛ» шүүгээ',
  indicator: '«ЗААГЧ» шүүгээ',
  special: '«ТУСГАЙ УРВАЛЖ» шүүгээ',
  solid: '«ХАТУУ ДАВС», «МЕТАЛЛ» шүүгээ',
  other: '«УС, БУДАГ» шүүгээ',
};

const EQUIPMENT_ENTRIES: DrawerEntry[] = SPAWNABLE_KINDS.map((kind) => ({
  key: kind,
  kind,
  name: CATALOG[kind].name,
  sub: CATALOG[kind].category,
  where: EQUIPMENT_WHERE[kind] ?? '',
  group: CATALOG[kind].category,
}));

const REAGENT_ENTRIES: DrawerEntry[] = REAGENT_LIST.map((r) => ({
  key: `reagent-${r.id}`,
  kind: r.container,
  name: r.name,
  sub: r.label,
  where: r.id === 'ethanol' ? 'Шар шатамхай бодисын шүүгээ' : REAGENT_WHERE[r.category],
  group: r.category,
  variant: stock(r.id),
  hazards: r.hazards.map((h) => HAZARD_LABELS[h].icon).join(' '),
}));

type Shelf = 'equipment' | 'reagents';

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

function Thumbnail({ entry, track, index, visible }: { entry: DrawerEntry; track: RefObject<HTMLDivElement>; index: number; visible: boolean }) {
  return (
    <View track={track as MutableRefObject<HTMLElement>} index={index + 1} visible={visible}>
      <SharedEnvironment />
      <PerspectiveCamera makeDefault position={[0.35, 0.28, 0.55]} fov={32} near={0.005} far={20} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[2, 3, 2]} intensity={1.6} />
      <Spinner offset={index * 0.7}>
        {entry.kind && <FittedModel kind={entry.kind} fill={0.92} variant={entry.variant} />}
      </Spinner>
    </View>
  );
}

export function ToolTab() {
  const panelOpen = useGameStore((s) => s.panel === 'tools');
  const benchOpen = useWorkbench((s) => s.drawer);
  const sessions = useWorkbench((s) => s.sessions);
  const active = useLabStore((s) => s.active);
  const near = useSandbox((s) => s.near);
  const required = suppliesFor(active);
  const session = active ? sessions[active] : undefined;
  const open = panelOpen || benchOpen;
  const mode = useGameStore((s) => s.mode);
  const held = useInventoryStore((s) => s.held);
  const tabKey = useSettingsStore((s) => keyLabel(s.bindings.tools[0]));
  const [shelf, setShelf] = useState<Shelf>('equipment');
  const [group, setGroup] = useState<string>('all');
  const [search, setSearch] = useState('');
  const benchContext = near || mode === 'bench';
  const entries = useMemo(() => {
    const station: DrawerEntry[] = benchContext ? NACL_SUPPLIES.map((s)=>({key:`stock:${s.key}`,supply:s,kind:s.part?PART_KINDS[s.part]:undefined,name:s.name,sub:s.use,where:'NaCl ажлын ширээний комплект',group:'NaCl ширээ'})) : [];
    const list = shelf === 'equipment' ? [...EQUIPMENT_ENTRIES,...station] : REAGENT_ENTRIES;
    const normal = (group === 'all' ? list : list.filter((e) => e.group === group));
    const pinned: DrawerEntry[] = benchContext ? required.map((s) => ({ key: `required:${s.key}`, supply: s, kind: s.kind ?? (s.part ? PART_KINDS[s.part] : undefined), name: s.name, sub: s.use, where: supplyLocation(s), group: 'required', variant: s.reagent ? stock(s.reagent) : undefined })) : [];
    return [...pinned, ...normal].filter((e) => `${e.name} ${e.sub} ${e.key} ${e.variant?.reagent ? REAGENTS[e.variant.reagent].label : ""}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  }, [shelf, group, benchContext, required, search]);
  const refMap = useRef(new Map<string, RefObject<HTMLDivElement>>());
  const refFor = (key: string) => {
    let r = refMap.current.get(key);
    if (!r) {
      r = createRef<HTMLDivElement>();
      refMap.current.set(key, r);
    }
    return r;
  };
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<Record<string, boolean>>({});

  // Only fully visible cards draw their thumbnail, so nothing paints over the header.
  useEffect(() => {
    const root = scroller.current;
    if (!root || !mounted) return;
    const io = new IntersectionObserver(
      (records) => {
        setShown((prev) => {
          const next = { ...prev };
          for (const rec of records) {
            const key = (rec.target as HTMLElement).dataset.key;
            if (key) next[key] = rec.intersectionRatio > 0.98;
          }
          return next;
        });
      },
      { root, threshold: [0, 0.98, 1] },
    );
    entries.forEach((e) => {
      const el = refFor(e.key).current;
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [mounted, entries]);
  const hideTab = mode === 'inspect' || mode === 'loading' || mode === 'start' || mode === 'ended';

  useEffect(() => {
    if (open) setMounted(true);
    else setReady(false);
  }, [open]);

  const spawn = (entry: DrawerEntry) => {
    const { kind, name, variant } = entry;
    if (benchContext) {
      const supply = entry.supply ?? { key: entry.key, kind, name, use: entry.sub, reagent: variant?.reagent };
      if (collectSupply(supply, true)) sounds.play('clink', 0.45);
      return;
    }
    if (!kind) return;
    const res = spawnNearPlayer(kind, variant);
    if (!res.ok) {
      useGameStore.getState().showToast('Хэт олон эд зүйл байна', 'Эхлээд нэг зүйлээ хураагаарай');
      return;
    }
    sounds.play('clink', 0.7);
    useGameStore.getState().showToast(`${name} тавигдлаа`, res.onSurface ? 'Хамгийн ойрын ширээн дээр' : 'Таны өмнөх шалан дээр');
    useGameStore.getState().logEvent(`Багажны шургуулганаас авлаа: ${name}.`);
  };

  const groups: { id: string; label: string }[] =
    shelf === 'equipment'
      ? [{ id: 'all', label: 'Бүгд' }, ...EQUIPMENT_CATEGORIES.filter((c) => EQUIPMENT_ENTRIES.some((e) => e.group === c)).map((c) => ({ id: c, label: c })), ...(benchContext ? [{id:'NaCl ширээ',label:'NaCl ширээ'}] : [])]
      : [{ id: 'all', label: 'Бүгд' }, ...(Object.keys(CATEGORY_LABELS) as ReagentCategory[]).map((c) => ({ id: c, label: CATEGORY_LABELS[c] }))];

  return (
    <>
      {/* The tab itself. */}
      <motion.button
        type="button"
        aria-label={open ? 'Багажны шургуулга хаах' : 'Багажны шургуулга нээх'}
        aria-expanded={open}
        onClick={toggleTools}
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
        aria-label="Багажны шургуулга"
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
        <header className="flex items-center justify-between bg-lab-yellow px-5 py-4 text-white max-sm:pt-20">
          <div>
            <h2 className="font-display text-lg font-bold leading-tight">Багаж ба бодис</h2>
            <p className="text-xs text-white/85">{benchContext ? 'Дарахад бодит багажийг гартаа авна · Tab / Esc: хаах' : 'Дарахад хамгийн ойрын ширээн дээр тавигдана'}</p>
          </div>
          <span className="kbd !border-white/40 !bg-white/20 !text-white !shadow-none">{tabKey}</span>
        </header>
        <div className="border-b border-slate-200 bg-white px-4 pb-2 pt-3">
          <div className="flex gap-1 rounded-xl bg-slate-100 p-1" role="tablist">
            {(
              [
                ['equipment', `Багаж (${EQUIPMENT_ENTRIES.length + (benchContext ? NACL_SUPPLIES.length : 0)})`],
                ['reagents', `Бодис (${REAGENT_ENTRIES.length})`],
              ] as [Shelf, string][]
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={shelf === id}
                tabIndex={open ? 0 : -1}
                onClick={() => {
                  setShelf(id);
                  setGroup('all');
                  sounds.play('ui');
                }}
                className={`focus-ring flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${shelf === id ? 'bg-white text-lab-ink shadow' : 'text-slate-500 hover:text-slate-700'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="scrollbar-thin mt-2 flex gap-1.5 overflow-x-auto pb-1">
            {groups.map((g) => (
              <button
                key={g.id}
                type="button"
                tabIndex={open ? 0 : -1}
                onClick={() => setGroup(g.id)}
                className={`focus-ring shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition ${group === g.id ? 'border-lab-yellow bg-amber-50 text-amber-800' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <input type="search" aria-label="Бодис ба багаж хайх" tabIndex={open ? 0 : -1} placeholder="Нэр, томьёогоор хайх" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); toggleTools(); } }} className="mx-4 my-2 rounded-lg border border-slate-300 bg-white p-2 text-sm text-lab-ink" />
        {held && (
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-5 py-3 text-sm">
            <span>
              Гартаа: <b>{CATALOG[held.kind].name}</b>
            </span>
            <button
              type="button"
              className="btn-ghost !px-3 !py-1 text-xs"
              onClick={() => {
                useInventoryStore.getState().stowHeld();
                sounds.play('pickup');
              }}
            >
              Хураах
            </button>
          </div>
        )}
        <div className="relative min-h-0 flex-1">
          <div ref={scroller} className="scrollbar-thin absolute inset-0 overflow-y-auto p-4">
            <ul className="grid grid-cols-2 gap-3">
              {entries.map((entry, i) => {
                const supply = entry.supply ?? required.find((s) => matchesSupply(s, { id: entry.key, kind: entry.kind, reagent: entry.variant?.reagent }));
                const found = !!supply && !!session?.found.includes(supply.key);
                const placed = !!supply && !!session?.placed.includes(supply.key);
                return <Fragment key={entry.key}>
                  {entry.group === 'required' && entries[i - 1]?.group !== 'required' && <li className="col-span-2"><h3 className="text-xs font-bold text-slate-700">Энэ туршилтад хэрэгтэй</h3></li>}
                  {entry.group !== 'required' && entries[i-1]?.group === 'required' && <li className="col-span-2"><h3 className="text-xs font-bold text-slate-700">Бусад бодис ба багаж</h3></li>}
                  <li><button
                    type="button"
                    tabIndex={open ? 0 : -1}
                    onClick={() => spawn(entry)}
                    data-found={found} data-placed={placed}
                    className={`focus-ring group flex w-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left transition hover:-translate-y-0.5 hover:border-sky-400 hover:shadow-md ${found ? 'border-emerald-400 text-emerald-800' : ''}`}
                    aria-label={`${entry.name} тавих`}
                  >
                    <div ref={refFor(entry.key)} data-key={entry.key} className="flex h-24 w-full items-center justify-center bg-gradient-to-b from-slate-100 to-white text-3xl">{!entry.kind && <span aria-hidden>{entry.supply?.part === 'scope' ? '🔬' : entry.supply?.part === 'lamp' ? '🔥' : '🧪'}</span>}</div>
                    <div className="px-3 pb-2.5 pt-1.5">
                      <div className={`text-[13px] font-semibold leading-tight ${found ? "text-emerald-700" : "text-slate-800"}`}>{found ? '✓ ' : ''}{entry.name}{placed ? ' · ✓ ширээнд' : found ? ' · олдлоо' : ''}</div>
                      <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500">
                        <span className="truncate">{entry.sub}</span>
                        {entry.hazards && <span title="Аюулын тэмдэг">{entry.hazards}</span>}
                      </div>
                      {entry.where && <div className="mt-0.5 truncate text-[10px] text-slate-400">📍 {entry.where}</div>}
                    </div>
                  </button>
                </li></Fragment>;
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
          gl={{ alpha: true, antialias: true, toneMapping: NeutralToneMapping, outputColorSpace: SRGBColorSpace }}
        >
          {entries.map((entry, i) => (
            <Thumbnail key={entry.key} entry={entry} track={refFor(entry.key)} index={i} visible={open && ready && !!shown[entry.key]} />
          ))}
        </Canvas>
      )}
    </>
  );
}
