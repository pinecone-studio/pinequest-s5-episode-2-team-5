/**
 * Chemistry Lab (x −4…10, z −15…−3): three island benches with reagent racks and
 * Bunsen burners, a window bench run with a sink, a fume hood, a west bench with an
 * analytical balance, reagent shelving, a flammables cabinet and a safety shower.
 */
import { useRef, useState } from 'react';
import { CuboidCollider } from '@react-three/rapier';
import { MeshStandardMaterial, type Group } from 'three';
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
import { metalBrushed, metalDark } from '../../materials/metal';
import { chemBoardTexture, flameDiamondTexture } from '../../utils/textures';
import { lazy } from '../../utils/lazy';
import { DOOR_SWING, useSwing } from '../furniture/swing';
import { BENCH_HEIGHT } from '../../utils/constants';
import { NaClStation } from '../../experiments/nacl/NaClStation';
import { StaticBatch } from '../StaticBatch';

const T = BENCH_HEIGHT;

const FLAMMABLES = 'flammables-cabinet';
registerHolder(FLAMMABLES, 'flammables');

/** Yellow flammables cabinet: two doors open onto shelves holding the ethanol. */
const W = 1.1;
const H = 1.7;
const D = 0.46;
/** Plinth with a spill sump on top, and the fixed header that carries the warning sign. */
const BASE = 0.07;
const FASCIA = 0.26;
const DOOR_H = H - FASCIA - BASE;
const SHELVES = [0.6, 1.06];
const flameMaterial = lazy(() => new MeshStandardMaterial({ map: flameDiamondTexture(), alphaTest: 0.5, roughness: 0.5 }));

function FlammablesCabinet({ position, rotY }: { position: [number, number, number]; rotY: number }) {
  const [open, setOpen] = useState(false);
  const left = useRef<Group>(null);
  const right = useRef<Group>(null);
  const held = useInventoryStore((s) => !!s.held);
  useInventoryStore((s) => s.storage[FLAMMABLES]);
  const focused = useGameStore((s) => s.focus?.id === FLAMMABLES);
  const showContents = useSwing(open, DOOR_SWING, (k) => {
    if (left.current) left.current.rotation.y = -k * 1.75;
    if (right.current) right.current.rotation.y = k * 1.75;
  });
  const body = plastic('#f2c200', 0.45);
  const shelf = plastic('#e6e2d6', 0.6);
  const doorPaint = plastic(focused ? '#ffd84d' : '#f2c200', 0.45);
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Carcass: back, sides, top, fixed header, plinth with a sump lip, two shelves with lips. */}
      <mesh material={body} position={[0, H / 2, -D / 2 + 0.01]} castShadow receiveShadow>
        <boxGeometry args={[W, H, 0.02]} />
      </mesh>
      {[-1, 1].map((sx) => (
        <group key={sx}>
          <mesh material={body} position={[(sx * (W - 0.02)) / 2, H / 2, 0]} castShadow>
            <boxGeometry args={[0.02, H, D]} />
          </mesh>
          {/* Vent with a flame arrestor on each side. */}
          <mesh material={metalBrushed} position={[sx * (W / 2 + 0.006), H - 0.14, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.035, 0.035, 0.012, 20]} />
          </mesh>
        </group>
      ))}
      <mesh material={body} position={[0, H - 0.01, 0]} receiveShadow>
        <boxGeometry args={[W - 0.04, 0.02, D - 0.02]} />
      </mesh>
      <mesh material={body} position={[0, H - FASCIA / 2, D / 2 + 0.01]} castShadow>
        <boxGeometry args={[W, FASCIA, 0.02]} />
      </mesh>
      <mesh material={body} position={[0, BASE / 2, 0.01]} receiveShadow>
        <boxGeometry args={[W - 0.04, BASE, D - 0.02]} />
      </mesh>
      <mesh material={body} position={[0, BASE + 0.015, D / 2 - 0.02]}>
        <boxGeometry args={[W - 0.04, 0.03, 0.01]} />
      </mesh>
      {SHELVES.map((y) => (
        <group key={y}>
          <mesh material={shelf} position={[0, y, -0.01]} receiveShadow>
            <boxGeometry args={[W - 0.04, 0.02, D - 0.06]} />
          </mesh>
          <mesh material={body} position={[0, y + 0.008, D / 2 - 0.037]}>
            <boxGeometry args={[W - 0.04, 0.036, 0.006]} />
          </mesh>
        </group>
      ))}
      <Interactable
        id={FLAMMABLES}
        label={open ? holderLabel(FLAMMABLES, 'Шатамхай бодисын шүүгээ') : 'Шатамхай бодисын шүүгээ'}
        verb={open ? 'хаах' : 'нээх'}
        highlight="none"
        onInteract={() => {
          setOpen((o) => !o);
          sounds.play(open ? 'hingeClose' : 'hingeOpen', 0.9);
        }}
        onStore={open && held ? () => storeInto(FLAMMABLES) : undefined}
        storeVerb="шүүгээнд хийх"
      >
        {[
          { ref: left, x: -W / 2, s: 1 },
          { ref: right, x: W / 2, s: -1 },
        ].map(({ ref, x, s: side }) => (
          <group key={x} ref={ref} position={[x, BASE + DOOR_H / 2, D / 2]}>
            <mesh material={doorPaint} position={[(side * W) / 4, 0, 0.01]} castShadow>
              <boxGeometry args={[W / 2 - 0.006, DOOR_H - 0.006, 0.02]} />
            </mesh>
            <mesh material={metalDark} position={[side * (W / 2 - 0.06), 0.08, 0.035]}>
              <boxGeometry args={[0.02, 0.18, 0.02]} />
            </mesh>
            <mesh material={flameMaterial()} position={[(side * W) / 4, 0.28, 0.0205]}>
              <planeGeometry args={[0.22, 0.22]} />
            </mesh>
          </group>
        ))}
      </Interactable>
      <SignText text={'ШАТАМХАЙ\nГАЛААС ХОЛ БАЙЛГА'} color="#c81e1e" width={0.9} height={0.2} position={[0, H - FASCIA / 2, D / 2 + 0.021]} />
      {showContents && (
        <group position={[0, SHELVES[0] + 0.01, D / 2 - 0.02]}>
          <HolderContents holderId={FLAMMABLES} layout={{ type: 'cabinet', width: W - 0.1, depth: D, shelfY: SHELVES[1] - SHELVES[0] }} />
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
        color="#ff8be9"
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
