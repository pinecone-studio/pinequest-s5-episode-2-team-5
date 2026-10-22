/**
 * Biology & Microscopy Lab (x −20…6, z 5…15): three rows of student benches with four
 * compound microscopes each (LOD via drei <Detailed>), a slide-prep island, a
 * demonstration microscope that feeds a large wall display, a window bench with petri
 * dishes / slide boxes / specimen jars, a specimen display shelf, an incubator and a sink.
 */
import { useLayoutEffect, useRef } from 'react';
import { Detailed, Text } from '@react-three/drei';
import { CuboidCollider } from '@react-three/rapier';
import { Color, CylinderGeometry, InstancedMesh, MeshStandardMaterial, Object3D, SphereGeometry } from 'three';
import { BenchParts } from '../furniture/BenchParts';
import { LabBench } from '../furniture/LabBench';
import { Sink } from '../furniture/Sink';
import { Stools } from '../furniture/Stool';
import { WallExtinguisher } from '../furniture/FireExtinguisher';
import { NoticeBoard, Poster, Table, WallClock, WallDisplay, WasteBin } from '../furniture/Decor';
import { Microscope, MicroscopeLow } from '../../equipment/Microscope';
import { Interactable } from '../../interaction/Interactable';
import { useExperimentStore } from '../../store/useExperimentStore';
import { useGameStore, type SpecimenId } from '../../store/useGameStore';
import { releaseLock } from '../../controls/usePointerLock';
import { decorGlass, windowGlass } from '../../materials/glass';
import { metalBrushed, metalPainted } from '../../materials/metal';
import { plastic, paintedWhite, plasticBlack } from '../../materials/plastic';
import { specimenTexture } from '../../utils/textures';
import { sounds } from '../../utils/sounds';
import { FONTS } from '../../utils/fonts';
import { lazy } from '../../utils/lazy';
import { BENCH_HEIGHT } from '../../utils/constants';
import { useReady, useRoomActive } from '../roomVisibility';
import { StaticBatch } from '../StaticBatch';

const T = BENCH_HEIGHT;
const SPECIMENS: { id: SpecimenId; label: string }[] = [
  { id: 'onion', label: 'Onion epidermis' },
  { id: 'blood', label: 'Human blood smear' },
  { id: 'pond', label: 'Pond water' },
  { id: 'leaf', label: 'Leaf cross-section' },
];

function StudentMicroscope({ id, position, rotY, specimen, scale = 1 }: { id: string; position: [number, number, number]; rotY: number; specimen: number; scale?: number }) {
  const focus = useExperimentStore((s) => s.focus[id] ?? 0.5);
  const inUse = useGameStore((s) => s.mode === 'microscope' && s.microscope?.kind === 'specimen' && s.microscope.id === id);
  const spec = SPECIMENS[specimen % SPECIMENS.length];
  return (
    <Interactable
      id={id}
      label={`${scale > 1 ? 'Demonstration microscope' : 'Microscope'} · ${spec.label}`}
      verb="Use"
      inspectKind="microscope"
      position={position}
      rotation={[0, rotY, 0]}
      scale={scale}
      onInteract={() => {
        releaseLock();
        useGameStore.getState().openMicroscope({ kind: 'specimen', specimen: spec.id, label: spec.label, id });
        sounds.play('whoosh');
      }}
      onWheel={(dir) => {
        useExperimentStore.getState().setFocusValue(id, focus + dir * 0.04);
        sounds.play('tick', 0.5);
      }}
    >
      <Detailed distances={[0, 3.2 * scale]}>
        <Microscope focus={focus} lampOn={inUse} objective={specimen % 3} />
        <MicroscopeLow />
      </Detailed>
    </Interactable>
  );
}

const jarGlass = lazy(() => new CylinderGeometry(0.06, 0.06, 0.2, 18, 1, true));
const jarLid = lazy(() => new CylinderGeometry(0.063, 0.063, 0.02, 18));
const jarFluid = lazy(() => new CylinderGeometry(0.056, 0.056, 0.17, 16));
const blob = lazy(() => new SphereGeometry(0.035, 10, 8));
const fluidMat = new MeshStandardMaterial({ color: '#efe7c4', transparent: true, opacity: 0.55, roughness: 0.2 });
const BLOB_COLORS = ['#8fae6a', '#e07a3f', '#e9c7c0', '#a78bfa', '#94a3b8', '#d97706'];

/** Wall shelf with 12 preserved specimens (instanced jars). Origin at wall, facing +z. */
function SpecimenShelf({ position }: { position: [number, number, number] }) {
  const glass = decorGlass('#f0f7f4');
  const refs = {
    glass: useRef<InstancedMesh>(null),
    lid: useRef<InstancedMesh>(null),
    fluid: useRef<InstancedMesh>(null),
    blob: useRef<InstancedMesh>(null),
  };
  useLayoutEffect(() => {
    const d = new Object3D();
    let i = 0;
    for (let shelf = 0; shelf < 3; shelf++) {
      for (let k = 0; k < 4; k++) {
        const x = -0.72 + k * 0.48;
        const y = 0.92 + shelf * 0.45;
        d.position.set(x, y + 0.1, 0.18);
        d.scale.setScalar(1);
        d.rotation.set(0, 0, 0);
        d.updateMatrix();
        refs.glass.current?.setMatrixAt(i, d.matrix);
        d.position.y = y + 0.088;
        d.updateMatrix();
        refs.fluid.current?.setMatrixAt(i, d.matrix);
        d.position.y = y + 0.21;
        d.updateMatrix();
        refs.lid.current?.setMatrixAt(i, d.matrix);
        d.position.y = y + 0.09;
        d.scale.set(1 + (i % 3) * 0.15, 0.8 + (i % 2) * 0.4, 1);
        d.rotation.set(0.3 * i, i, 0);
        d.updateMatrix();
        refs.blob.current?.setMatrixAt(i, d.matrix);
        refs.blob.current?.setColorAt(i, new Color(BLOB_COLORS[i % BLOB_COLORS.length]));
        i++;
      }
    }
    for (const r of Object.values(refs)) {
      const m = r.current;
      if (!m) continue;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }, [refs.glass, refs.lid, refs.fluid, refs.blob]);
  return (
    <group position={position}>
      {[0.9, 1.35, 1.8].map((y) => (
        <mesh key={y} material={paintedWhite} position={[0, y, 0.18]} castShadow receiveShadow>
          <boxGeometry args={[2.0, 0.025, 0.34]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} material={metalPainted} position={[s * 0.98, 1.38, 0.18]}>
          <boxGeometry args={[0.03, 1.05, 0.34]} />
        </mesh>
      ))}
      <instancedMesh ref={refs.blob} args={[blob(), plastic('#ffffff', 0.8), 12]} />
      <instancedMesh ref={refs.fluid} args={[jarFluid(), fluidMat, 12]} />
      <instancedMesh ref={refs.glass} args={[jarGlass(), glass, 12]} renderOrder={1} />
      <instancedMesh ref={refs.lid} args={[jarLid(), plasticBlack, 12]} />
      <Text font={FONTS.bold} fontSize={0.07} color="#1f2328" position={[0, 2.05, 0.02]} anchorX="center">
        SPECIMEN COLLECTION
      </Text>
      <CuboidCollider args={[1.0, 0.6, 0.18]} position={[0, 1.35, 0.18]} />
    </group>
  );
}

const incubatorLight = new MeshStandardMaterial({ color: '#000', emissive: '#ffcf8a', emissiveIntensity: 1.2 });

/** Lab incubator 0.7 × 1.6 × 0.6 m with a glass inner door and a 37 °C display. Front faces +z. */
function Incubator({ position, rotY }: { position: [number, number, number]; rotY: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh material={paintedWhite} position={[0, 0.8, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.7, 1.6, 0.6]} />
      </mesh>
      <mesh material={incubatorLight} position={[0, 0.85, 0.296]}>
        <planeGeometry args={[0.56, 1.1]} />
      </mesh>
      <mesh material={windowGlass} position={[0, 0.85, 0.305]} renderOrder={2}>
        <boxGeometry args={[0.58, 1.12, 0.008]} />
      </mesh>
      {[0.55, 0.85, 1.15].map((y) => (
        <mesh key={y} material={metalBrushed} position={[0, y, 0.2]}>
          <boxGeometry args={[0.54, 0.01, 0.2]} />
        </mesh>
      ))}
      <mesh material={plasticBlack} position={[0, 1.5, 0.302]}>
        <planeGeometry args={[0.3, 0.1]} />
      </mesh>
      <Text font={FONTS.bold} fontSize={0.05} color="#ff9b3d" position={[0, 1.5, 0.305]} anchorX="center" anchorY="middle">
        37.0 °C
      </Text>
      <CuboidCollider args={[0.35, 0.8, 0.3]} position={[0, 0.8, 0]} />
    </group>
  );
}

const ROW_X = [-15.4, -12.0, -8.6];
const SCOPE_Z = [8.2, 9.4, 10.6, 11.8];

export default function BiologyMicroscopyLab() {
  useReady('biology');
  const active = useRoomActive('biology');
  return (
    <group visible={active}>
      <StaticBatch>
      <BenchParts>
        {ROW_X.map((x) => (
          <LabBench key={x} id={`bio-row-${x}`} position={[x, 10]} rotY={Math.PI / 2} width={4.8} depth={0.8} />
        ))}
        <LabBench id="bio-prep" position={[-2.5, 10]} rotY={Math.PI / 2} width={3.0} depth={1.2} island />
        {[-13.0, -10.6, -8.2, -5.8, -3.4, -1.0].map((x) => (
          <LabBench key={x} id={`bio-south-${x}`} position={[x, 14.55]} rotY={Math.PI} />
        ))}
        <LabBench id="bio-sinkbench" position={[3.9, 5.45]} rotY={Math.PI} width={3.0} modules={['drawers', 'door', 'sink', 'door', 'drawers']} sinkAt={0} />
      </BenchParts>
      <Sink id="bio-sink" position={[3.9, T, 5.45]} rotY={Math.PI} />
      {ROW_X.map((x, r) =>
        SCOPE_Z.map((z, k) => <StudentMicroscope key={`${x}-${z}`} id={`scope-${r}-${k}`} position={[x + 0.08, T, z]} rotY={Math.PI / 2} specimen={r + k} />),
      )}
      <StudentMicroscope id="scope-prep-0" position={[-2.0, T, 9.2]} rotY={Math.PI / 2} specimen={2} />
      <StudentMicroscope id="scope-prep-1" position={[-3.0, T, 10.8]} rotY={-Math.PI / 2} specimen={3} />
      <Stools positions={ROW_X.flatMap((x) => SCOPE_Z.map((z) => [x + 0.8, z] as [number, number]))} color="#1e3a5f" />
      {/* Demonstration area. */}
      <Table id="bio-demo-table" position={[-18.4, 10]} width={1.0} depth={0.9} height={0.9} top="#3a3d42" />
      <StudentMicroscope id="scope-demo" position={[-18.4, 0.9, 10]} rotY={Math.PI / 2} specimen={1} scale={1.6} />
      <WallDisplay position={[-19.89, 1.85, 10]} rotY={Math.PI / 2} texture={specimenTexture('blood')} width={2.8} height={1.58} />
      <Text font={FONTS.bold} fontSize={0.12} color="#1f2328" position={[-19.86, 2.82, 10]} rotation={[0, Math.PI / 2, 0]} anchorX="center">
        LIVE · DEMONSTRATION MICROSCOPE
      </Text>
      <SpecimenShelf position={[-4.0, 0, 5.1]} />
      <Incubator position={[5.55, 0, 6.6]} rotY={-Math.PI / 2} />
      <NoticeBoard position={[-17.2, 1.6, 5.11]} title="CELL BIOLOGY" />
      <WallClock position={[-9.6, 2.5, 5.11]} />
      <WallExtinguisher id="bio-extinguisher" position={[-10.4, 0, 5.11]} />
      <Poster position={[5.89, 1.6, 10.2]} rotY={-Math.PI / 2} spec={{ title: 'Wash Hands', lines: ['Before and after', 'handling specimens.'], color: '#0ea5e9', icon: 'hands' }} />
      <Poster position={[-19.89, 1.6, 6.6]} rotY={Math.PI / 2} spec={{ title: 'Microscope Care', lines: ['Lowest objective first.', 'Coarse focus, then fine.'], color: '#8b5cf6', icon: 'cell' }} />
      <WasteBin position={[0.9, 0, 14.4]} color="#f59e0b" />
      </StaticBatch>
    </group>
  );
}
