/**
 * Physics Lab (x −20…−4, z −15…−3) — the hero room. Dark-gray drawer benches along the
 * back wall with a sink and glass-door wall cabinets on the right, a central island with
 * the Millikan Oil Drop station, an electronics island, an optics island, a whiteboard,
 * pendulum stand and safety equipment.
 */
import { BenchParts } from '../furniture/BenchParts';
import { LabBench } from '../furniture/LabBench';
import { Sink } from '../furniture/Sink';
import { WallCabinet } from '../furniture/WallCabinet';
import { Stools } from '../furniture/Stool';
import { Whiteboard } from '../furniture/Whiteboard';
import { WallExtinguisher } from '../furniture/FireExtinguisher';
import { Poster, WallClock, WasteBin } from '../furniture/Decor';
import { whiteboardTexture } from '../../utils/textures';
import { useReady, useRoomActive } from '../roomVisibility';
import { StaticBatch } from '../StaticBatch';
import { ElectronicsStation, MillikanStation, OpticsBench, PendulumStand } from './physicsStations';

const BACK_Z = -14.55;

export default function PhysicsLab() {
  useReady('physics');
  const active = useRoomActive('physics');
  return (
    <group visible={active}>
      <StaticBatch>
      <BenchParts>
        {/* Back wall bench run with sink. */}
        <LabBench id="phys-back-1" position={[-16.3, BACK_Z]} />
        <LabBench id="phys-back-sink" position={[-14.5, BACK_Z]} width={1.2} modules={['sink', 'sink']} sinkAt={0} />
        <LabBench id="phys-back-2" position={[-12.7, BACK_Z]} />
        <LabBench id="phys-back-3" position={[-10.3, BACK_Z]} />
        <LabBench id="phys-back-4" position={[-7.9, BACK_Z]} />
        {/* Islands. */}
        <LabBench id="phys-center" position={[-12, -9]} depth={1.2} island />
        <LabBench id="phys-west" position={[-17, -9]} depth={1.2} island />
        <LabBench id="phys-east" position={[-7, -9]} depth={1.2} island />
        {/* Low storage cabinet on the south wall. */}
        <LabBench id="phys-south" position={[-7.4, -3.45]} rotY={Math.PI} width={3.0} modules={['door', 'drawers', 'door', 'drawers', 'door']} />
      </BenchParts>
      <Sink id="phys-sink" position={[-14.5, 0.9, BACK_Z]} />
      {[-10.9, -9.7, -8.5, -7.3].map((x, i) => (
        <WallCabinet key={x} id={`phys-cab-${i}`} position={[x, 1.45, -14.55]} />
      ))}
      <MillikanStation />
      <ElectronicsStation />
      <PendulumStand position={[-16.15, 0.9, -14.55]} />
      <OpticsBench position={[-17, 0.9, -9.05]} />
      <Stools
        positions={[
          [-12.6, -10.15],
          [-11.4, -10.15],
          [-17.6, -10.15],
          [-16.4, -10.15],
          [-7.6, -10.15],
          [-6.4, -10.15],
        ]}
      />
      <Whiteboard position={[-4.11, 1.55, -9]} rotY={-Math.PI / 2} texture={whiteboardTexture()} />
      <WallClock position={[-4.11, 2.55, -12.6]} rotY={-Math.PI / 2} />
      <WallExtinguisher id="phys-extinguisher" position={[-10.4, 0, -3.1]} rotY={Math.PI} />
      <Poster position={[-14.05, 1.6, -3.1]} rotY={Math.PI} spec={{ title: 'High Voltage', lines: ['Polarity to 0 before', 'touching the chamber.', 'Up to 600 V DC.'], color: '#f59e0b', icon: 'atom' }} />
      <Poster position={[-4.11, 1.6, -5.4]} rotY={-Math.PI / 2} spec={{ title: 'Eye Protection', lines: ['Goggles must be worn', 'whenever glassware', 'is in use.'], color: '#2563eb', icon: 'goggles' }} />
      <WasteBin position={[-5.0, 0, -14.4]} />
      </StaticBatch>
    </group>
  );
}
