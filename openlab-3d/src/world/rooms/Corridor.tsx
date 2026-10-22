/**
 * East Corridor (x 6…20, z −3…1): lockers, courtyard windows, a bench, a water
 * dispenser, a fire extinguisher and the Storage Room door.
 */
import { CuboidCollider } from '@react-three/rapier';
import { HallBench, Lockers, Plant, Poster } from '../furniture/Decor';
import { WallExtinguisher } from '../furniture/FireExtinguisher';
import { plastic, paintedWhite } from '../../materials/plastic';
import { useReady, useRoomActive } from '../roomVisibility';
import { StaticBatch } from '../StaticBatch';

/** Water dispenser: 0.32 × 1.1 × 0.32 m cabinet with an 18 L bottle on top. */
function WaterDispenser({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh material={paintedWhite} position={[0, 0.55, 0]} castShadow>
        <boxGeometry args={[0.32, 1.1, 0.32]} />
      </mesh>
      <mesh material={plastic('#7cc4ff', 0.15)} position={[0, 1.3, 0]}>
        <cylinderGeometry args={[0.13, 0.13, 0.38, 20]} />
      </mesh>
      {[-0.05, 0.05].map((x, i) => (
        <mesh key={x} material={plastic(i ? '#2563eb' : '#dc2626', 0.4)} position={[x, 0.85, 0.17]}>
          <boxGeometry args={[0.03, 0.04, 0.03]} />
        </mesh>
      ))}
      <CuboidCollider args={[0.17, 0.75, 0.17]} position={[0, 0.75, 0]} />
    </group>
  );
}

export default function Corridor() {
  useReady('corridor');
  const active = useRoomActive('corridor');
  return (
    <group visible={active}>
      <StaticBatch>
      <Lockers position={[10.2, 0, -2.9]} count={12} />
      <HallBench position={[14.7, 0, 0.45]} rotY={Math.PI} />
      <WallExtinguisher id="corridor-extinguisher" position={[17.2, 0, -2.9]} />
      <WaterDispenser position={[19.55, 0, -2.55]} />
      <Plant position={[19.35, 0, 0.4]} scale={0.9} />
      <Poster position={[13.6, 1.55, 0.89]} rotY={Math.PI} spec={{ title: 'Lab Coats', lines: ['Hang coats in your', 'locker after class.'], color: '#6366f1', icon: 'flask' }} />
      </StaticBatch>
    </group>
  );
}
