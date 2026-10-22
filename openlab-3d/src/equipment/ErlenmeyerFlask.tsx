/** 250 mL Erlenmeyer flask: Ø 85 mm base, 140 mm tall, Ø 34 mm neck with a beaded rim. */
import { LatheGeometry, Vector2 } from 'three';
import { useGlass } from '../materials/glass';
import { lazy } from '../utils/lazy';
import { ModelOr } from './ModelOr';
import { VesselContents } from './VesselContents';
import { PROFILES } from './profiles';
import type { VesselModelProps } from './Beaker';

const outline = (inset: number): Vector2[] => [
  new Vector2(0.042 - inset, 0.004),
  new Vector2(0.038 - inset, 0.03),
  new Vector2(0.022 - inset, 0.085),
  new Vector2(0.015 - inset, 0.105),
  new Vector2(0.015 - inset, 0.136),
];

export const flaskGeometry = lazy(() => {
  const outer = outline(0);
  const inner = outline(0.0018).reverse();
  const pts = [new Vector2(0, 0), new Vector2(0.038, 0), ...outer, new Vector2(0.0175, 0.138), new Vector2(0.0172, 0.1405), ...inner, new Vector2(0.036, 0.0022), new Vector2(0, 0.0022)];
  return new LatheGeometry(pts, 36);
});

export function ErlenmeyerFlask({ modelUrl, look, itemId, ...props }: VesselModelProps) {
  const glass = useGlass('#eef8fb');
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={flaskGeometry()} material={glass} castShadow renderOrder={1} />
      {look && <VesselContents profile={PROFILES.erlenmeyer} look={look} itemId={itemId} />}
    </ModelOr>
  );
}
