/**
 * Stainless-steel lab sink: 0.5 m × 0.4 m × 0.22 m deep basin set into a bench top
 * (top surface at y = 0), with a 0.38 m tall chrome gooseneck faucet (TubeGeometry)
 * and two lever taps. E toggles a running-water stream.
 */
import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CatmullRomCurve3, MeshPhysicalMaterial, TubeGeometry, Vector3, type Mesh } from 'three';
import { metalChrome, metalBrushed } from '../../materials/metal';
import { plasticBlack } from '../../materials/plastic';
import { Interactable } from '../../interaction/Interactable';
import { sinkPour } from '../../interaction/pour';
import { isContainer } from '../../equipment/equipmentCatalog';
import { totalMl } from '../../chemistry/substances';
import { useInventoryStore } from '../../store/useInventoryStore';
import { sounds } from '../../utils/sounds';
import { lazy } from '../../utils/lazy';

const faucetCurve = lazy(
  () =>
    new CatmullRomCurve3([
      new Vector3(0, 0, 0),
      new Vector3(0, 0.22, 0),
      new Vector3(0, 0.33, 0.03),
      new Vector3(0, 0.36, 0.12),
      new Vector3(0, 0.32, 0.2),
      new Vector3(0, 0.25, 0.22),
    ]),
);
const faucetGeometry = lazy(() => new TubeGeometry(faucetCurve(), 48, 0.013, 12, false));

const waterMaterial = new MeshPhysicalMaterial({ color: '#cfe9ff', transparent: true, opacity: 0.55, roughness: 0.05, transmission: 0, emissive: '#9fd0ff', emissiveIntensity: 0.15 });

export function Sink({ id, position, rotY = 0 }: { id: string; position: [number, number, number]; rotY?: number }) {
  const [running, setRunning] = useState(false);
  const stream = useRef<Mesh>(null);
  const pourVerb = useInventoryStore((s) => {
    const h = s.held;
    if (!h || !isContainer(h.kind) || h.kind === 'reagentBottle') return undefined;
    return totalMl(h.variant?.contents) > 0.01 ? 'хоослох' : 'усаар дүүргэх';
  });
  useFrame((state) => {
    if (stream.current && running) stream.current.scale.x = stream.current.scale.z = 1 + Math.sin(state.clock.elapsedTime * 40) * 0.08;
  });
  const walls = useMemo(
    () => [
      { p: [0, -0.21, 0] as const, s: [0.5, 0.02, 0.4] as const },
      { p: [-0.25, -0.11, 0] as const, s: [0.012, 0.22, 0.4] as const },
      { p: [0.25, -0.11, 0] as const, s: [0.012, 0.22, 0.4] as const },
      { p: [0, -0.11, -0.2] as const, s: [0.5, 0.22, 0.012] as const },
      { p: [0, -0.11, 0.2] as const, s: [0.5, 0.22, 0.012] as const },
    ],
    [],
  );
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {walls.map((w, i) => (
        <mesh key={i} material={metalBrushed} position={[w.p[0], w.p[1], w.p[2]]} receiveShadow>
          <boxGeometry args={[w.s[0], w.s[1], w.s[2]]} />
        </mesh>
      ))}
      {/* Rim. */}
      <mesh material={metalBrushed} position={[0, 0.002, 0]}>
        <boxGeometry args={[0.56, 0.006, 0.46]} />
      </mesh>
      <mesh material={plasticBlack} position={[0, -0.199, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.025, 20]} />
      </mesh>
      <Interactable id={id} label="Усны цорго" verb={running ? 'хаах' : 'нээх'} onPour={pourVerb ? sinkPour : undefined} pourVerb={pourVerb} onInteract={() => { setRunning((r) => !r); sounds.play('click', 0.5); }}>
        <group position={[0, 0.005, -0.21]}>
          <mesh material={metalChrome} position={[0, 0.015, 0]}>
            <cylinderGeometry args={[0.028, 0.034, 0.03, 20]} />
          </mesh>
          <mesh material={metalChrome} geometry={faucetGeometry()} castShadow />
          <mesh material={metalChrome} position={[0, 0.245, 0.22]}>
            <cylinderGeometry args={[0.017, 0.015, 0.03, 16]} />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.11, 0, 0]}>
              <mesh material={metalChrome} position={[0, 0.03, 0]}>
                <cylinderGeometry args={[0.018, 0.022, 0.06, 16]} />
              </mesh>
              <mesh material={metalChrome} position={[s * 0.03, 0.065, 0.02]} rotation={[0, 0, (s * Math.PI) / 2.5]}>
                <boxGeometry args={[0.012, 0.08, 0.012]} />
              </mesh>
              <mesh material={s < 0 ? waterHot : waterCold} position={[0, 0.062, 0]}>
                <cylinderGeometry args={[0.008, 0.008, 0.004, 12]} />
              </mesh>
            </group>
          ))}
          {running && (
            <mesh ref={stream} material={waterMaterial} position={[0, 0.115, 0.22]} userData={{ noOutline: true }}>
              <cylinderGeometry args={[0.006, 0.008, 0.25, 10, 1, true]} />
            </mesh>
          )}
        </group>
      </Interactable>
    </group>
  );
}

const waterHot = new MeshPhysicalMaterial({ color: '#e11d48', roughness: 0.4 });
const waterCold = new MeshPhysicalMaterial({ color: '#2563eb', roughness: 0.4 });
