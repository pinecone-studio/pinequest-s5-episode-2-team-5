/**
 * Storage Room (x 10…20, z −15…−3): rows of steel shelving (1.8 × 2.0 × 0.5 m units)
 * stocked with instanced boxes and glassware, a packing table by the door, stacked
 * cartons, a trolley and chained gas cylinders.
 */
import { CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { ShelvingUnits, type UnitPlacement } from '../furniture/Shelf';
import { Poster, Table } from '../furniture/Decor';
import { WallExtinguisher } from '../furniture/FireExtinguisher';
import { plastic, plasticBlack } from '../../materials/plastic';
import { metalBrushed, metalChrome, metalDark, metalPainted } from '../../materials/metal';
import { useReady, useRoomActive } from '../roomVisibility';
import { StaticBatch } from '../StaticBatch';

const UNITS: UnitPlacement[] = [
  // North wall.
  { x: 11.2, z: -14.65, rotY: 0 },
  { x: 13.1, z: -14.65, rotY: 0 },
  { x: 16.9, z: -14.65, rotY: 0 },
  { x: 18.8, z: -14.65, rotY: 0 },
  // West wall.
  { x: 10.35, z: -12.2, rotY: Math.PI / 2 },
  { x: 10.35, z: -10.3, rotY: Math.PI / 2 },
  { x: 10.35, z: -8.4, rotY: Math.PI / 2 },
  // East wall.
  { x: 19.65, z: -12.2, rotY: -Math.PI / 2 },
  { x: 19.65, z: -10.3, rotY: -Math.PI / 2 },
  { x: 19.65, z: -8.4, rotY: -Math.PI / 2 },
  // Center rows.
  { x: 13.6, z: -11.4, rotY: Math.PI / 2 },
  { x: 13.6, z: -9.5, rotY: Math.PI / 2 },
  { x: 16.4, z: -11.4, rotY: -Math.PI / 2 },
  { x: 16.4, z: -9.5, rotY: -Math.PI / 2 },
];

const CARTONS: [number, number, number, number, number, number][] = [
  [10.7, 0.2, -4.0, 0.6, 0.4, 0.5],
  [10.75, 0.6, -4.05, 0.5, 0.4, 0.45],
  [11.35, 0.18, -3.9, 0.5, 0.36, 0.45],
  [10.72, 0.95, -4.0, 0.4, 0.3, 0.36],
];

function Trolley({ position, rotY = 0 }: { position: [number, number, number]; rotY?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {[0.2, 0.7].map((y) => (
        <mesh key={y} material={metalPainted} position={[0, y, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.9, 0.025, 0.5]} />
        </mesh>
      ))}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <group key={`${sx}${sz}`} position={[sx * 0.42, 0, sz * 0.22]}>
            <mesh material={metalChrome} position={[0, 0.46, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.6, 8]} />
            </mesh>
            <mesh material={plasticBlack} position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.045, 0.045, 0.03, 14]} />
            </mesh>
          </group>
        )),
      )}
      <mesh material={metalChrome} position={[-0.47, 0.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.46, 10]} />
      </mesh>
      <mesh material={plastic('#c89f6d', 0.85)} position={[0.1, 0.87, 0]} castShadow>
        <boxGeometry args={[0.5, 0.32, 0.4]} />
      </mesh>
      <mesh material={plastic('#d4b083', 0.85)} position={[0.05, 0.32, 0]} castShadow>
        <boxGeometry args={[0.6, 0.22, 0.42]} />
      </mesh>
      <CuboidCollider args={[0.48, 0.5, 0.27]} position={[0, 0.5, 0]} />
    </group>
  );
}

function GasCylinders({ position }: { position: [number, number, number] }) {
  const colors = ['#1f7a4d', '#4b5563', '#2563eb'];
  return (
    <group position={position}>
      {colors.map((c, i) => (
        <group key={c} position={[0, 0, (i - 1) * 0.3]}>
          <mesh material={plastic(c, 0.4)} position={[0, 0.7, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.11, 1.3, 20]} />
          </mesh>
          <mesh material={plastic(c, 0.4)} position={[0, 1.37, 0]}>
            <sphereGeometry args={[0.11, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <mesh material={metalBrushed} position={[0, 1.52, 0]}>
            <cylinderGeometry args={[0.035, 0.04, 0.12, 12]} />
          </mesh>
        </group>
      ))}
      {[0.6, 1.1].map((y) => (
        <mesh key={y} material={metalDark} position={[0.1, y, 0]}>
          <boxGeometry args={[0.02, 0.02, 0.95]} />
        </mesh>
      ))}
      <CylinderCollider args={[0.75, 0.45]} position={[0, 0.75, 0]} />
    </group>
  );
}

export default function StorageRoom() {
  useReady('storage');
  const active = useRoomActive('storage');
  return (
    <group visible={active}>
      <StaticBatch>
      <ShelvingUnits units={UNITS} seed={42} />
      <Table id="store-table" position={[17.0, -5.0]} width={1.6} depth={0.8} height={0.86} />
      {CARTONS.map(([x, y, z, w, h, d], i) => (
        <group key={i}>
          <mesh material={plastic(i % 2 ? '#c89f6d' : '#b88d5c', 0.85)} position={[x, y, z]} rotation={[0, i * 0.12, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, h, d]} />
          </mesh>
          <CuboidCollider args={[w / 2, h / 2, d / 2]} position={[x, y, z]} rotation={[0, i * 0.12, 0]} />
        </group>
      ))}
      <Trolley position={[12.6, 0, -6.0]} rotY={0.3} />
      <GasCylinders position={[19.6, 0, -4.4]} />
      <WallExtinguisher id="store-extinguisher" position={[13.3, 0, -3.11]} rotY={Math.PI} />
      <Poster position={[17.6, 1.6, -3.11]} rotY={Math.PI} spec={{ title: 'Storage Rules', lines: ['Heavy items low.', 'Label every box.', 'Return what you take.'], color: '#64748b', icon: 'flask' }} />
      </StaticBatch>
    </group>
  );
}
