/**
 * Physical leftovers of accidents: spilled puddles (look at one and press E or R to
 * wipe it up; hazardous ones are labelled) and the glass shards of a breakage.
 */
import { memo, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, InstancedMesh, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, TetrahedronGeometry } from 'three';
import { useChemStore, type Burst, type Puddle } from '../store/useChemStore';
import { useGameStore } from '../store/useGameStore';
import { Interactable } from '../interaction/Interactable';
import { NameTag } from '../interaction/NameTag';
import { emitLab } from '../lab/events';
import { sounds } from '../utils/sounds';
import { lazy } from '../utils/lazy';

const shardGeometry = lazy(() => new TetrahedronGeometry(1, 0));
const shardMaterial = lazy(() => new MeshPhysicalMaterial({ color: '#e9f6fb', transparent: true, opacity: 0.7, roughness: 0.05, clearcoat: 1 }));

const PuddleView = memo(function PuddleView({ puddle }: { puddle: Puddle }) {
  const material = useMemo(() => {
    const c = new Color(puddle.color);
    return new MeshStandardMaterial({ color: c, transparent: true, opacity: 0.7, roughness: 0.06, metalness: 0.1, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  }, [puddle.color]);
  useEffect(() => () => material.dispose(), [material]);
  const focused = useGameStore((s) => s.focus?.id === puddle.id);
  // A 1.5 mm film: area grows with the spilled volume.
  const r = Math.min(0.45, Math.sqrt((puddle.ml * 1e-6) / (Math.PI * 0.0015)));
  const wipe = () => {
    useChemStore.getState().removePuddle(puddle.id);
    sounds.play('whoosh', 0.6);
    emitLab({ key: 'wipe', title: 'Асгарсныг арчлаа', detail: 'Цэвэрхэн ширээ бол аюулгүй ширээ.' });
  };
  const label = puddle.hazardous ? 'Асгарсан хортой бодис' : 'Асгарсан шингэн';
  return (
    <group position={[puddle.x, puddle.y + 0.002, puddle.z]}>
      <Interactable id={puddle.id} label={label} verb="арчих" onInteract={wipe} useTarget={{ type: 'puddle', id: puddle.id }} highlight="none">
        <mesh material={material} rotation={[-Math.PI / 2, 0, 0]} scale={[r, r * 0.86, 1]} receiveShadow>
          <circleGeometry args={[1, 28]} />
        </mesh>
      </Interactable>
      {focused && <NameTag title={label} subtitle={puddle.hazardous ? '⚠ Бээлийтэй арчина' : `${Math.round(puddle.ml)} мл`} height={0.02} />}
    </group>
  );
});

function Shards({ burst }: { burst: Burst }) {
  const ref = useRef<InstancedMesh>(null);
  const parts = useMemo(
    () =>
      Array.from({ length: 26 }, () => ({
        v: [(Math.random() - 0.5) * 2.2, 0.8 + Math.random() * 1.6, (Math.random() - 0.5) * 2.2] as [number, number, number],
        p: [0, 0.02, 0] as [number, number, number],
        r: [Math.random() * 6, Math.random() * 6, Math.random() * 6] as [number, number, number],
        s: 0.004 + Math.random() * 0.01,
      })),
    [],
  );
  const dummy = useMemo(() => new Object3D(), []);
  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    const d = Math.min(dt, 0.05);
    parts.forEach((part, i) => {
      part.v[1] -= 9.8 * d;
      part.p[0] += part.v[0] * d;
      part.p[1] += part.v[1] * d;
      part.p[2] += part.v[2] * d;
      if (part.p[1] < 0.002) {
        // Shards skitter and settle on the surface.
        part.p[1] = 0.002;
        part.v[1] *= -0.25;
        part.v[0] *= 0.6;
        part.v[2] *= 0.6;
      }
      dummy.position.set(part.p[0], part.p[1], part.p[2]);
      dummy.rotation.set(part.r[0], part.r[1], part.r[2]);
      dummy.scale.set(part.s, part.s * 0.3, part.s * 0.8);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <group position={[burst.x, burst.y, burst.z]}>
      <instancedMesh ref={ref} args={[shardGeometry(), shardMaterial(), parts.length]} frustumCulled={false} userData={{ noOutline: true }} raycast={() => undefined} />
    </group>
  );
}

export function LabFx() {
  const puddles = useChemStore((s) => s.puddles);
  const bursts = useChemStore((s) => s.bursts);
  return (
    <group>
      {puddles.map((p) => (
        <PuddleView key={p.id} puddle={p} />
      ))}
      {bursts.map((b) => (
        <Shards key={b.id} burst={b} />
      ))}
    </group>
  );
}
