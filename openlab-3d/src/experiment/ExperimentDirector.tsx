/**
 * Non-visual helper inside the canvas: detects arrival at the Millikan station and
 * keeps the apparatus hum volume tied to the player's distance.
 */
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { playerState } from '../store/useGameStore';
import { useExperimentStore } from '../store/useExperimentStore';
import { sounds } from '../utils/sounds';

const STATION = new Vector3(-12, 0, -8.6);

export function ExperimentDirector() {
  const timer = useRef(0);
  useFrame((_, dt) => {
    timer.current -= dt;
    if (timer.current > 0) return;
    timer.current = 0.25;
    const exp = useExperimentStore.getState();
    const d = playerState.position.distanceTo(STATION);
    if (!exp.steps.reachedLab && d < 2.2) exp.markStep('reachedLab');
    if (exp.power) sounds.setHum(true, Math.max(0, 1 - d / 9));
  });
  return null;
}
