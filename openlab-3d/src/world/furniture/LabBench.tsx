/**
 * Lab bench: 0.9 m tall with a 40 mm dark-gray (#3a3d42) worktop, a recessed 0.1 m
 * plinth, and 0.6 m front modules that alternate between drawer stacks (3 drawers that
 * slide 0.35 m) and cabinets (doors swing 100° onto a shelved compartment). Every drawer
 * and cabinet is a labelled storage holder whose items appear when it is opened.
 * Islands have fronts on both sides. Must be used inside <BenchParts>.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider } from '@react-three/rapier';
import type { Group } from 'three';
import { BENCH_HEIGHT } from '../../utils/constants';
import { benchBody, benchTop, plasticBlack, plasticLightGray } from '../../materials/plastic';
import { useGameStore } from '../../store/useGameStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { Interactable } from '../../interaction/Interactable';
import { rectFromBox, registerSurface } from '../../interaction/surfaces';
import { benchPlan, registerHolder, STORAGE_INFO, type StorageCategory } from '../../interaction/holders';
import { HolderContents, holderLabel } from '../../interaction/StoredItems';
import { storeInto } from '../../interaction/storage';
import { sounds } from '../../utils/sounds';
import { BoxInstance, FrontInstance, HandleInstance, HIGHLIGHT, LabelPlate, WHITE } from './BenchParts';

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

/** One sliding drawer (front + handle + tray + label + contents). Local origin = front face center. */
function Drawer({ id, width, height, depth, category }: { id: string; width: number; height: number; depth: number; category: StorageCategory }) {
  registerHolder(id, category);
  const group = useRef<Group>(null);
  const [open, setOpen] = useState(false);
  const [showContents, setShowContents] = useState(false);
  const amount = useRef(0);
  const focused = useFocused(id);
  const { label, onStore } = useHolderInteraction(id, open, 'Шургуулга', category);
  useFrame((_, dt) => {
    const target = open ? 1 : 0;
    if (amount.current === target || !group.current) return;
    amount.current += Math.sign(target - amount.current) * Math.min(Math.abs(target - amount.current), dt * 3.2);
    const k = amount.current * amount.current * (3 - 2 * amount.current);
    group.current.position.z = k * Math.min(0.35, depth * 0.6);
    if (amount.current === 0 && showContents) setShowContents(false);
  });
  const trayH = height - 0.05;
  return (
    <group ref={group}>
      <Interactable
        id={id}
        label={label}
        verb={open ? 'хаах' : 'нээх'}
        highlight="none"
        onInteract={() => {
          setOpen((o) => !o);
          if (!open) setShowContents(true);
          sounds.play('click', 0.6);
        }}
        onStore={onStore}
        storeVerb="шургуулганд хийх"
      >
        <FrontInstance position={[0, 0, -0.009]} scale={[width - GAP * 2, height - GAP * 2, 0.018]} color={focused ? HIGHLIGHT : WHITE} />
        <HandleInstance position={[0, height * 0.18, 0]} />
        <LabelPlate category={category} position={[0, -height * 0.16, 0.0005]} scale={[0.17, 0.0425, 1]} />
        <BoxInstance position={[0, -0.01, -depth * 0.32 - 0.02]} scale={[width - 0.06, trayH, depth * 0.62]} />
      </Interactable>
      {showContents && (
        <group position={[0, -0.01 - trayH / 2 + 0.008, 0]}>
          <HolderContents holderId={id} layout={{ type: 'drawer', width: width - 0.06 }} />
        </group>
      )}
    </group>
  );
}

/** A hinged cabinet door over a shelved compartment. Local origin = front face center. */
function CabinetDoor({ id, width, height, depth, hinge, category }: { id: string; width: number; height: number; depth: number; hinge: -1 | 1; category: StorageCategory }) {
  registerHolder(id, category);
  const pivot = useRef<Group>(null);
  const [open, setOpen] = useState(false);
  const [showContents, setShowContents] = useState(false);
  const amount = useRef(0);
  const focused = useFocused(id);
  const { label, onStore } = useHolderInteraction(id, open, 'Шүүгээ', category);
  useFrame((_, dt) => {
    const target = open ? 1 : 0;
    if (amount.current === target || !pivot.current) return;
    amount.current += Math.sign(target - amount.current) * Math.min(Math.abs(target - amount.current), dt * 2.6);
    const k = amount.current * amount.current * (3 - 2 * amount.current);
    pivot.current.rotation.y = -hinge * k * ((100 * Math.PI) / 180);
    if (amount.current === 0 && showContents) setShowContents(false);
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
          if (!open) setShowContents(true);
          sounds.play('click', 0.5);
        }}
        onStore={onStore}
        storeVerb="шүүгээнд хийх"
      >
        <group position={[hx, 0, 0]}>
          <group ref={pivot}>
            <FrontInstance position={[-hx, 0, -0.009]} scale={[width - GAP * 2, height - GAP * 2, 0.018]} color={focused ? HIGHLIGHT : WHITE} />
            <group position={[-hx - hinge * (width / 2 - 0.05), height * 0.3, 0]} rotation={[0, 0, Math.PI / 2]}>
              <HandleInstance />
            </group>
            <LabelPlate category={category} position={[-hx, height * 0.36, 0.0005]} scale={[0.22, 0.055, 1]} />
          </group>
        </group>
      </Interactable>
      {showContents && (
        <group position={[0, interiorBottom, 0]}>
          <HolderContents holderId={id} layout={{ type: 'cabinet', width, depth, shelfY: height / 2 - 0.006 }} />
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
  depth,
  compartmentDepth,
  firstStack,
  firstDoor,
}: {
  id: string;
  benchId: string;
  modules: ModuleKind[];
  width: number;
  frontHeight: number;
  depth: number;
  compartmentDepth: number;
  firstStack: number;
  firstDoor: number;
}) {
  const moduleW = width / modules.length;
  const plan = benchPlan(benchId);
  let stack = firstStack;
  let door = firstDoor;
  return (
    <group>
      {modules.map((m, i) => {
        const x = -width / 2 + moduleW * (i + 0.5);
        const key = `${id}-${i}`;
        if (m === 'drawers') {
          const n = 3;
          const h = frontHeight / n;
          const s = stack++;
          return (
            <group key={key} position={[x, 0, 0]}>
              {Array.from({ length: n }, (_, j) => (
                <group key={j} position={[0, PLINTH + h * (n - j - 0.5), 0]}>
                  <Drawer id={`${key}-d${j}`} width={moduleW} height={h} depth={depth} category={plan.drawer(s, j)} />
                </group>
              ))}
            </group>
          );
        }
        if (m === 'door') {
          const d = door++;
          return (
            <group key={key} position={[x, PLINTH + frontHeight / 2, 0]}>
              <CabinetDoor id={`${key}-door`} width={moduleW} height={frontHeight} depth={compartmentDepth} hinge={i % 2 === 0 ? -1 : 1} category={plan.door(d)} />
            </group>
          );
        }
        if (m === 'sink') {
          return (
            <group key={key} position={[x, PLINTH + frontHeight / 2, 0]}>
              <FrontInstance position={[0, 0, -0.009]} scale={[moduleW - GAP * 2, frontHeight - GAP * 2, 0.018]} />
            </group>
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

/** Carcass: solid behind drawers and sinks, an open shelved compartment behind each door. */
function Carcass({ modules, width, height, bodyD, island }: { modules: ModuleKind[]; width: number; height: number; bodyD: number; island: boolean }) {
  const moduleW = width / modules.length;
  const carcassH = height - TOP_T - PLINTH;
  const midY = PLINTH + carcassH / 2;
  return (
    <group>
      {modules.map((m, i) => {
        const x = -width / 2 + moduleW * (i + 0.5);
        if (m !== 'door') {
          return (
            <mesh key={i} material={benchBody} position={[x, midY, 0]} castShadow receiveShadow>
              <boxGeometry args={[moduleW - 0.002, carcassH, bodyD]} />
            </mesh>
          );
        }
        const shelfY = midY;
        return (
          <group key={i} position={[x, 0, 0]}>
            {/* Sides, bottom, top. */}
            {[-1, 1].map((sx) => (
              <mesh key={sx} material={benchBody} position={[(sx * (moduleW - PANEL)) / 2, midY, 0]} castShadow receiveShadow>
                <boxGeometry args={[PANEL, carcassH, bodyD]} />
              </mesh>
            ))}
            <mesh material={plasticLightGray} position={[0, PLINTH + PANEL / 2, 0]} receiveShadow>
              <boxGeometry args={[moduleW - PANEL * 2, PANEL, bodyD]} />
            </mesh>
            <mesh material={benchBody} position={[0, height - TOP_T - PANEL / 2, 0]}>
              <boxGeometry args={[moduleW - PANEL * 2, PANEL, bodyD]} />
            </mesh>
            {/* Back panel (or the divider between the two sides of an island). */}
            <mesh material={plasticLightGray} position={[0, midY, island ? 0 : -bodyD / 2 + PANEL / 2]} receiveShadow>
              <boxGeometry args={[moduleW - PANEL * 2, carcassH, PANEL]} />
            </mesh>
            {/* Shelf (both sides of an island). */}
            <mesh material={plasticLightGray} position={[0, shelfY, island ? 0 : 0.01]} receiveShadow>
              <boxGeometry args={[moduleW - PANEL * 2, 0.014, island ? bodyD - 0.04 : bodyD - 0.05]} />
            </mesh>
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

  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <Carcass modules={mods} width={width} height={height} bodyD={bodyD} island={island} />
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
        <Fronts id={`${id}-f`} benchId={id} modules={mods} width={width} frontHeight={frontHeight} depth={bodyD} compartmentDepth={compartmentDepth} firstStack={0} firstDoor={0} />
      </group>
      {island && (
        <group position={[0, 0, -bodyD / 2]} rotation={[0, Math.PI, 0]}>
          <Fronts id={`${id}-b`} benchId={id} modules={mods} width={width} frontHeight={frontHeight} depth={bodyD} compartmentDepth={compartmentDepth} firstStack={frontStacks} firstDoor={frontDoors} />
        </group>
      )}
      <CuboidCollider args={[width / 2, height / 2, depth / 2 + 0.01]} position={[0, height / 2, 0]} />
      {children && <group position={[0, height, 0]}>{children}</group>}
    </group>
  );
}
