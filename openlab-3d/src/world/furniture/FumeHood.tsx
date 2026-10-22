/**
 * Bench-mounted fume hood: 1.8 m wide × 0.85 m deep, 2.45 m tall overall. Base cabinet
 * (0.9 m), white enclosure with black epoxy work surface, slotted back baffle, LED light
 * strip, airflow monitor, exhaust duct to the ceiling, and a vertical sliding glass sash.
 */
import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { CuboidCollider } from '@react-three/rapier';
import { MeshStandardMaterial, type Group } from 'three';
import { paintedWhite, plasticBlack, plasticDark } from '../../materials/plastic';
import { metalAluminum, metalBrushed } from '../../materials/metal';
import { windowGlass } from '../../materials/glass';
import { Interactable } from '../../interaction/Interactable';
import { useExperimentStore } from '../../store/useExperimentStore';
import { sounds } from '../../utils/sounds';
import { FONTS } from '../../utils/fonts';
import { WALL_HEIGHT } from '../../utils/constants';
import { LabBench } from './LabBench';

const lightMat = new MeshStandardMaterial({ color: '#000', emissive: '#f4f8ff', emissiveIntensity: 1.6, toneMapped: false });
const ledGreen = new MeshStandardMaterial({ color: '#000', emissive: '#22ff66', emissiveIntensity: 4, toneMapped: false });
const screenMat = new MeshStandardMaterial({ color: '#0b2a18', emissive: '#0d3b20', emissiveIntensity: 1 });

export function FumeHood({ id, position, rotY = 0 }: { id: string; position: [number, number]; rotY?: number }) {
  const W = 1.8;
  const D = 0.85;
  const base = 0.9;
  const top = 2.45;
  const sash = useRef<Group>(null);
  const raised = useExperimentStore((s) => !!s.toggles[`${id}-sash`]);
  const toggle = useExperimentStore((s) => s.toggle);
  const amount = useRef(0);
  const [busy, setBusy] = useState(false);
  useFrame((_, dt) => {
    const target = raised ? 1 : 0;
    if (!sash.current) return;
    if (amount.current !== target) {
      amount.current += Math.sign(target - amount.current) * Math.min(Math.abs(target - amount.current), dt * 1.2);
      if (amount.current === target && busy) setBusy(false);
    }
    const k = amount.current * amount.current * (3 - 2 * amount.current);
    sash.current.position.y = base + 0.06 + k * 0.55;
  });
  const [x, z] = position;
  const innerH = top - base - 0.35;
  return (
    <group>
      <LabBench id={`${id}-base`} position={[x, z]} rotY={rotY} width={W} depth={D} modules={['door', 'door', 'door']} surface={false} />
      <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
        {/* Side panels. */}
        {[-1, 1].map((s) => (
          <mesh key={s} material={paintedWhite} position={[(s * (W - 0.08)) / 2, base + (top - base) / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.08, top - base, D]} />
          </mesh>
        ))}
        {/* Top housing and back. */}
        <mesh material={paintedWhite} position={[0, top - 0.175, 0]} castShadow>
          <boxGeometry args={[W, 0.35, D]} />
        </mesh>
        <mesh material={plasticDark} position={[0, base + innerH / 2, -D / 2 + 0.06]}>
          <boxGeometry args={[W - 0.16, innerH, 0.02]} />
        </mesh>
        {[0.25, 0.6, 0.95].map((h) => (
          <mesh key={h} material={plasticBlack} position={[0, base + h, -D / 2 + 0.072]}>
            <boxGeometry args={[W - 0.3, 0.03, 0.004]} />
          </mesh>
        ))}
        {/* Black epoxy work surface. */}
        <mesh material={plasticBlack} position={[0, base + 0.015, 0]} receiveShadow>
          <boxGeometry args={[W - 0.16, 0.03, D - 0.04]} />
        </mesh>
        {/* LED light strip under the top housing. */}
        <mesh material={lightMat} position={[0, top - 0.355, -0.05]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[W - 0.3, 0.06]} />
        </mesh>
        {/* Airfoil sill. */}
        <mesh material={metalBrushed} position={[0, base + 0.04, D / 2 - 0.03]}>
          <boxGeometry args={[W - 0.16, 0.025, 0.08]} />
        </mesh>
        {/* Sash. */}
        <Interactable
          id={`${id}-sash`}
          label="Fume hood sash"
          verb={raised ? 'Lower' : 'Raise'}
          onInteract={() => {
            toggle(`${id}-sash`);
            setBusy(true);
            sounds.play('door', 0.5);
          }}
        >
          <group ref={sash} position={[0, base + 0.06, D / 2 - 0.02]}>
            <mesh material={metalAluminum} position={[0, 0.62, 0]}>
              <boxGeometry args={[W - 0.18, 0.05, 0.035]} />
            </mesh>
            <mesh material={metalAluminum} position={[0, 0.02, 0]}>
              <boxGeometry args={[W - 0.18, 0.04, 0.035]} />
            </mesh>
            <mesh material={windowGlass} position={[0, 0.32, 0]} renderOrder={2}>
              <boxGeometry args={[W - 0.2, 0.56, 0.008]} />
            </mesh>
            <mesh material={metalBrushed} position={[0, 0.02, 0.03]}>
              <boxGeometry args={[W * 0.5, 0.022, 0.022]} />
            </mesh>
          </group>
        </Interactable>
        {/* Fixed upper glass panel. */}
        <mesh material={windowGlass} position={[0, base + 1.0, D / 2 - 0.045]} renderOrder={2}>
          <boxGeometry args={[W - 0.18, 0.7, 0.006]} />
        </mesh>
        {/* Airflow monitor on the right post. */}
        <group position={[W / 2 - 0.04, base + 0.95, D / 2 + 0.005]}>
          <mesh material={plasticDark}>
            <boxGeometry args={[0.07, 0.12, 0.012]} />
          </mesh>
          <mesh material={screenMat} position={[0, 0.02, 0.007]}>
            <planeGeometry args={[0.055, 0.04]} />
          </mesh>
          <Text font={FONTS.bold} fontSize={0.012} color="#7dffb0" position={[0, 0.02, 0.008]} anchorX="center" anchorY="middle">
            {'0.5 m/s'}
          </Text>
          <mesh material={ledGreen} position={[0, -0.03, 0.008]}>
            <sphereGeometry args={[0.005, 10, 8]} />
          </mesh>
        </group>
        {/* Exhaust duct. */}
        <mesh material={metalBrushed} position={[0, top + (WALL_HEIGHT - top) / 2, -0.1]}>
          <cylinderGeometry args={[0.13, 0.13, WALL_HEIGHT - top, 20]} />
        </mesh>
        <CuboidCollider args={[W / 2, (top - base) / 2, D / 2]} position={[0, base + (top - base) / 2, 0]} />
      </group>
    </group>
  );
}
