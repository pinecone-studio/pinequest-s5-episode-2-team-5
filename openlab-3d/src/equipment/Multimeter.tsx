/**
 * Handheld digital multimeter: 90 × 180 × 40 mm, yellow rubber holster, dark face,
 * LCD readout (drei <Text>), rotary range dial and red/black probe leads (TubeGeometry).
 * Lies flat on its back; the face points up (+y).
 */
import { useMemo } from 'react';
import { Text } from '@react-three/drei';
import { CatmullRomCurve3, MeshStandardMaterial, TubeGeometry, Vector3 } from 'three';
import { RoundedBox } from '@react-three/drei';
import { plastic, plasticDark, plasticBlack } from '../materials/plastic';
import { metalChrome } from '../materials/metal';
import { FONTS } from '../utils/fonts';
import { ModelOr, type ModelProps } from './ModelOr';

const lcd = new MeshStandardMaterial({ color: '#b9c7a5', roughness: 0.4, emissive: '#3c4a2c', emissiveIntensity: 0.25 });

export function Multimeter({ modelUrl, reading = '0.000', unit = 'V DC', ...props }: ModelProps & { reading?: string; unit?: string }) {
  const leads = useMemo(() => {
    const make = (x: number, bend: number) =>
      new TubeGeometry(new CatmullRomCurve3([new Vector3(x, 0.02, 0.07), new Vector3(x + bend * 0.02, 0.012, 0.12), new Vector3(x + bend * 0.08, 0.006, 0.16), new Vector3(x + bend * 0.13, 0.006, 0.12), new Vector3(x + bend * 0.15, 0.006, 0.04)]), 32, 0.0022, 6, false);
    return [make(-0.015, -1), make(0.015, 1)];
  }, []);
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <RoundedBox args={[0.09, 0.04, 0.18]} radius={0.012} smoothness={3} position={[0, 0.02, 0]} material={plastic('#f5b800', 0.75)} castShadow />
      <mesh material={plasticDark} position={[0, 0.0405, 0]}>
        <boxGeometry args={[0.074, 0.002, 0.16]} />
      </mesh>
      <mesh material={lcd} position={[0, 0.0418, -0.045]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.062, 0.036]} />
      </mesh>
      <Text font={FONTS.bold} fontSize={0.016} color="#1b2414" position={[0.0, 0.0422, -0.047]} rotation={[-Math.PI / 2, 0, 0]} anchorX="center" anchorY="middle">
        {reading}
      </Text>
      <Text font={FONTS.semibold} fontSize={0.006} color="#1b2414" position={[0.02, 0.0422, -0.033]} rotation={[-Math.PI / 2, 0, 0]} anchorX="center" anchorY="middle">
        {unit}
      </Text>
      {/* Range dial. */}
      <mesh material={plasticBlack} position={[0, 0.045, 0.015]}>
        <cylinderGeometry args={[0.021, 0.022, 0.008, 24]} />
      </mesh>
      <mesh material={plastic('#e5e7eb', 0.5)} position={[0, 0.0495, 0.006]}>
        <boxGeometry args={[0.004, 0.002, 0.018]} />
      </mesh>
      {/* Jacks. */}
      {[-0.025, 0, 0.025].map((x, i) => (
        <mesh key={x} material={i === 0 ? plastic('#d61f1f', 0.4) : plasticBlack} position={[x, 0.043, 0.068]}>
          <cylinderGeometry args={[0.005, 0.005, 0.006, 12]} />
        </mesh>
      ))}
      <mesh geometry={leads[0]} material={plastic('#d61f1f', 0.5)} />
      <mesh geometry={leads[1]} material={plasticBlack} />
      {[-1, 1].map((s) => (
        <mesh key={s} material={metalChrome} position={[s * 0.165 + (s < 0 ? 0.0 : 0), 0.006, 0.035]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0012, 0.0012, 0.02, 6]} />
        </mesh>
      ))}
    </ModelOr>
  );
}
