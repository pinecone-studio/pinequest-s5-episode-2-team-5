/**
 * Combination emergency safety shower + eyewash: a 2.3 m safety-yellow standpipe with
 * a Ø 0.25 m shower head on an arm, a triangular pull handle, and an eyewash bowl at
 * 1.0 m with a push paddle. Pulling the handle runs water for a few seconds.
 * <EyewashStation> is the wall-mounted eyewash used in the Main Hall.
 */
import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { CylinderCollider } from '@react-three/rapier';
import { InstancedMesh, MeshStandardMaterial, Object3D, SphereGeometry } from 'three';
import { plastic } from '../../materials/plastic';
import { metalChrome } from '../../materials/metal';
import { Interactable } from '../../interaction/Interactable';
import { sounds } from '../../utils/sounds';
import { FONTS } from '../../utils/fonts';

const pipe = plastic('#f2c200', 0.45);
const green = new MeshStandardMaterial({ color: '#0f9d58', roughness: 0.5 });
const dropMaterial = new MeshStandardMaterial({ color: '#cfe9ff', transparent: true, opacity: 0.7, roughness: 0.1 });
const dropGeometry = new SphereGeometry(0.008, 6, 4);

function WaterSpray({ active, origin, spread, height }: { active: boolean; origin: [number, number, number]; spread: number; height: number }) {
  const ref = useRef<InstancedMesh>(null);
  const count = 70;
  const seeds = useMemo(() => Array.from({ length: count }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random(), t: Math.random() })), []);
  const dummy = useMemo(() => new Object3D(), []);
  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.visible = active;
    if (!active) return;
    seeds.forEach((s, i) => {
      s.t = (s.t + dt * 1.8) % 1;
      const r = s.r * spread * (0.3 + s.t);
      dummy.position.set(origin[0] + Math.cos(s.a) * r, origin[1] - s.t * height, origin[2] + Math.sin(s.a) * r);
      dummy.scale.set(1, 2.5, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[dropGeometry, dropMaterial, count]} frustumCulled={false} userData={{ noOutline: true }} />;
}

function SafetySign({ position, label }: { position: [number, number, number]; label: string }) {
  return (
    <group position={position}>
      <mesh material={green}>
        <boxGeometry args={[0.46, 0.2, 0.01]} />
      </mesh>
      <Text font={FONTS.bold} fontSize={0.045} color="#ffffff" position={[0, 0, 0.006]} anchorX="center" anchorY="middle" maxWidth={0.42} textAlign="center">
        {label}
      </Text>
    </group>
  );
}

export function SafetyShower({ id, position, rotY = 0 }: { id: string; position: [number, number, number]; rotY?: number }) {
  const [running, setRunning] = useState(false);
  const timer = useRef<number | null>(null);
  const run = () => {
    setRunning(true);
    sounds.play('puff', 1.4);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setRunning(false), 4000);
  };
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh material={pipe} position={[0, 1.15, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 2.3, 14]} />
      </mesh>
      <mesh material={pipe} position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.14, 0.16, 0.04, 24]} />
      </mesh>
      <mesh material={pipe} position={[0, 2.28, 0.25]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.5, 12]} />
      </mesh>
      <mesh material={pipe} position={[0, 2.22, 0.5]}>
        <coneGeometry args={[0.13, 0.12, 24, 1, true]} />
      </mesh>
      {/* Eyewash bowl. */}
      <group position={[0, 1.0, 0.22]}>
        <mesh material={pipe} position={[0, -0.05, -0.12]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.24, 10]} />
        </mesh>
        <mesh material={pipe} rotation={[Math.PI, 0, 0]}>
          <sphereGeometry args={[0.14, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
        {[-0.04, 0.04].map((dx) => (
          <mesh key={dx} material={green} position={[dx, 0.01, 0]}>
            <cylinderGeometry args={[0.018, 0.02, 0.04, 12]} />
          </mesh>
        ))}
      </group>
      <Interactable id={id} label="Safety shower" verb="Pull" onInteract={run}>
        <group position={[0, 1.55, 0.5]}>
          <mesh material={metalChrome} position={[0, 0.33, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.66, 8]} />
          </mesh>
          <mesh material={pipe}>
            <torusGeometry args={[0.07, 0.012, 8, 3]} />
          </mesh>
        </group>
      </Interactable>
      <WaterSpray active={running} origin={[0, 2.14, 0.5]} spread={0.25} height={2.1} />
      <SafetySign position={[0, 2.58, 0.05]} label="SAFETY SHOWER" />
      <CylinderCollider args={[1.2, 0.18]} position={[0, 1.2, 0]} />
    </group>
  );
}

/** Wall-mounted eyewash station (bowl at 1.0 m, sign above). Origin at the wall surface. */
export function EyewashStation({ id, position, rotY = 0 }: { id: string; position: [number, number, number]; rotY?: number }) {
  const [running, setRunning] = useState(false);
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh material={pipe} position={[0, 0.55, 0.05]}>
        <cylinderGeometry args={[0.025, 0.025, 1.1, 12]} />
      </mesh>
      <Interactable
        id={id}
        label="Eyewash station"
        verb={running ? 'Stop' : 'Test'}
        onInteract={() => {
          setRunning((r) => !r);
          sounds.play('puff', 0.6);
        }}
      >
        <group position={[0, 1.0, 0.2]}>
          <mesh material={pipe} rotation={[Math.PI, 0, 0]}>
            <sphereGeometry args={[0.15, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh material={pipe} position={[0, 0.0, -0.17]}>
            <boxGeometry args={[0.1, 0.06, 0.06]} />
          </mesh>
          <mesh material={green} position={[0.2, -0.02, -0.05]} rotation={[0, 0, -0.3]}>
            <boxGeometry args={[0.12, 0.02, 0.1]} />
          </mesh>
          {[-0.045, 0.045].map((dx) => (
            <mesh key={dx} material={green} position={[dx, 0.01, 0]}>
              <cylinderGeometry args={[0.02, 0.022, 0.05, 12]} />
            </mesh>
          ))}
        </group>
      </Interactable>
      <WaterSpray active={running} origin={[0, 1.08, 0.2]} spread={0.05} height={0.12} />
      <SafetySign position={[0, 1.75, 0.01]} label="EYEWASH STATION" />
    </group>
  );
}
