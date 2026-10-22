/**
 * Main Hall (x −20…6, z −3…5): the wide central hallway with the main entrance, glass
 * doors to the Physics, Chemistry and Biology labs (signs are on the doors), safety
 * posters, a fire extinguisher, an eyewash station, seating benches and plants.
 */
import { EyewashStation } from '../furniture/SafetyShower';
import { WallExtinguisher } from '../furniture/FireExtinguisher';
import { HallBench, HangingSign, NoticeBoard, Plant, Poster, WallClock, WallLogo, WasteBin } from '../furniture/Decor';
import { plastic } from '../../materials/plastic';
import { useReady, useRoomActive } from '../roomVisibility';
import { StaticBatch } from '../StaticBatch';

export default function MainHall() {
  useReady('mainHall');
  const active = useRoomActive('mainHall');
  return (
    <group visible={active}>
      <StaticBatch>
      <WallLogo position={[-5.7, 2.15, -2.9]} />
      <HangingSign position={[-12, 2.7, 1.6]} text="WELCOME TO OPENLAB" width={2.6} />
      <HangingSign position={[5.4, 2.7, -1]} rotY={Math.PI / 2} text="EAST CORRIDOR · STORAGE" width={2.8} />
      <Poster position={[-9.4, 1.55, -2.9]} spec={{ title: 'Safety First', lines: ['Goggles, gloves and', 'closed shoes in all labs.'], color: '#F5B800', icon: 'goggles' }} />
      <Poster position={[-2.6, 1.55, -2.9]} spec={{ title: 'Know Your Exits', lines: ['Main entrance: west.', 'Assembly point: car park.'], color: '#16a34a', icon: 'exit' }} />
      <Poster position={[-9.8, 1.55, 4.89]} rotY={Math.PI} spec={{ title: 'Wash Your Hands', lines: ['Every time you', 'leave a lab.'], color: '#0ea5e9', icon: 'hands' }} />
      <Poster position={[-3.4, 1.55, 4.89]} rotY={Math.PI} spec={{ title: 'No Food or Drink', lines: ['Never eat, drink or', 'store food in labs.'], color: '#dc2626', icon: 'nofood' }} />
      <NoticeBoard position={[-17.2, 1.6, 4.89]} rotY={Math.PI} title="LAB SCHEDULE" />
      <WallExtinguisher id="hall-extinguisher" position={[-0.9, 0, -2.9]} />
      <EyewashStation id="hall-eyewash" position={[3.6, 0, 4.89]} rotY={Math.PI} />
      <WallClock position={[-4.7, 2.55, 4.89]} rotY={Math.PI} />
      <HallBench position={[-17.2, 0, 4.4]} rotY={Math.PI} />
      <HallBench position={[-4.4, 0, 4.4]} rotY={Math.PI} />
      <Plant position={[-19.35, 0, -2.35]} />
      <Plant position={[-19.35, 0, 4.35]} scale={0.9} />
      <Plant position={[-15.0, 0, -2.45]} scale={0.85} />
      <Plant position={[5.3, 0, 4.35]} />
      <WasteBin position={[-15.9, 0, 4.5]} />
      {/* Entrance mat. */}
      <mesh material={plastic('#2b3036', 1)} position={[-19.2, 0.003, 1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[1.2, 3.2]} />
      </mesh>
      </StaticBatch>
    </group>
  );
}
