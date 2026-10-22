/**
 * Chemistry Lab (x −4…10, z −15…−3): three island benches with reagent racks and
 * Bunsen burners, a window bench run with a sink, a fume hood, a west bench with an
 * analytical balance, reagent shelving, a flammables cabinet and a safety shower.
 */
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider } from '@react-three/rapier';
import type { Group } from 'three';
import { BenchParts } from '../furniture/BenchParts';
import { LabBench } from '../furniture/LabBench';
import { Sink } from '../furniture/Sink';
import { FumeHood } from '../furniture/FumeHood';
import { ReagentShelf, ShelvingUnits } from '../furniture/Shelf';
import { SafetyShower } from '../furniture/SafetyShower';
import { Stools } from '../furniture/Stool';
import { Whiteboard } from '../furniture/Whiteboard';
import { WallExtinguisher } from '../furniture/FireExtinguisher';
import { Poster, SignText, WasteBin } from '../furniture/Decor';
import { useReady } from '../../store/useLoadingStore';
import { plastic } from '../../materials/plastic';
import { Interactable } from '../../interaction/Interactable';
import { HolderContents, holderLabel } from '../../interaction/StoredItems';
import { registerHolder } from '../../interaction/holders';
import { storeInto } from '../../interaction/storage';
import { useGameStore } from '../../store/useGameStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { sounds } from '../../utils/sounds';
import { metalDark } from '../../materials/metal';
import { chemBoardTexture } from '../../utils/textures';
import { BENCH_HEIGHT } from '../../utils/constants';
import { NaClStation } from '../../experiments/nacl/NaClStation';
import { StaticBatch } from '../StaticBatch';

const T = BENCH_HEIGHT;

const FLAMMABLES = 'flammables-cabinet';
registerHolder(FLAMMABLES, 'flammables');

/** Yellow flammables cabinet: two doors open onto shelves holding the ethanol. */
function FlammablesCabinet({ position, rotY }: { position: [number, number, number]; rotY: number }) {
  const [open, setOpen] = useState(false);
  const amount = useRef(0);
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const held = useInventoryStore((s) => !!s.held);
  useInventoryStore((s) => s.storage[FLAMMABLES]);
  const focused = useGameStore((s) => s.focus?.id === FLAMMABLES);
  useFrame((_, dt) => {
    const target = open ? 1 : 0;
    if (amount.current === target) return;
    amount.current += Math.sign(target - amount.current) * Math.min(Math.abs(target - amount.current), dt * 2.2);
    const k = amount.current * amount.current * (3 - 2 * amount.current) * 1.9;
    if (left.current) left.current.rotation.y = -k;
    if (right.current) right.current.rotation.y = k;
  });
  const yellow = plastic(focused ? '#ffd84d' : '#f2c200', 0.45);
  const W = 1.1;
  const H = 1.7;
  const D = 0.46;
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Carcass: back, sides, top, bottom and a shelf. */}
      <mesh material={plastic('#f2c200', 0.45)} position={[0, H / 2, -D / 2 + 0.01]} castShadow receiveShadow>
        <boxGeometry args={[W, H, 0.02]} />
      </mesh>
      {[-1, 1].map((sx) => (
        <mesh key={sx} material={plastic('#f2c200', 0.45)} position={[(sx * (W - 0.02)) / 2, H / 2, 0]} castShadow>
          <boxGeometry args={[0.02, H, D]} />
        </mesh>
      ))}
      {[0.01, H - 0.01, 0.85].map((y) => (
        <mesh key={y} material={plastic('#e6e2d6', 0.6)} position={[0, y, 0]} receiveShadow>
          <boxGeometry args={[W - 0.04, 0.02, D - 0.02]} />
        </mesh>
      ))}
      <Interactable
        id={FLAMMABLES}
        label={open ? holderLabel(FLAMMABLES, 'Шатамхай бодисын шүүгээ') : 'Шатамхай бодисын шүүгээ'}
        verb={open ? 'хаах' : 'нээх'}
        highlight="none"
        onInteract={() => {
          setOpen((o) => !o);
          sounds.play('door', 0.6);
        }}
        onStore={open && held ? () => storeInto(FLAMMABLES) : undefined}
        storeVerb="шүүгээнд хийх"
      >
        {[
          { ref: left, x: -W / 2, s: 1 },
          { ref: right, x: W / 2, s: -1 },
        ].map(({ ref, x, s: side }) => (
          <group key={x} ref={ref} position={[x, 0, D / 2]}>
            <mesh material={yellow} position={[(side * W) / 4, H / 2, 0.01]} castShadow>
              <boxGeometry args={[W / 2 - 0.006, H - 0.02, 0.02]} />
            </mesh>
            <mesh material={metalDark} position={[side * (W / 2 - 0.06), 0.9, 0.035]}>
              <boxGeometry args={[0.02, 0.18, 0.02]} />
            </mesh>
          </group>
        ))}
      </Interactable>
      <SignText text={'ШАТАМХАЙ\nГАЛААС ХОЛ БАЙЛГА'} color="#c81e1e" width={0.9} height={0.2} position={[0, 1.35, D / 2 + 0.025]} />
      {open && (
        <group position={[0, 0.86, D / 2 - 0.02]}>
          <HolderContents holderId={FLAMMABLES} layout={{ type: 'cabinet', width: W - 0.1, depth: D, shelfY: 0.84 }} />
        </group>
      )}
      <CuboidCollider args={[W / 2, H / 2, D / 2]} position={[0, H / 2, 0]} />
    </group>
  );
}

export default function ChemistryLab() {
  useReady('chemistry');
  const generation = useInventoryStore((s) => s.generation);
  return (
    <group>
      <StaticBatch>
      <BenchParts>
        {/* Window bench run on the north wall. */}
        <LabBench id="chem-n1" position={[-2.2, -14.55]} />
        <LabBench id="chem-nsink" position={[-0.4, -14.55]} width={1.2} modules={['sink', 'sink']} sinkAt={0} />
        <LabBench id="chem-n2" position={[1.4, -14.55]} />
        <LabBench id="chem-n3" position={[3.6, -14.55]} width={2.0} />
        <LabBench id="chem-n4" position={[8.3, -14.55]} width={2.6} />
        {/* West bench run (fronts face +x). */}
        <LabBench id="chem-w1" position={[-3.55, -6.2]} rotY={Math.PI / 2} />
        <LabBench id="chem-w2" position={[-3.55, -8.6]} rotY={Math.PI / 2} />
        <LabBench id="chem-w3" position={[-3.55, -11.0]} rotY={Math.PI / 2} />
        {/* Islands. */}
        <LabBench id="chem-a" position={[1.6, -7.4]} width={3.6} depth={1.4} island />
        <LabBench id="chem-b" position={[1.6, -10.8]} width={3.6} depth={1.4} island />
        <LabBench id="chem-c" position={[7.2, -9.1]} width={3.6} depth={1.4} rotY={Math.PI / 2} island />
        <FumeHood id="chem-hood" position={[6.1, -14.475]} />
      </BenchParts>
      <Sink id="chem-sink" position={[-0.4, T, -14.55]} />
      <ReagentShelf position={[1.6, T, -7.4]} width={2.2} seed={5} />
      <ReagentShelf position={[1.6, T, -10.8]} width={2.2} seed={11} />
      <ShelvingUnits
        units={[
          { x: 9.65, z: -11.6, rotY: -Math.PI / 2 },
          { x: 9.65, z: -9.6, rotY: -Math.PI / 2 },
        ]}
        seed={21}
      />
      <FlammablesCabinet position={[9.65, 0, -7.3]} rotY={-Math.PI / 2} />
      <SafetyShower id="chem-shower" position={[9.35, 0, -4.1]} rotY={-Math.PI / 2} />
      <Stools
        positions={[
          [0.6, -6.15],
          [2.6, -6.15],
          [0.6, -12.05],
          [2.6, -12.05],
          [8.45, -8.4],
          [8.45, -9.8],
        ]}
      />
      <Whiteboard position={[-1.9, 1.55, -3.11]} rotY={Math.PI} texture={chemBoardTexture()} />
      <WallExtinguisher position={[2.5, 0, -3.11]} rotY={Math.PI} />
      <Poster position={[7.4, 1.6, -3.11]} rotY={Math.PI} spec={{ title: 'Галаас сэргийл', lines: ['Гал унтраагуур,', 'шүршүүр хаана', 'байгааг мэдэж ав.'], color: '#dc2626', icon: 'fire' }} />
      <Poster position={[-3.89, 1.75, -13.4]} rotY={Math.PI / 2} spec={{ title: 'Нүдний шил зүү', lines: ['Энэ лабораторид', 'хамгаалалтын шил', 'заавал зүүнэ.'], color: '#2563eb', icon: 'goggles' }} />
      <WasteBin position={[4.9, 0, -14.4]} color="#ef4444" chemical />
      </StaticBatch>
      <NaClStation key={generation} />
    </group>
  );
}
