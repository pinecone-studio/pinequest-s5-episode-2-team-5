/**
 * Chemistry Lab (x −4…10, z −15…−3): three island benches with reagent racks and
 * Bunsen burners, a window bench run with a sink, a fume hood, a west bench with an
 * analytical balance, reagent shelving, a flammables cabinet and a safety shower.
 */
import { CuboidCollider } from '@react-three/rapier';
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
import { plastic, plasticBlack } from '../../materials/plastic';
import { metalDark } from '../../materials/metal';
import { chemBoardTexture } from '../../utils/textures';
import { BENCH_HEIGHT } from '../../utils/constants';
import { StaticBatch } from '../StaticBatch';

const T = BENCH_HEIGHT;

function FlammablesCabinet({ position, rotY }: { position: [number, number, number]; rotY: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh material={plastic('#f2c200', 0.45)} position={[0, 0.85, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.1, 1.7, 0.46]} />
      </mesh>
      <mesh material={plasticBlack} position={[0, 0.85, 0.232]}>
        <boxGeometry args={[0.006, 1.6, 0.004]} />
      </mesh>
      {[-0.06, 0.06].map((x) => (
        <mesh key={x} material={metalDark} position={[x, 0.9, 0.245]}>
          <boxGeometry args={[0.02, 0.18, 0.02]} />
        </mesh>
      ))}
      <SignText text={'ШАТАМХАЙ\nГАЛААС ХОЛ БАЙЛГА'} color="#c81e1e" width={0.9} height={0.2} position={[0, 1.35, 0.234]} />
      <CuboidCollider args={[0.55, 0.85, 0.23]} position={[0, 0.85, 0]} />
    </group>
  );
}

export default function ChemistryLab() {
  useReady('chemistry');
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
      <WasteBin position={[4.9, 0, -14.4]} color="#ef4444" />
      </StaticBatch>
    </group>
  );
}
