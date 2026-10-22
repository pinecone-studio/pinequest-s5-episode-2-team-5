/**
 * Assembles the lab: shared architecture (merged walls, windows, floor, ceiling, lights),
 * the Chemistry Lab furniture and stations, loose world items and the sky.
 */
import { Suspense, useEffect, useState } from 'react';
import { Walls } from './architecture/Wall';
import { Windows } from './architecture/Window';
import { Floor } from './architecture/Floor';
import { Ceiling } from './architecture/Ceiling';
import { CeilingLights } from './architecture/CeilingLight';
import { SkyDome } from './SkyDome';
import ChemistryLab from './rooms/ChemistryLab';
import { WorldItems } from '../interaction/Pickable';
import { useReady } from '../store/useLoadingStore';
import { canvasFontsReady } from '../utils/fonts';

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
  // Posters, signs and bottle labels are canvas textures drawn once, so wait for the
  // Cyrillic font subsets before mounting anything that draws Mongolian text.
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let live = true;
    canvasFontsReady.then(() => live && setFontsReady(true));
    return () => {
      live = false;
    };
  }, []);
  return (
    <group>
      <Architecture />
      {fontsReady && (
        <>
          {/* The balance display (drei <Text>) suspends while its font loads. */}
          <Suspense fallback={null}>
            <ChemistryLab />
          </Suspense>
          <Suspense fallback={null}>
            <WorldItems />
          </Suspense>
        </>
      )}
      <SkyDome />
    </group>
  );
}
