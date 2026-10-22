/**
 * Assembles the lab: shared architecture (merged walls, windows, floor, ceiling, lights),
 * the Chemistry Lab furniture and stations, loose world items and the sky.
 */
import { Suspense } from 'react';
import { Walls } from './architecture/Wall';
import { Windows } from './architecture/Window';
import { Floor } from './architecture/Floor';
import { Ceiling } from './architecture/Ceiling';
import { CeilingLights } from './architecture/CeilingLight';
import { SkyDome } from './SkyDome';
import ChemistryLab from './rooms/ChemistryLab';
import { WorldItems } from '../interaction/Pickable';
import { useReady } from '../store/useLoadingStore';

function Architecture() {
  useReady('architecture');
  return (
    <group>
      <Floor />
      <Walls />
      <Windows />
      <Ceiling />
      <CeilingLights />
    </group>
  );
}

export function Lab() {
  return (
    <group>
      <Architecture />
      {/* Its labels (drei <Text>) suspend while their fonts load. */}
      <Suspense fallback={null}>
        <ChemistryLab />
      </Suspense>
      <Suspense fallback={null}>
        <WorldItems />
      </Suspense>
      <SkyDome />
    </group>
  );
}
