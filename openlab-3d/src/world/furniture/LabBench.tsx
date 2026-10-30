/**
 * Lab bench: 0.9 m tall with a 40 mm deep-indigo (LAB.benchTop) worktop, a recessed 0.1 m
 * plinth, and 0.6 m front modules that alternate between drawer stacks (3 drawers that
 * slide 0.35 m out of a hollow stack) and cabinets (doors swing 90° outward onto an
 * LED-lit, shelved compartment). Fronts are overlay panels with a raised center and a
 * metal card holder, painted per module in the pastel LAB.fronts; every drawer and cabinet
 * is a labelled storage holder whose items appear when it is opened. Islands have fronts
 * on both sides. Must be used inside <BenchParts>.
 */
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { CuboidCollider } from '@react-three/rapier';
import { Color, MeshStandardMaterial, type Group, type Material } from 'three';
import { BENCH_HEIGHT } from '../../utils/constants';
import { LAB } from '../../materials/labPalette';
import { benchBody, benchTop, plasticBlack } from '../../materials/plastic';
import { metalBrushed } from '../../materials/metal';
import { useGameStore } from '../../store/useGameStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { Interactable } from '../../interaction/Interactable';
import { rectFromBox, registerSurface } from '../../interaction/surfaces';
import { benchPlan, registerHolder, STORAGE_INFO, type StorageCategory } from '../../interaction/holders';
import { HolderContents, holderLabel } from '../../interaction/StoredItems';
import { storeInto } from '../../interaction/storage';
import { sounds } from '../../utils/sounds';
import { BoxInstance, FrontInstance, HandleInstance, HIGHLIGHT, HolderInstance, LabelPlate, LinerInstance, PanelInstance, syncBenchParts, TRAY_WALL, unitBox, WHITE } from './BenchParts';
import { DOOR_SWING, DRAWER_SWING, useSwing } from './swing';

export type ModuleKind = 'drawers' | 'door' | 'open' | 'sink';

export interface LabBenchProps {
  id: string;
  position: [number, number];
  rotY?: number;
  width?: number;
  depth?: number;
  height?: number;
  /** Front modules from left to right (each 0.6 m). Defaults to drawers/door alternating. */
  modules?: ModuleKind[];
  island?: boolean;
  /** Register the top as a placement surface. */
  surface?: boolean;
  /** Local-x center of a sink cut-out in the worktop. */
  sinkAt?: number;
  children?: ReactNode;
}

const TOP_T = 0.04;
const PLINTH = 0.1;
const GAP = 0.006;
const PANEL = 0.016;
const SHELF_T = 0.018;
/** Front slab thickness; the raised center panel stands RAISE proud of it, INSET from its edges. */
const FRONT_T = 0.018;
const RAISE = 0.003;
const INSET = 0.026;
/** The carcass stops just behind the overlay fronts, so their faces never coincide. */
const REVEAL = FRONT_T + 0.001;

/** Cabinet compartment: light melamine, a darker back for depth, an LED strip under the top. */
const interior = new MeshStandardMaterial({ color: LAB.cabinetShelf, roughness: 0.7 });
const interiorBack = new MeshStandardMaterial({ color: LAB.cabinetBack, roughness: 0.75 });
const ledStrip = new MeshStandardMaterial({ color: '#ffffff', emissive: '#fff3d6', emissiveIntensity: 1.6, roughness: 0.5 });
/** Inside of a drawer stack, seen when a drawer is pulled out. */
const cavity = new MeshStandardMaterial({ color: '#2a2d32', roughness: 0.9 });

function useFocused(id: string): boolean {
  return useGameStore((s) => s.focus?.id === id);
}

/** Drawer label (with how full it is), and the Q target while open. */
function useHolderInteraction(id: string, open: boolean, base: string, category: StorageCategory) {
  const held = useInventoryStore((s) => !!s.held);
  // Re-render when the contents change so the count stays right.
  useInventoryStore((s) => s.storage[id]);
  return {
    label: open ? holderLabel(id, base) : `${base} · ${STORAGE_INFO[category].label}`,
    onStore: open && held ? () => storeInto(id) : undefined,
  };
}

/**
 * Upright fronts catch less ceiling light than the worktop and ACES tone mapping mutes pastels,
 * so their paint is lifted a little to read as the bright pastel of the design.
 */
const FRONT_LIFT = 1.6;
/** Pastel paint of each front module (left to right, cycling LAB.fronts); its focused look is a touch brighter. */
const FRONT_COLORS = LAB.fronts.map((c) => {
  const base = new Color(c).multiplyScalar(FRONT_LIFT);
  return { base, focused: base.clone().multiply(HIGHLIGHT) };
});
/** Paint of the module being drawn; Fronts provides it so drawers and doors need no extra prop. */
const FrontPaint = createContext<{ base: Color; focused: Color }>({ base: WHITE, focused: HIGHLIGHT });

/** Overlay front: an 18 mm slab with a raised center panel. Outer face at z = 0. */
function FrontSlab({ width, height, focused = false }: { width: number; height: number; focused?: boolean }) {
  const paint = useContext(FrontPaint);
  const tint = focused ? paint.focused : paint.base;
  useEffect(() => syncBenchParts(), [focused]);
  return (
    <>
      <FrontInstance position={[0, 0, -FRONT_T / 2]} scale={[width, height, FRONT_T]} color={tint} />
      <PanelInstance position={[0, 0, RAISE / 2]} scale={[width - INSET * 2, height - INSET * 2, RAISE]} color={tint} />
    </>
  );
}

/** Category card in a brushed-metal holder on the raised panel. */
function CardHolder({ category, y, w, h }: { category: StorageCategory; y: number; w: number; h: number }) {
  return (
    <>
      <HolderInstance position={[0, y, RAISE + 0.001]} scale={[w + 0.012, h + 0.01, 0.002]} />
      <LabelPlate category={category} position={[0, y, RAISE + 0.0028]} scale={[w, h, 1]} />
    </>
  );
}

/** One sliding drawer (front + handle + label + tray + contents). Local origin = front face center. */
function Drawer({ id, width, height, depth, category }: { id: string; width: number; height: number; depth: number; category: StorageCategory }) {
  registerHolder(id, category);
  const group = useRef<Group>(null);
  const [open, setOpen] = useState(false);
  const focused = useFocused(id);
  const { label, onStore } = useHolderInteraction(id, open, 'Шургуулга', category);
  const trayD = Math.min(0.42, depth - 0.08);
  const slide = Math.min(0.35, trayD * 0.85);
  const showContents = useSwing(open, DRAWER_SWING, (k) => {
    if (group.current) group.current.position.z = k * slide;
    syncBenchParts();
  });
  const trayW = width - 0.06;
  const trayH = height - 0.056;
  const trayY = -0.006;
  const trayZ = -REVEAL - 0.003 - trayD / 2;
  const floorY = trayY - trayH / 2 + trayH * TRAY_WALL;
  return (
    <group ref={group}>
      <Interactable
        id={id}
        label={label}
        verb={open ? 'хаах' : 'нээх'}
        highlight="none"
        onInteract={() => {
          setOpen((o) => !o);
          sounds.play(open ? 'slideClose' : 'slideOpen', 0.7);
        }}
        onStore={onStore}
        storeVerb="шургуулганд хийх"
      >
        <FrontSlab width={width - GAP * 2} height={height - GAP * 2} focused={focused} />
        <HandleInstance position={[0, height * 0.17, RAISE]} />
        <CardHolder category={category} y={-height * 0.17} w={0.2} h={0.05} />
        <BoxInstance position={[0, trayY, trayZ]} scale={[trayW, trayH, trayD]} />
        <LinerInstance position={[0, floorY + 0.0015, trayZ]} scale={[trayW * (1 - TRAY_WALL * 2) - 0.004, 0.003, trayD * (1 - TRAY_WALL * 2) - 0.004]} />
      </Interactable>
      {showContents && (
        <group position={[0, floorY + 0.003, 0]}>
          <HolderContents holderId={id} layout={{ type: 'drawer', width: trayW }} />
        </group>
      )}
    </group>
  );
}

/**
 * A cabinet door hinged on one side (hinge −1 = left, 1 = right) that swings out over a
 * shelved compartment. Local origin = front face center; `shelfTop` is relative to it.
 */
function CabinetDoor({ id, width, height, depth, hinge, shelfTop, category }: { id: string; width: number; height: number; depth: number; hinge: -1 | 1; shelfTop: number; category: StorageCategory }) {
  registerHolder(id, category);
  const pivot = useRef<Group>(null);
  const [open, setOpen] = useState(false);
  const focused = useFocused(id);
  const { label, onStore } = useHolderInteraction(id, open, 'Шүүгээ', category);
  const showContents = useSwing(open, DOOR_SWING, (k) => {
    if (pivot.current) pivot.current.rotation.y = hinge * k * (Math.PI / 2);
    syncBenchParts();
  });
  const hx = (hinge * width) / 2;
  const interiorBottom = -height / 2 + PANEL + 0.002;
  return (
    <group>
      <Interactable
        id={id}
        label={label}
        verb={open ? 'хаах' : 'нээх'}
        highlight="none"
        onInteract={() => {
          setOpen((o) => !o);
          sounds.play(open ? 'hingeClose' : 'hingeOpen', 0.7);
        }}
        onStore={onStore}
        storeVerb="шүүгээнд хийх"
      >
        <group position={[hx, 0, 0]}>
          <group ref={pivot}>
            <group position={[-hx, 0, 0]}>
              <FrontSlab width={width - GAP * 2} height={height - GAP * 2} focused={focused} />
              <group position={[-hinge * (width / 2 - 0.055), height * 0.3, RAISE]} rotation={[0, 0, Math.PI / 2]}>
                <HandleInstance />
              </group>
              <CardHolder category={category} y={height * 0.36} w={0.26} h={0.065} />
            </group>
          </group>
        </group>
      </Interactable>
      {showContents && (
        <group position={[0, interiorBottom, 0]}>
          <HolderContents holderId={id} layout={{ type: 'cabinet', width: width - PANEL * 2, depth, shelfY: shelfTop + 0.002 - interiorBottom }} />
        </group>
      )}
    </group>
  );
}

/** Row of front modules on one face of the bench. Local x spans the bench, front at z = 0. */
function Fronts({
  id,
  benchId,
  modules,
  width,
  frontHeight,
  compartmentDepth,
  shelfY,
  firstStack,
  firstDoor,
}: {
  id: string;
  benchId: string;
  modules: ModuleKind[];
  width: number;
  frontHeight: number;
  compartmentDepth: number;
  /** Height of the cabinet shelf's center above the floor. */
  shelfY: number;
  firstStack: number;
  firstDoor: number;
}) {
  const moduleW = width / modules.length;
  const plan = benchPlan(benchId);
  const doorY = PLINTH + frontHeight / 2;
  let stack = firstStack;
  let door = firstDoor;
  return (
    <group>
      {modules.map((m, i) => {
        const x = -width / 2 + moduleW * (i + 0.5);
        const key = `${id}-${i}`;
        const paint = FRONT_COLORS[i % FRONT_COLORS.length];
        if (m === 'drawers') {
          const n = 3;
          const h = frontHeight / n;
          const s = stack++;
          return (
            <FrontPaint.Provider key={key} value={paint}>
              <group position={[x, 0, 0]}>
                {Array.from({ length: n }, (_, j) => (
                  <group key={j} position={[0, PLINTH + h * (n - j - 0.5), 0]}>
                    <Drawer id={`${key}-d${j}`} width={moduleW} height={h} depth={compartmentDepth} category={plan.drawer(s, j)} />
                  </group>
                ))}
              </group>
            </FrontPaint.Provider>
          );
        }
        if (m === 'door') {
          const d = door++;
          // Hinge away from a neighbouring door, so two open doors never swing into each other.
          const hinge = i === modules.length - 1 || modules[i + 1] !== 'door' ? 1 : -1;
          return (
            <FrontPaint.Provider key={key} value={paint}>
              <group position={[x, doorY, 0]}>
                <CabinetDoor id={`${key}-door`} width={moduleW} height={frontHeight} depth={compartmentDepth} hinge={hinge} shelfTop={shelfY + SHELF_T / 2 - doorY} category={plan.door(d)} />
              </group>
            </FrontPaint.Provider>
          );
        }
        if (m === 'sink') {
          return (
            <FrontPaint.Provider key={key} value={paint}>
              <group position={[x, doorY, 0]}>
                <FrontSlab width={moduleW - GAP * 2} height={frontHeight - GAP * 2} />
              </group>
            </FrontPaint.Provider>
          );
        }
        return null;
      })}
    </group>
  );
}

export function defaultModules(width: number): ModuleKind[] {
  const n = Math.max(1, Math.round(width / 0.6));
  return Array.from({ length: n }, (_, i) => (i % 2 === 0 ? 'drawers' : 'door'));
}

/** One carcass panel: the shared unit box, scaled (merged by StaticBatch). */
function Part({ material, at, size, cast = false }: { material: Material; at: [number, number, number]; size: [number, number, number]; cast?: boolean }) {
  return <mesh geometry={unitBox()} material={material} position={at} scale={size} castShadow={cast} receiveShadow />;
}

/**
 * Carcass behind the fronts: a hollow drawer stack with rails between the drawers, a
 * shelved compartment behind each door (spill lip on the shelf, LED strip under the
 * top), and a solid block behind sinks. Everything stops REVEAL behind the fronts.
 */
function Carcass({ modules, width, height, bodyD, island, frontHeight, shelfY }: { modules: ModuleKind[]; width: number; height: number; bodyD: number; island: boolean; frontHeight: number; shelfY: number }) {
  const moduleW = width / modules.length;
  const innerW = moduleW - PANEL * 2;
  const carcassH = height - TOP_T - PLINTH;
  const midY = PLINTH + carcassH / 2;
  const z1 = bodyD / 2 - REVEAL;
  const z0 = island ? -z1 : -bodyD / 2;
  const d = z1 - z0;
  const zc = (z0 + z1) / 2;
  const backZ = island ? 0 : z0 + PANEL / 2;
  const shelfFront = z1 - 0.02;
  const shelfBack = island ? -shelfFront : z0 + PANEL;
  // Front-facing details are mirrored onto the back face of an island.
  const faces = island ? [0, Math.PI] : [0];
  return (
    <group>
      {modules.map((m, i) => {
        const x = -width / 2 + moduleW * (i + 0.5);
        if (m !== 'door' && m !== 'drawers') {
          return <Part key={i} material={benchBody} at={[x, midY, zc]} size={[moduleW - 0.002, carcassH, d]} cast />;
        }
        const inner = m === 'door' ? interior : cavity;
        return (
          <group key={i} position={[x, 0, 0]}>
            {[-1, 1].map((sx) => (
              <Part key={sx} material={benchBody} at={[(sx * (moduleW - PANEL)) / 2, midY, zc]} size={[PANEL, carcassH, d]} cast />
            ))}
            <Part material={inner} at={[0, PLINTH + PANEL / 2, zc]} size={[innerW, PANEL, d]} />
            <Part material={benchBody} at={[0, height - TOP_T - PANEL / 2, zc]} size={[innerW, PANEL, d]} />
            <Part material={m === 'door' ? interiorBack : cavity} at={[0, midY, backZ]} size={[innerW, carcassH - PANEL * 2, PANEL]} />
            {m === 'door' && <Part material={interior} at={[0, shelfY, (shelfFront + shelfBack) / 2]} size={[innerW, SHELF_T, shelfFront - shelfBack]} />}
            {faces.map((ry) => (
              <group key={ry} rotation={[0, ry, 0]}>
                {m === 'door' ? (
                  <>
                    <Part material={metalBrushed} at={[0, shelfY + 0.003, shelfFront + 0.002]} size={[innerW, SHELF_T + 0.006, 0.004]} />
                    <Part material={ledStrip} at={[0, height - TOP_T - PANEL - 0.004, z1 - 0.03]} size={[innerW - 0.04, 0.008, 0.012]} />
                  </>
                ) : (
                  [1, 2].map((k) => <Part key={k} material={benchBody} at={[0, PLINTH + (frontHeight / 3) * k, z1 - 0.03]} size={[innerW, 0.018, 0.06]} />)
                )}
              </group>
            ))}
          </group>
        );
      })}
    </group>
  );
}

export function LabBench({
  id,
  position,
  rotY = 0,
  width = 2.4,
  depth = 0.7,
  height = BENCH_HEIGHT,
  modules,
  island = false,
  surface = true,
  sinkAt,
  children,
}: LabBenchProps) {
  const mods = useMemo(() => modules ?? defaultModules(width), [modules, width]);
  const frontHeight = height - TOP_T - PLINTH - 0.01;
  const shelfY = PLINTH + (height - TOP_T - PLINTH) / 2;
  const [x, z] = position;

  useEffect(() => {
    if (!surface) return;
    if (sinkAt === undefined) {
      return registerSurface({ id, ...rectFromBox(x, z, width, depth, rotY), y: height });
    }
    // Split the top around a 0.6 m sink cut-out.
    const cos = Math.cos(rotY);
    const sin = Math.sin(rotY);
    const leftW = sinkAt - 0.3 + width / 2;
    const rightW = width / 2 - (sinkAt + 0.3);
    const offs: Array<[number, number]> = [];
    if (leftW > 0.1) offs.push([-width / 2 + leftW / 2, leftW]);
    if (rightW > 0.1) offs.push([width / 2 - rightW / 2, rightW]);
    const cleanups = offs.map(([lx, w], i) =>
      registerSurface({ id: `${id}-top${i}`, ...rectFromBox(x + lx * cos, z - lx * sin, w, depth, rotY), y: height }),
    );
    return () => cleanups.forEach((c) => c());
  }, [id, x, z, width, depth, height, rotY, surface, sinkAt]);

  const bodyD = depth - 0.04;
  const compartmentDepth = island ? bodyD / 2 - PANEL : bodyD - PANEL;
  const frontStacks = mods.filter((m) => m === 'drawers').length;
  const frontDoors = mods.filter((m) => m === 'door').length;
  const top = useMemo(() => {
    if (sinkAt === undefined) return [{ x: 0, w: width, z: 0, d: depth + 0.02 }];
    const leftW = sinkAt - 0.3 + width / 2;
    const rightW = width / 2 - (sinkAt + 0.3);
    return [
      { x: -width / 2 + leftW / 2, w: leftW, z: 0, d: depth + 0.02 },
      { x: width / 2 - rightW / 2, w: rightW, z: 0, d: depth + 0.02 },
      { x: sinkAt, w: 0.6, z: depth / 2 - 0.05, d: 0.12 },
      { x: sinkAt, w: 0.6, z: -depth / 2 + 0.06, d: 0.14 },
    ].filter((p) => p.w > 0.01);
  }, [sinkAt, width, depth]);

  const fronts = { benchId: id, modules: mods, width, frontHeight, compartmentDepth, shelfY };
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <Carcass modules={mods} width={width} height={height} bodyD={bodyD} island={island} frontHeight={frontHeight} shelfY={shelfY} />
      <mesh material={plasticBlack} position={[0, PLINTH / 2, 0]}>
        <boxGeometry args={[width - 0.04, PLINTH, bodyD - 0.08]} />
      </mesh>
      {/* Worktop. */}
      {top.map((p, i) => (
        <mesh key={i} material={benchTop} position={[p.x, height - TOP_T / 2, p.z]} castShadow receiveShadow>
          <boxGeometry args={[p.w, TOP_T, p.d]} />
        </mesh>
      ))}
      <group position={[0, 0, bodyD / 2]}>
        <Fronts id={`${id}-f`} {...fronts} firstStack={0} firstDoor={0} />
      </group>
      {island && (
        <group position={[0, 0, -bodyD / 2]} rotation={[0, Math.PI, 0]}>
          <Fronts id={`${id}-b`} {...fronts} firstStack={frontStacks} firstDoor={frontDoors} />
        </group>
      )}
      <CuboidCollider args={[width / 2, height / 2, depth / 2 + 0.01]} position={[0, height / 2, 0]} />
      {children && <group position={[0, height, 0]}>{children}</group>}
    </group>
  );
}
