/**
 * Physics Lab stations:
 *  - MillikanStation: apparatus, atomizer, laptop (camera docks to the screen)
 *  - ElectronicsStation: DC power supply + breadboard circuit (the multimeter is a pickable)
 *  - PendulumStand: retort stand with a 0.4 m simple pendulum that swings on E
 *  - OpticsBench: 1.2 m rail with lamp, movable convex lens and screen; the image spot
 *    sharpens when the lens sits at the focal position
 */
import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { ContactShadows, Text } from '@react-three/drei';
import { AdditiveBlending, CatmullRomCurve3, MeshBasicMaterial, MeshStandardMaterial, Object3D, Quaternion, TubeGeometry, Vector3, type Group, type Mesh } from 'three';
import { MillikanApparatus } from '../../equipment/MillikanApparatus';
import { AtomizerBottle } from '../../equipment/AtomizerBottle';
import { Laptop } from '../../equipment/Laptop';
import { PowerSupply } from '../../equipment/PowerSupply';
import { Interactable } from '../../interaction/Interactable';
import { useExperimentStore, computeResults, estimateElementaryCharge } from '../../store/useExperimentStore';
import { useGameStore } from '../../store/useGameStore';
import { useInventoryStore } from '../../store/useInventoryStore';
import { QUALITY_PRESETS, useSettingsStore } from '../../store/useSettingsStore';
import { cameraDock } from '../../controls/Player';
import { releaseLock } from '../../controls/usePointerLock';
import { sprayDrops, startSimLoop } from '../../experiment/millikanSim';
import { metalBrushed, metalChrome, metalDark } from '../../materials/metal';
import { plastic, plasticBlack, plasticWhite } from '../../materials/plastic';
import { useGlass } from '../../materials/glass';
import { sounds } from '../../utils/sounds';
import { FONTS } from '../../utils/fonts';
import { BENCH_HEIGHT } from '../../utils/constants';

/** Screen is 0.29 × 0.181 m; dock far enough that it fits ~80% of the view (fov 50°). */
export const LAPTOP_SCREEN = { w: 0.29, h: 0.181, fov: 50 };
export function laptopDockDistance(aspect: number): number {
  const t = 2 * Math.tan(((LAPTOP_SCREEN.fov / 2) * Math.PI) / 180);
  return Math.max(LAPTOP_SCREEN.h / 0.8, LAPTOP_SCREEN.w / 0.92 / aspect) / t;
}

const tmpPos = new Vector3();
const tmpQuat = new Quaternion();
const tmpFwd = new Vector3();

export function MillikanStation() {
  const squeezeId = useExperimentStore((s) => s.squeezeId);
  const measurements = useExperimentStore((s) => s.measurements);
  const contact = useSettingsStore((s) => QUALITY_PRESETS[s.quality].contactShadows);
  const placed = useInventoryStore((s) => s.placedCount + s.worldItems.length);
  const anchor = useRef<Object3D | null>(null);
  const desktop = useMemo(() => {
    const est = estimateElementaryCharge(computeResults(measurements));
    return { measurements: measurements.length, estimate: est ? `${(est.e / 1e-19).toFixed(2)} × 10⁻¹⁹ C` : null };
  }, [measurements]);
  const T = BENCH_HEIGHT;

  const openLaptop = () => {
    const a = anchor.current;
    if (!a) return;
    a.updateWorldMatrix(true, false);
    a.getWorldPosition(tmpPos);
    a.getWorldQuaternion(tmpQuat);
    tmpFwd.set(0, 0, 1).applyQuaternion(tmpQuat);
    const d = laptopDockDistance(window.innerWidth / window.innerHeight);
    cameraDock.position.copy(tmpPos).addScaledVector(tmpFwd, d);
    cameraDock.quaternion.copy(tmpQuat);
    cameraDock.fov = LAPTOP_SCREEN.fov;
    releaseLock();
    useGameStore.getState().setMode('laptop');
    useExperimentStore.getState().markStep('openedLaptop');
    sounds.play('whoosh');
  };

  return (
    <group>
      <Interactable id="millikan" label="Millikan Oil Drop Apparatus" verb="Inspect" inspectKind="millikan">
        <MillikanApparatus interactive position={[-12, T, -9.15]} />
      </Interactable>
      <Interactable
        id="millikan-atomizer"
        label="Atomizer bulb"
        verb="Squeeze"
        inspectKind="atomizer"
        onInteract={() => {
          useExperimentStore.getState().squeeze();
          sprayDrops();
          startSimLoop();
          sounds.play('puff');
          useGameStore.getState().logEvent('Sprayed oil droplets into the chamber.');
        }}
      >
        <AtomizerBottle squeezeId={squeezeId} position={[-12.4, T, -8.86]} rotation={[0, 0.25, 0]} />
      </Interactable>
      <Interactable id="millikan-laptop" label="Laptop — Drop Logger" verb="Use" inspectKind="laptop" onInteract={openLaptop}>
        <Laptop desktop={desktop} screenAnchor={anchor} position={[-11.4, T, -8.92]} rotation={[0, -0.32, 0]} />
      </Interactable>
      {/* Mouse mat under the laptop and a station placard. */}
      <mesh material={plastic('#2b3036', 0.9)} position={[-11.4, T + 0.001, -8.92]} rotation={[-Math.PI / 2, 0, -0.32]}>
        <planeGeometry args={[0.42, 0.3]} />
      </mesh>
      <group position={[-12, T + 0.001, -8.47]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh material={plastic('#F5B800', 0.6)}>
          <planeGeometry args={[0.5, 0.07]} />
        </mesh>
        <Text font={FONTS.bold} fontSize={0.026} color="#1f2328" position={[0, 0, 0.001]} anchorX="center" anchorY="middle" letterSpacing={0.05}>
          STATION 1 · ELEMENTARY CHARGE
        </Text>
      </group>
      {contact && <ContactShadows key={placed} position={[-12, T + 0.002, -9]} scale={[2.4, 1.2]} far={0.45} blur={2.4} opacity={0.42} resolution={512} frames={1} />}
    </group>
  );
}

/** Breadboard with a resistor network between the supply and the meter. */
function Breadboard({ position }: { position: [number, number, number] }) {
  const wires = useMemo(() => {
    const mk = (pts: [number, number, number][]) => new TubeGeometry(new CatmullRomCurve3(pts.map((p) => new Vector3(...p))), 24, 0.0018, 6, false);
    return [
      mk([[-0.2, 0.02, 0.0], [-0.14, 0.05, 0.04], [-0.06, 0.02, 0.03], [-0.03, 0.012, 0.01]]),
      mk([[-0.2, 0.02, 0.03], [-0.13, 0.04, 0.07], [-0.05, 0.02, 0.05], [0.03, 0.012, 0.02]]),
    ];
  }, []);
  return (
    <group position={position}>
      <mesh material={plastic('#f3f4f1', 0.6)} position={[0, 0.005, 0]} castShadow>
        <boxGeometry args={[0.17, 0.01, 0.055]} />
      </mesh>
      {[-0.03, 0.0, 0.03].map((x, i) => (
        <group key={x} position={[x, 0.016, 0]}>
          <mesh material={plastic('#e9c98a', 0.5)} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.0028, 0.0028, 0.012, 10]} />
          </mesh>
          <mesh material={plastic(['#c2410c', '#7c3aed', '#16a34a'][i], 0.5)} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.0029, 0.0029, 0.002, 10]} />
          </mesh>
        </group>
      ))}
      <mesh geometry={wires[0]} material={plastic('#dc2626', 0.5)} />
      <mesh geometry={wires[1]} material={plasticBlack} />
    </group>
  );
}

export function ElectronicsStation() {
  const on = useExperimentStore((s) => !!s.toggles['psu-on']);
  const v = useExperimentStore((s) => s.values['psu-voltage'] ?? 5);
  const T = BENCH_HEIGHT;
  const exp = useExperimentStore.getState;
  return (
    <group>
      <Interactable
        id="psu"
        label={`DC power supply (${v.toFixed(1)} V)`}
        verb={on ? 'Switch off' : 'Switch on'}
        inspectKind="powerSupply"
        onInteract={() => {
          exp().toggle('psu-on');
          sounds.play('click');
        }}
        onWheel={(dir) => {
          exp().setValue('psu-voltage', Math.max(0, Math.min(30, Math.round((v + dir * 0.5) * 10) / 10)));
          sounds.play('tick');
        }}
      >
        <PowerSupply on={on} voltage={v} current={on ? v / 470 : 0} knobAngle={(v / 30) * Math.PI * 1.5} position={[-7.35, T, -9.1]} />
      </Interactable>
      <Breadboard position={[-7.0, T, -8.75]} />
      <group position={[-7, T + 0.001, -8.47]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh material={plastic('#60a5fa', 0.6)}>
          <planeGeometry args={[0.44, 0.07]} />
        </mesh>
        <Text font={FONTS.bold} fontSize={0.026} color="#0b1220" position={[0, 0, 0.001]} anchorX="center" anchorY="middle" letterSpacing={0.05}>
          STATION 2 · OHM’S LAW
        </Text>
      </group>
    </group>
  );
}

const stringMat = new MeshStandardMaterial({ color: '#f1f1f1', roughness: 0.9 });

export function PendulumStand({ position }: { position: [number, number, number] }) {
  const swing = useRef<Group>(null);
  const motion = useRef({ amp: 0, t: 0 });
  const L = 0.4;
  useFrame((_, dt) => {
    const m = motion.current;
    if (m.amp < 0.002 || !swing.current) return;
    m.t += dt;
    m.amp *= Math.exp(-0.06 * dt);
    const omega = Math.sqrt(9.81 / L);
    swing.current.rotation.x = m.amp * Math.cos(omega * m.t);
  });
  return (
    <group position={position}>
      <mesh material={metalDark} position={[0, 0.006, 0]} castShadow>
        <boxGeometry args={[0.18, 0.012, 0.12]} />
      </mesh>
      <mesh material={metalChrome} position={[-0.06, 0.31, 0]} castShadow>
        <cylinderGeometry args={[0.006, 0.006, 0.6, 10]} />
      </mesh>
      <mesh material={metalChrome} position={[0.0, 0.6, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.005, 0.005, 0.14, 10]} />
      </mesh>
      <mesh material={metalDark} position={[-0.06, 0.6, 0]}>
        <boxGeometry args={[0.025, 0.025, 0.025]} />
      </mesh>
      <Interactable
        id="pendulum"
        label="Simple pendulum (L = 0.40 m)"
        verb="Swing"
        onInteract={() => {
          motion.current = { amp: 0.35, t: 0 };
          sounds.play('tick');
          useGameStore.getState().showToast('Pendulum', `T = 2π√(L/g) ≈ ${(2 * Math.PI * Math.sqrt(L / 9.81)).toFixed(2)} s`);
        }}
      >
        <group ref={swing} position={[0.06, 0.6, 0]}>
          <mesh material={stringMat} position={[0, -L / 2, 0]}>
            <cylinderGeometry args={[0.0008, 0.0008, L, 4]} />
          </mesh>
          <mesh material={metalBrushed} position={[0, -L, 0]} castShadow>
            <sphereGeometry args={[0.018, 20, 14]} />
          </mesh>
        </group>
      </Interactable>
    </group>
  );
}

const beamMat = new MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.12, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
const spotMat = new MeshBasicMaterial({ color: '#fff7d6', transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false, toneMapped: false });
const bulbOn = new MeshStandardMaterial({ color: '#000', emissive: '#fff1c4', emissiveIntensity: 5, toneMapped: false });
const LENS_POSITIONS = [-0.25, -0.1, 0.05, 0.2];
const FOCAL_INDEX = 2;

export function OpticsBench({ position }: { position: [number, number, number] }) {
  const glass = useGlass('#e8f6ff');
  const [lamp, setLamp] = useState(false);
  const [lensIdx, setLensIdx] = useState(0);
  const lensGroup = useRef<Group>(null);
  const spot = useRef<Mesh>(null);
  const lensX = useRef(LENS_POSITIONS[0]);
  useFrame((_, dt) => {
    const target = LENS_POSITIONS[lensIdx];
    lensX.current += (target - lensX.current) * (1 - Math.exp(-6 * dt));
    if (lensGroup.current) lensGroup.current.position.x = lensX.current;
    if (spot.current) {
      const blur = Math.abs(lensX.current - LENS_POSITIONS[FOCAL_INDEX]) * 0.32 + 0.006;
      spot.current.scale.setScalar(blur / 0.02);
    }
  });
  const H = 0.17;
  return (
    <group position={position}>
      <mesh material={metalBrushed} position={[0, 0.02, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.04, 0.06]} />
      </mesh>
      {Array.from({ length: 13 }, (_, i) => (
        <mesh key={i} material={plasticBlack} position={[-0.6 + i * 0.1, 0.0405, 0.031]}>
          <boxGeometry args={[0.002, 0.012, 0.001]} />
        </mesh>
      ))}
      {/* Lamp carrier. */}
      <Interactable id="optics-lamp" label="Optics lamp" verb={lamp ? 'Switch off' : 'Switch on'} onInteract={() => { setLamp((l) => !l); sounds.play('click'); }}>
        <group position={[-0.5, 0.04, 0]}>
          <mesh material={plasticDark()} position={[0, 0.06, 0]}>
            <boxGeometry args={[0.05, 0.12, 0.07]} />
          </mesh>
          <mesh material={plasticWhite} position={[0, H, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.035, 0.035, 0.09, 24]} />
          </mesh>
          <mesh material={lamp ? bulbOn : plastic('#d7dadd', 0.3)} position={[0.046, H, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.022, 0.022, 0.003, 20]} />
          </mesh>
        </group>
      </Interactable>
      {/* Movable lens. */}
      <Interactable
        id="optics-lens"
        label="Convex lens (f = 15 cm)"
        verb="Slide"
        onInteract={() => {
          setLensIdx((i) => (i + 1) % LENS_POSITIONS.length);
          sounds.play('tick');
        }}
      >
        <group ref={lensGroup} position={[LENS_POSITIONS[0], 0.04, 0]}>
          <mesh material={plasticDark()} position={[0, 0.05, 0]}>
            <boxGeometry args={[0.03, 0.1, 0.05]} />
          </mesh>
          <mesh material={plasticBlack} position={[0, H, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.04, 0.005, 8, 28]} />
          </mesh>
          <mesh material={glass} position={[0, H, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 0.18, 1]} renderOrder={1}>
            <sphereGeometry args={[0.04, 24, 16]} />
          </mesh>
        </group>
      </Interactable>
      {/* Screen. */}
      <group position={[0.5, 0.04, 0]}>
        <mesh material={plasticDark()} position={[0, 0.06, 0]}>
          <boxGeometry args={[0.03, 0.12, 0.05]} />
        </mesh>
        <mesh material={plasticWhite} position={[0, H, 0]} castShadow>
          <boxGeometry args={[0.006, 0.16, 0.16]} />
        </mesh>
        {lamp && (
          <mesh ref={spot} material={spotMat} position={[-0.004, H, 0]} rotation={[0, -Math.PI / 2, 0]} userData={{ noOutline: true }}>
            <circleGeometry args={[0.02, 24]} />
          </mesh>
        )}
      </group>
      {lamp && (
        <mesh material={beamMat} position={[0, 0.04 + H, 0]} rotation={[0, 0, Math.PI / 2]} userData={{ noOutline: true }}>
          <cylinderGeometry args={[0.02, 0.03, 0.96, 16, 1, true]} />
        </mesh>
      )}
      <group position={[0, 0.001, 0.44]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh material={plastic('#34d399', 0.6)}>
          <planeGeometry args={[0.44, 0.07]} />
        </mesh>
        <Text font={FONTS.bold} fontSize={0.026} color="#062b1d" position={[0, 0, 0.001]} anchorX="center" anchorY="middle" letterSpacing={0.05}>
          STATION 3 · THIN LENSES
        </Text>
      </group>
    </group>
  );
}

function plasticDark() {
  return plastic('#3a3f46', 0.5);
}
