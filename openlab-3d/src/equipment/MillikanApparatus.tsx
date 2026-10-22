/**
 * Millikan Oil Drop Apparatus (origin = bottom center, front = +z):
 *  - white rounded base 450 × 250 × 300 mm with a black front label panel
 *  - large black voltage knob (0–600 V over 270°), a 3-position plate polarity toggle
 *    (+ / 0 / −) and an OFF/ON toggle with a red indicator LED that glows (Bloom)
 *  - small LCD voltage readout
 *  - clear Ø 100 mm oil chamber between two brass capacitor plates on a black platform
 *  - white light-source housing aimed at the chamber (lamp glows when ON)
 *  - white measuring-microscope tube tilted 25° up toward the user, with a black eyepiece
 *  - reticle/scale plate on a small stand, rubber feet and a power cable
 * With `interactive`, each control is an <Interactable> wired to the experiment store.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Text } from '@react-three/drei';
import { CatmullRomCurve3, InstancedMesh, MeshStandardMaterial, Object3D, SphereGeometry, TubeGeometry, Vector3, type Group } from 'three';
import { plasticBlack, plasticWhite, plastic, rubberBlack } from '../materials/plastic';
import { metalBrass, metalChrome, metalDark } from '../materials/metal';
import { useGlass } from '../materials/glass';
import { useExperimentStore } from '../store/useExperimentStore';
import { useGameStore } from '../store/useGameStore';
import { Interactable } from '../interaction/Interactable';
import { releaseLock } from '../controls/usePointerLock';
import { sim, PLATE_BOTTOM, PLATE_TOP, FIELD_W, startSimLoop } from '../experiment/millikanSim';
import { reticlePlateTexture } from '../utils/textures';
import { sounds } from '../utils/sounds';
import { FONTS } from '../utils/fonts';
import { MILLIKAN } from '../utils/constants';
import { ModelOr, type ModelProps } from './ModelOr';
import { StaticBatch } from '../world/StaticBatch';

const W = 0.45;
const H = 0.25;
const D = 0.3;
const FRONT = D / 2;

const ledOn = new MeshStandardMaterial({ color: '#ff2a1a', emissive: '#ff1a0a', emissiveIntensity: 7, toneMapped: false });
const ledOff = new MeshStandardMaterial({ color: '#5a1010', roughness: 0.35 });
const lampOn = new MeshStandardMaterial({ color: '#000', emissive: '#fff1c4', emissiveIntensity: 4, toneMapped: false });
const lampOff = new MeshStandardMaterial({ color: '#c8ccd0', roughness: 0.2, metalness: 0.2 });
const lcdOn = new MeshStandardMaterial({ color: '#06140c', emissive: '#0b2d18', emissiveIntensity: 1 });
const lcdOff = new MeshStandardMaterial({ color: '#0a0d0c', roughness: 0.3 });
const dropMaterial = new MeshStandardMaterial({ color: '#000', emissive: '#ffe9b0', emissiveIntensity: 5, toneMapped: false });
const dropGeometry = new SphereGeometry(0.0011, 6, 4);

const KNOB_SWEEP = (270 * Math.PI) / 180;

/** Glowing droplets inside the chamber, mirrored from the shared simulation. */
function ChamberDrops({ visible }: { visible: boolean }) {
  const ref = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh) return;
    mesh.visible = visible;
    if (!visible) return;
    const drops = sim.drops;
    const n = Math.min(drops.length, 16);
    for (let i = 0; i < n; i++) {
      const d = drops[i];
      const ty = (d.y - PLATE_BOTTOM) / (PLATE_TOP - PLATE_BOTTOM);
      dummy.position.set((d.x / FIELD_W) * 0.05, 0.004 + ty * 0.044, Math.sin(d.id * 1.7) * 0.012);
      dummy.scale.setScalar(0.7 + (d.radius / 1e-6) * 0.6);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[dropGeometry, dropMaterial, 16]} frustumCulled={false} userData={{ noOutline: true }} />;
}

function Toggle({ angle }: { angle: number }) {
  return (
    <group userData={{ dynamic: true }}>
      <mesh material={metalChrome} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.009, 0.009, 0.006, 6]} />
      </mesh>
      <group rotation={[angle, 0, 0]}>
        <mesh material={metalChrome} position={[0, 0, 0.018]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.0028, 0.0042, 0.034, 12]} />
        </mesh>
        <mesh material={metalChrome} position={[0, 0, 0.036]}>
          <sphereGeometry args={[0.0042, 12, 8]} />
        </mesh>
      </group>
    </group>
  );
}

export interface MillikanProps extends ModelProps {
  interactive?: boolean;
}

export function MillikanApparatus({ modelUrl, interactive = false, ...props }: MillikanProps) {
  const glass = useGlass('#f2fbff');
  const power = useExperimentStore((s) => s.power);
  const voltage = useExperimentStore((s) => s.voltage);
  const polarity = useExperimentStore((s) => s.polarity);
  const knob = useRef<Group>(null);
  const knobAngle = useRef(0);

  useFrame((_, dt) => {
    const target = -(voltage / MILLIKAN.maxVoltage) * KNOB_SWEEP + KNOB_SWEEP / 2;
    knobAngle.current += (target - knobAngle.current) * (1 - Math.exp(-14 * dt));
    if (knob.current) knob.current.rotation.z = knobAngle.current;
  });

  const cable = useMemo(
    () => new TubeGeometry(new CatmullRomCurve3([new Vector3(0.16, 0.06, -FRONT), new Vector3(0.17, 0.03, -FRONT - 0.06), new Vector3(0.2, 0.006, -FRONT - 0.12), new Vector3(0.32, 0.006, -FRONT - 0.15)]), 24, 0.0045, 8, false),
    [],
  );
  const dialTicks = useMemo(() => Array.from({ length: 13 }, (_, i) => KNOB_SWEEP / 2 - (i / 12) * KNOB_SWEEP), []);
  const plateTex = reticlePlateTexture();
  const plateMat = useMemo(() => new MeshStandardMaterial({ map: plateTex, roughness: 0.6 }), [plateTex]);
  const reticleCount = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    // Ventilation slots on the sides (instanced).
    const d = new Object3D();
    let i = 0;
    for (const side of [-1, 1]) {
      for (let k = 0; k < 6; k++) {
        d.position.set(side * (W / 2 + 0.0005), 0.08 + k * 0.016, -0.04);
        d.rotation.set(0, Math.PI / 2, 0);
        d.updateMatrix();
        reticleCount.current?.setMatrixAt(i++, d.matrix);
      }
    }
    if (reticleCount.current) {
      reticleCount.current.instanceMatrix.needsUpdate = true;
      reticleCount.current.computeBoundingSphere();
    }
  }, []);

  const wrap = (id: string, el: JSX.Element, opts: { label: string; verb: string; onInteract?: () => void; onWheel?: (d: number) => void; onDrag?: (dx: number, dy: number) => void }) =>
    interactive ? (
      <Interactable id={id} label={opts.label} verb={opts.verb} onInteract={opts.onInteract} onWheel={opts.onWheel} onDrag={opts.onDrag}>
        {el}
      </Interactable>
    ) : (
      el
    );

  const exp = useExperimentStore.getState;
  const polarityLabel = polarity === 1 ? '+' : polarity === -1 ? '−' : '0';

  const knobEl = (
    <group position={[-0.13, 0.1, FRONT]}>
     <StaticBatch>
      {/* Dial plate with ticks. */}
      <mesh material={plasticWhite} position={[0, 0, 0.001]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.058, 0.058, 0.002, 40]} />
      </mesh>
      {dialTicks.map((a, i) => (
        <mesh key={i} material={plasticBlack} position={[Math.sin(-a) * 0.052, Math.cos(a) * 0.052, 0.0025]} rotation={[0, 0, a]}>
          <boxGeometry args={[0.0014, i % 3 === 0 ? 0.009 : 0.005, 0.001]} />
        </mesh>
      ))}
      <group ref={knob} position={[0, 0, 0.018]} userData={{ dynamic: true }}>
        <mesh material={plasticBlack} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.036, 0.04, 0.032, 32]} />
        </mesh>
        <mesh material={plastic('#2a2d31', 0.4)} position={[0, 0, 0.0165]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.033, 0.002, 32]} />
        </mesh>
        <mesh material={plasticWhite} position={[0, 0.022, 0.0172]}>
          <boxGeometry args={[0.004, 0.018, 0.001]} />
        </mesh>
      </group>
      <Text font={FONTS.semibold} fontSize={0.0085} color="#1f2328" position={[-0.046, -0.05, 0.003]} anchorX="center">
        0
      </Text>
      <Text font={FONTS.semibold} fontSize={0.0085} color="#1f2328" position={[0.046, -0.05, 0.003]} anchorX="center">
        600
      </Text>
      <Text font={FONTS.bold} fontSize={0.0095} color="#1f2328" position={[0, -0.072, 0.002]} anchorX="center" letterSpacing={0.08}>
        VOLTAGE
      </Text>
     </StaticBatch>
    </group>
  );

  const polarityEl = (
    <group position={[0.055, 0.1, FRONT + 0.001]}>
      <mesh material={metalDark} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.003, 24]} />
      </mesh>
      <Toggle angle={polarity === 1 ? -0.65 : polarity === -1 ? 0.65 : 0} />
      <Text font={FONTS.bold} fontSize={0.014} color="#1f2328" position={[0, 0.03, 0.002]} anchorX="center" anchorY="middle">
        +
      </Text>
      <Text font={FONTS.bold} fontSize={0.012} color="#1f2328" position={[0.03, 0, 0.002]} anchorX="center" anchorY="middle">
        0
      </Text>
      <Text font={FONTS.bold} fontSize={0.014} color="#1f2328" position={[0, -0.03, 0.002]} anchorX="center" anchorY="middle">
        −
      </Text>
      <Text font={FONTS.bold} fontSize={0.0075} color="#1f2328" position={[0, -0.05, 0.002]} anchorX="center" letterSpacing={0.06}>
        PLATE POLARITY
      </Text>
    </group>
  );

  const powerEl = (
    <group position={[0.16, 0.1, FRONT + 0.001]}>
      <mesh material={metalDark} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.016, 0.016, 0.003, 24]} />
      </mesh>
      <Toggle angle={power ? -0.6 : 0.6} />
      <Text font={FONTS.bold} fontSize={0.0085} color="#1f2328" position={[0, 0.03, 0.002]} anchorX="center" anchorY="middle">
        ON
      </Text>
      <Text font={FONTS.bold} fontSize={0.0085} color="#1f2328" position={[0, -0.03, 0.002]} anchorX="center" anchorY="middle">
        OFF
      </Text>
      <mesh material={power ? ledOn : ledOff} position={[0.03, 0.03, 0.002]} userData={{ dynamic: true }}>
        <sphereGeometry args={[0.0062, 16, 12]} />
      </mesh>
      <mesh material={metalChrome} position={[0.03, 0.03, 0.0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.0068, 0.0012, 6, 16]} />
      </mesh>
    </group>
  );

  const eyepieceEl = (
    // Mounted at the chamber's front-right, angled 35° toward the user's right and 25° up,
    // so the white tube reads in profile from the bench.
    <group position={[0.03, 0.296, 0.03]} rotation={[0, 0.62, 0]}>
     <group rotation={[(65 * Math.PI) / 180, 0, 0]}>
      <mesh material={plasticWhite} position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.019, 0.021, 0.2, 28]} />
      </mesh>
      <mesh material={plastic('#d9dde1', 0.45)} position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.0235, 0.0235, 0.022, 28]} />
      </mesh>
      <mesh material={plasticBlack} position={[0, 0.215, 0]}>
        <cylinderGeometry args={[0.0165, 0.017, 0.035, 24]} />
      </mesh>
      <mesh material={rubberBlack} position={[0, 0.236, 0]}>
        <cylinderGeometry args={[0.019, 0.0172, 0.012, 24]} />
      </mesh>
      {/* Focus knob on the tube. */}
      <mesh material={plasticBlack} position={[0.026, 0.06, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.011, 0.011, 0.012, 18]} />
      </mesh>
     </group>
    </group>
  );

  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      {/* Base. */}
      <RoundedBox args={[W, H, D]} radius={0.02} smoothness={4} position={[0, H / 2 + 0.006, 0]} material={plasticWhite} castShadow receiveShadow />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} material={rubberBlack} position={[sx * (W / 2 - 0.04), 0.003, sz * (D / 2 - 0.04)]}>
            <cylinderGeometry args={[0.014, 0.016, 0.006, 14]} />
          </mesh>
        )),
      )}
      <instancedMesh ref={reticleCount} args={[undefined, plasticBlack, 12]} userData={{ noOutline: true }}>
        <boxGeometry args={[0.12, 0.004, 0.001]} />
      </instancedMesh>
      {/* Front label panel. */}
      <group position={[0, 0.212, FRONT + 0.0065]}>
        <RoundedBox args={[0.38, 0.05, 0.004]} radius={0.0018} smoothness={2} material={plasticBlack} />
        <Text font={FONTS.bold} fontSize={0.0165} color="#ffffff" position={[0, 0, 0.0025]} anchorX="center" anchorY="middle" letterSpacing={0.045}>
          MILLIKAN OIL DROP APPARATUS
        </Text>
      </group>
      {/* LCD voltage readout. */}
      <group position={[-0.035, 0.155, FRONT + 0.006]}>
        <mesh material={plasticBlack}>
          <boxGeometry args={[0.07, 0.028, 0.004]} />
        </mesh>
        <mesh material={power ? lcdOn : lcdOff} position={[0, 0, 0.0021]} userData={{ dynamic: true }}>
          <planeGeometry args={[0.062, 0.021]} />
        </mesh>
        {power && (
          <Text font={FONTS.bold} fontSize={0.0145} color="#5dff9b" position={[0, 0, 0.0025]} anchorX="center" anchorY="middle" letterSpacing={0.05}>
            {`${String(voltage).padStart(3, '0')} V ${polarityLabel}`}
          </Text>
        )}
      </group>
      {wrap('millikan-voltage', knobEl, {
        label: `Voltage knob (${voltage} V)`,
        verb: 'Turn',
        onInteract: () => useGameStore.getState().showToast('Voltage knob', 'Scroll the mouse wheel, or hold E and drag'),
        onWheel: (dir) => {
          exp().nudgeVoltage(dir * 10);
          sounds.play('tick');
        },
        onDrag: (dx) => {
          const before = exp().voltage;
          exp().nudgeVoltage(dx * 1.2);
          if (Math.floor(before / 10) !== Math.floor(exp().voltage / 10)) sounds.play('tick', 0.6);
        },
      })}
      {wrap('millikan-polarity', polarityEl, {
        label: `Polarity switch (${polarityLabel})`,
        verb: 'Flip',
        onInteract: () => {
          exp().cyclePolarity();
          sounds.play('click');
        },
      })}
      {wrap('millikan-power', powerEl, {
        label: 'Power switch',
        verb: power ? 'Turn OFF' : 'Turn ON',
        onInteract: () => {
          exp().togglePower();
          sounds.play('click');
          const on = exp().power;
          sounds.setHum(on, 1);
          useGameStore.getState().logEvent(`Millikan apparatus switched ${on ? 'ON' : 'OFF'}.`);
          startSimLoop();
        },
      })}
      {/* Chamber assembly. */}
      <group position={[0, H + 0.006, -0.03]}>
        <mesh material={plasticBlack} position={[0, 0.01, 0]} castShadow>
          <cylinderGeometry args={[0.075, 0.078, 0.02, 36]} />
        </mesh>
        <mesh material={metalBrass} position={[0, 0.023, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.006, 36]} />
        </mesh>
        <group position={[0, 0.026, 0]}>
          <mesh material={glass} position={[0, 0.025, 0]} renderOrder={1}>
            <cylinderGeometry args={[0.05, 0.05, 0.05, 40, 1, true]} />
          </mesh>
          <ChamberDrops visible={power} />
        </group>
        <mesh material={metalBrass} position={[0, 0.079, 0]} castShadow>
          <cylinderGeometry args={[0.055, 0.055, 0.006, 36]} />
        </mesh>
        <mesh material={plasticBlack} position={[0, 0.09, 0]} castShadow>
          <cylinderGeometry args={[0.036, 0.04, 0.016, 28]} />
        </mesh>
        <mesh material={metalChrome} position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.006, 12]} />
        </mesh>
        {/* Plate contact posts. */}
        {[-1, 1].map((s) => (
          <mesh key={s} material={metalChrome} position={[s * 0.062, 0.05, 0]}>
            <cylinderGeometry args={[0.003, 0.003, 0.058, 8]} />
          </mesh>
        ))}
      </group>
      {/* Light source housing aimed at the chamber. */}
      <group position={[-0.15, H + 0.056, -0.03]}>
        <mesh material={plasticWhite} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.022, 0.024, 0.09, 24]} />
        </mesh>
        <mesh material={power ? lampOn : lampOff} position={[0.046, 0, 0]} rotation={[0, 0, Math.PI / 2]} userData={{ dynamic: true }}>
          <cylinderGeometry args={[0.016, 0.016, 0.003, 20]} />
        </mesh>
        <mesh material={plasticWhite} position={[-0.01, -0.03, 0]}>
          <boxGeometry args={[0.02, 0.04, 0.02]} />
        </mesh>
        {[-0.03, -0.015, 0.0].map((x) => (
          <mesh key={x} material={plasticBlack} position={[x, 0.0225, 0]}>
            <boxGeometry args={[0.006, 0.002, 0.03]} />
          </mesh>
        ))}
      </group>
      {/* Microscope tube support + tube. */}
      <mesh material={plasticWhite} position={[0.035, H + 0.026, 0.035]}>
        <boxGeometry args={[0.032, 0.05, 0.032]} />
      </mesh>
      {interactive ? (
        <Interactable
          id="millikan-eyepiece"
          label="Microscope eyepiece"
          verb="Look through"
          onInteract={() => {
            releaseLock();
            useGameStore.getState().openMicroscope({ kind: 'millikan' });
            exp().markStep('viewed');
            sounds.play('whoosh');
            startSimLoop();
          }}
        >
          {eyepieceEl}
        </Interactable>
      ) : (
        eyepieceEl
      )}
      {/* Reticle / scale plate. */}
      <group position={[0.165, H + 0.006, -0.06]}>
        <mesh material={metalDark} position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.06, 8]} />
        </mesh>
        <mesh material={plasticWhite} position={[0, 0.075, 0]} castShadow>
          <boxGeometry args={[0.056, 0.09, 0.006]} />
        </mesh>
        <mesh material={plateMat} position={[0, 0.075, 0.0032]}>
          <planeGeometry args={[0.048, 0.082]} />
        </mesh>
      </group>
      <mesh geometry={cable} material={rubberBlack} />
    </ModelOr>
  );
}
