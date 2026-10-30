import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { vesselFx } from '../lab/vesselFx';
import { SoftPuffs, type Puff } from './SoftPuffs';

/**
 * Vapour above the rim of a hot vessel: steam rises, widens and curls as it cools and fades;
 * smoke (charring, burning) is dark, rises faster and churns more.
 */
export function VapourPlume({ itemId, rim, radius }: { itemId: string; rim: number; radius: number }) {
  const clock = useRef(0);
  const level = useRef({ steam: 0, smoke: 0 });
  useFrame((_, dt) => {
    const fx = vesselFx.get(itemId);
    const k = 1 - Math.exp(-Math.min(0.1, dt) * 2.5);
    level.current.steam += ((fx ? Math.min(1, fx.steam) : 0) - level.current.steam) * k;
    level.current.smoke += ((fx ? Math.min(1, fx.smoke) : 0) - level.current.smoke) * k;
    clock.current += Math.min(0.05, dt);
  });
  const plume = (smoke: boolean) => (i: number, p: Puff) => {
    const amount = smoke ? level.current.smoke : level.current.steam;
    if (amount < 0.02) return false;
    const seed = Math.abs(Math.sin(i * 91.7 + (smoke ? 3.1 : 0)) * 43758.5453) % 1;
    const life = smoke ? 1.7 : 2.4;
    const t = ((clock.current + seed * life) / life) % 1;
    const curl = clock.current * (smoke ? 1.4 : 0.8) + seed * 6.28;
    const spread = radius * (0.35 + t * (smoke ? 2.4 : 1.8));
    p.x = Math.cos(seed * 6.28) * radius * 0.4 * seed + Math.sin(curl + t * 3) * spread * 0.35;
    p.z = Math.sin(seed * 6.28) * radius * 0.4 * seed + Math.cos(curl * 0.7 + t * 2) * spread * 0.35;
    p.y = rim + t * (smoke ? 0.26 : 0.18) + t * t * 0.04;
    p.size = radius * (0.5 + t * (smoke ? 2.4 : 1.6));
    p.spin = seed * 6.28 + t * (smoke ? 1.5 : 0.8);
    // Fade in quickly at the rim, out slowly as it disperses.
    // Wisps, not a wall: thin at the rim, gone within a few centimetres.
    p.alpha = amount * (smoke ? 0.4 : 0.16) * Math.min(1, t * 6) * (1 - t) * (1 - t);
    return true;
  };
  return (
    <group>
      <SoftPuffs max={14} color="#f6f8fa" layout={plume(false)} />
      <SoftPuffs max={16} color="#4a4541" layout={plume(true)} />
    </group>
  );
}
