/**
 * Bench DC power supply: 240 × 130 × 260 mm light-gray case with a dark front panel,
 * two 7-segment style readouts (V / A), two knobs, an output LED, and red/black/green
 * binding posts. Front faces +z.
 */
import { Text, RoundedBox } from '@react-three/drei';
import { MeshStandardMaterial } from 'three';
import { plastic, plasticBlack, plasticDark } from '../materials/plastic';
import { metalChrome } from '../materials/metal';
import { FONTS } from '../utils/fonts';
import { ModelOr, type ModelProps } from './ModelOr';

const displayMat = new MeshStandardMaterial({ color: '#050806', roughness: 0.3 });
const ledOn = new MeshStandardMaterial({ color: '#000', emissive: '#29ff6a', emissiveIntensity: 5, toneMapped: false });
const ledOff = new MeshStandardMaterial({ color: '#173b22', roughness: 0.4 });

export interface PowerSupplyProps extends ModelProps {
  on?: boolean;
  voltage?: number;
  current?: number;
  knobAngle?: number;
}

export function PowerSupply({ modelUrl, on = false, voltage = 0, current = 0, knobAngle = 0, ...props }: PowerSupplyProps) {
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <RoundedBox args={[0.24, 0.13, 0.26]} radius={0.01} smoothness={3} position={[0, 0.065, 0]} material={plastic('#d5d9de', 0.55)} castShadow receiveShadow />
      <mesh material={plasticDark} position={[0, 0.065, 0.1305]}>
        <boxGeometry args={[0.226, 0.118, 0.002]} />
      </mesh>
      {/* Displays. */}
      {[
        { x: -0.055, value: on ? voltage.toFixed(2) : '', unit: 'V', color: '#ff5a3c' },
        { x: 0.055, value: on ? current.toFixed(3) : '', unit: 'A', color: '#3cff8a' },
      ].map((d) => (
        <group key={d.unit} position={[d.x, 0.095, 0.1325]}>
          <mesh material={displayMat}>
            <planeGeometry args={[0.085, 0.032]} />
          </mesh>
          <Text font={FONTS.bold} fontSize={0.02} color={d.color} position={[-0.004, 0, 0.001]} anchorX="center" anchorY="middle" outlineWidth={0} letterSpacing={0.04}>
            {d.value || ' '}
          </Text>
          <Text font={FONTS.semibold} fontSize={0.009} color="#cbd5e1" position={[0.036, -0.004, 0.001]} anchorX="center" anchorY="middle">
            {d.unit}
          </Text>
        </group>
      ))}
      {/* Knobs. */}
      {[-0.055, 0.055].map((x, i) => (
        <group key={x} position={[x, 0.05, 0.135]} rotation={[Math.PI / 2, i === 0 ? knobAngle : 0.6, 0]} userData={{ dynamic: true }}>
          <mesh material={plasticBlack}>
            <cylinderGeometry args={[0.014, 0.016, 0.014, 20]} />
          </mesh>
          <mesh material={plastic('#e5e7eb', 0.5)} position={[0, -0.0075, 0.009]}>
            <boxGeometry args={[0.002, 0.001, 0.009]} />
          </mesh>
        </group>
      ))}
      <Text font={FONTS.semibold} fontSize={0.0075} color="#cbd5e1" position={[-0.055, 0.029, 0.132]} anchorX="center">
        VOLTAGE
      </Text>
      <Text font={FONTS.semibold} fontSize={0.0075} color="#cbd5e1" position={[0.055, 0.029, 0.132]} anchorX="center">
        CURRENT
      </Text>
      {/* Output LED + binding posts. */}
      <mesh material={on ? ledOn : ledOff} position={[0, 0.06, 0.133]} userData={{ dynamic: true }}>
        <sphereGeometry args={[0.004, 12, 8]} />
      </mesh>
      {[
        { x: -0.02, c: '#d61f1f' },
        { x: 0.0, c: '#16a34a' },
        { x: 0.02, c: '#111111' },
      ].map((p) => (
        <group key={p.x} position={[p.x, 0.02, 0.135]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh material={plastic(p.c, 0.4)}>
            <cylinderGeometry args={[0.006, 0.006, 0.012, 14]} />
          </mesh>
          <mesh material={metalChrome} position={[0, 0.008, 0]}>
            <cylinderGeometry args={[0.0025, 0.0025, 0.006, 8]} />
          </mesh>
        </group>
      ))}
      {/* Feet. */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} material={plasticBlack} position={[sx * 0.1, 0.0, sz * 0.11]}>
            <cylinderGeometry args={[0.012, 0.012, 0.006, 10]} />
          </mesh>
        )),
      )}
    </ModelOr>
  );
}
