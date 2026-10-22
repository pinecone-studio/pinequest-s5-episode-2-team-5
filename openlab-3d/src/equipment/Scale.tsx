/**
 * Analytical balance: 220 × 300 × 320 mm. Cream body with a front keypad and LCD,
 * Ø 90 mm stainless pan, and a glass draft-shield box with aluminum frame (not targetable,
 * so whatever stands on the pan can be focused through it).
 */
import { Text, RoundedBox } from '@react-three/drei';
import { MeshStandardMaterial } from 'three';
import { plastic, plasticDark } from '../materials/plastic';
import { metalBrushed, metalAluminum } from '../materials/metal';
import { windowGlass } from '../materials/glass';
import { FONTS } from '../utils/fonts';
import { ModelOr, type ModelProps } from './ModelOr';

const lcd = new MeshStandardMaterial({ color: '#0b1220', emissive: '#0a2a4a', emissiveIntensity: 0.9 });

export function Scale({ modelUrl, reading = '0.000', ...props }: ModelProps & { reading?: string }) {
  const W = 0.22;
  const D = 0.32;
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <RoundedBox args={[W, 0.07, D]} radius={0.01} smoothness={3} position={[0, 0.035, 0]} material={plastic('#ece6d6', 0.55)} castShadow receiveShadow />
      {/* Sloped keypad + display at the front. */}
      <group position={[0, 0.045, D / 2 - 0.02]} rotation={[-0.45, 0, 0]}>
        <mesh material={plasticDark}>
          <boxGeometry args={[W - 0.02, 0.05, 0.006]} />
        </mesh>
        <mesh material={lcd} position={[-0.03, 0.004, 0.0035]}>
          <planeGeometry args={[0.1, 0.03]} />
        </mesh>
        <Text font={FONTS.bold} fontSize={0.017} color="#8fd3ff" position={[-0.03, 0.004, 0.004]} anchorX="center" anchorY="middle">
          {`${reading} g`}
        </Text>
        {[0.045, 0.07].map((x, i) => (
          <mesh key={x} material={plastic(i === 0 ? '#22c55e' : '#e5e7eb', 0.5)} position={[x, 0.004, 0.0045]}>
            <boxGeometry args={[0.016, 0.012, 0.004]} />
          </mesh>
        ))}
      </group>
      {/* Pan. */}
      <mesh material={metalBrushed} position={[0, 0.08, -0.03]}>
        <cylinderGeometry args={[0.045, 0.045, 0.004, 32]} />
      </mesh>
      <mesh material={metalBrushed} position={[0, 0.074, -0.03]}>
        <cylinderGeometry args={[0.008, 0.008, 0.01, 12]} />
      </mesh>
      {/* Draft shield. */}
      <group position={[0, 0.07, -0.03]}>
        {[
          [W / 2 - 0.006, 0.115, 0, 0.006, 0.23, 0.24],
          [-W / 2 + 0.006, 0.115, 0, 0.006, 0.23, 0.24],
          [0, 0.115, -0.12, W - 0.012, 0.23, 0.006],
          [0, 0.115, 0.12, W - 0.012, 0.23, 0.006],
          [0, 0.23, 0, W, 0.006, 0.24],
        ].map(([x, y, z, sx, sy, sz], i) => (
          <mesh key={i} material={windowGlass} position={[x, y, z]} renderOrder={2} raycast={() => undefined}>
            <boxGeometry args={[sx, sy, sz]} />
          </mesh>
        ))}
        {[-1, 1].map((sx) =>
          [-1, 1].map((sz) => (
            <mesh key={`${sx}${sz}`} material={metalAluminum} position={[(sx * (W - 0.01)) / 2, 0.115, (sz * 0.238) / 2]} raycast={() => undefined}>
              <boxGeometry args={[0.01, 0.23, 0.01]} />
            </mesh>
          )),
        )}
        <mesh material={metalAluminum} position={[0, 0.234, 0]} raycast={() => undefined}>
          <boxGeometry args={[W, 0.008, 0.012]} />
        </mesh>
      </group>
    </ModelOr>
  );
}
