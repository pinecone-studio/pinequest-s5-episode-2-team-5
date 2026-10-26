import { PhysicalShowcase } from '../experiments/workbench/guidance/PhysicalShowcase';
import { useEffect } from 'react';
import { Physics } from '@react-three/rapier';
import { Player } from '../controls/Player';
import { PhysicsDriver } from '../controls/PhysicsDriver';
import { FocusRaycaster } from '../interaction/useRaycastFocus';
import { HeldItem } from '../interaction/HeldItem';
import { ChemSim } from './ChemSim';
import { LabFx } from './LabFx';
import { ReactionEffects } from './ReactionEffects';
import { Lab } from './Lab';
import { Lighting } from './Lighting';
import { Effects } from './Effects';
import { GlassLOD, PerformanceManager, ShadowUpdater, Warmup } from './Performance';
import { WorkbenchRuntime } from '../experiments/workbench/WorkbenchRuntime';
import { connectExperimentCatalog } from '../lab/experiments';
import { startWorkbenchTracking } from '../experiments/workbench/session';
import { useReady } from '../store/useLoadingStore';

function EngineReady() {
  useReady('engine');
  return null;
}

/** Loaded in the background after the lightweight app shell has rendered. */
export default function LabScene({ onDpr }: { onDpr: (dpr: number) => void }) {
  useEffect(connectExperimentCatalog, []);
  useEffect(startWorkbenchTracking, []);
  return (
    <>
      <Physics paused timeStep="vary" gravity={[0, -9.81, 0]}>
        <EngineReady />
        <PhysicsDriver />
        <Lighting />
        <Lab />
        <Player />
        <FocusRaycaster />
        <HeldItem />
        <ChemSim />
        <WorkbenchRuntime />
        <PhysicalShowcase />
        <LabFx />
        <ReactionEffects />
      </Physics>
      <Effects />
      <GlassLOD />
      <ShadowUpdater />
      <Warmup />
      <PerformanceManager onDpr={onDpr} />
    </>
  );
}
