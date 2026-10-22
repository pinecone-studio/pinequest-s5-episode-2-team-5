/**
 * Assembles the facility: shared architecture (merged walls, windows, doors, floor,
 * ceiling, lights), the six lazily loaded rooms, loose world items and the sky.
 */
import { lazy, Suspense } from 'react';
import { Walls } from './architecture/Wall';
import { Windows } from './architecture/Window';
import { Floor } from './architecture/Floor';
import { Ceiling } from './architecture/Ceiling';
import { CeilingLights } from './architecture/CeilingLight';
import { Doors } from './architecture/Door';
import { SkyDome } from './SkyDome';
import { WorldItems } from '../interaction/Pickable';
import { useReady } from './roomVisibility';

const MainHall = lazy(() => import('./rooms/MainHall'));
const Corridor = lazy(() => import('./rooms/Corridor'));
const PhysicsLab = lazy(() => import('./rooms/PhysicsLab'));
const ChemistryLab = lazy(() => import('./rooms/ChemistryLab'));
const BiologyMicroscopyLab = lazy(() => import('./rooms/BiologyMicroscopyLab'));
const StorageRoom = lazy(() => import('./rooms/StorageRoom'));

function Architecture() {
  useReady('architecture');
  return (
    <group>
      <Floor />
      <Walls />
      <Windows />
      <Ceiling />
      <CeilingLights />
      <Doors />
    </group>
  );
}

export function Lab() {
  return (
    <group>
      <Architecture />
      {/* Each room has its own boundary so they stream in independently. */}
      <Suspense fallback={null}>
        <MainHall />
      </Suspense>
      <Suspense fallback={null}>
        <PhysicsLab />
      </Suspense>
      <Suspense fallback={null}>
        <Corridor />
      </Suspense>
      <Suspense fallback={null}>
        <ChemistryLab />
      </Suspense>
      <Suspense fallback={null}>
        <BiologyMicroscopyLab />
      </Suspense>
      <Suspense fallback={null}>
        <StorageRoom />
      </Suspense>
      <Suspense fallback={null}>
        <WorldItems />
      </Suspense>
      <SkyDome />
    </group>
  );
}
