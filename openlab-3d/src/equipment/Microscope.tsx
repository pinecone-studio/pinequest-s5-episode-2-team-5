/**
 * Compound microscope, ~360 mm tall (origin = bottom center, user side = +z):
 *  - horseshoe base 160 × 200 × 25 mm (ExtrudeGeometry)
 *  - curved C-arm (extruded side profile) rising from a pillar
 *  - 130 × 130 mm mechanical stage at 130 mm with two spring clips and a slide
 *  - revolving nosepiece with 4×, 10×, 40× objectives (colored bands)
 *  - 45° tilted eyepiece tube with a black eyepiece
 *  - coarse (Ø 46 mm) and fine (Ø 26 mm) focus knobs on both sides; they rotate with `focus`
 *  - LED illuminator in the base that glows while in use
 * <MicroscopeLow> is the simplified LOD version used at a distance.
 */
import { useMemo } from 'react';
import { ExtrudeGeometry, MeshStandardMaterial, Shape } from 'three';
import { plastic, plasticBlack, plasticDark } from '../materials/plastic';
import { metalChrome, metalBrushed } from '../materials/metal';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';
import { StaticBatch } from '../world/StaticBatch';
import { windowGlass } from '../materials/glass';

const enamel = plastic('#eef0ee', 0.45);
const lampOn = new MeshStandardMaterial({ color: '#000', emissive: '#fff6d8', emissiveIntensity: 3, toneMapped: false });
const lampOff = new MeshStandardMaterial({ color: '#d9dde0', roughness: 0.2 });

/** Horseshoe: a rounded U opening toward the user (+z). Extruded 25 mm, lying flat. */
export const horseshoeGeometry = lazy(() => {
  const s = new Shape();
  const w = 0.08;
  s.moveTo(-w, 0.05);
  s.lineTo(-w, -0.06);
  s.absarc(0, -0.06, w, Math.PI, 0, false);
  s.lineTo(w, 0.05);
  s.quadraticCurveTo(w, 0.1, 0.045, 0.1);
  s.lineTo(0.03, 0.1);
  s.quadraticCurveTo(0.025, 0.04, 0, 0.035);
  s.quadraticCurveTo(-0.025, 0.04, -0.03, 0.1);
  s.lineTo(-0.045, 0.1);
  s.quadraticCurveTo(-w, 0.1, -w, 0.05);
  const g = new ExtrudeGeometry(s, { depth: 0.025, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 18 });
  // Shape is drawn in XY with +y toward the user; lay it flat so +y → +z.
  g.rotateX(Math.PI / 2);
  g.translate(0, 0.029, 0.0);
  return g;
});

/** C-shaped arm in side view (YZ plane), 34 mm wide. */
export const armGeometry = lazy(() => {
  const s = new Shape();
  // Points as (z, y) in the side view with z toward the user.
  s.moveTo(-0.07, 0.05);
  s.lineTo(-0.035, 0.05);
  s.quadraticCurveTo(-0.03, 0.16, -0.03, 0.2);
  s.quadraticCurveTo(-0.03, 0.245, 0.0, 0.255);
  s.lineTo(0.0, 0.29);
  s.quadraticCurveTo(-0.06, 0.29, -0.07, 0.22);
  s.quadraticCurveTo(-0.08, 0.14, -0.07, 0.05);
  const g = new ExtrudeGeometry(s, { depth: 0.034, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 2, curveSegments: 16 });
  // Extruded along +z; rotate so the shape plane becomes ZY and the extrusion runs along x.
  g.rotateY(-Math.PI / 2);
  g.translate(0.017, 0, 0);
  return g;
});

export interface MicroscopeProps extends ModelProps {
  /** Focus position 0..1 — drives knob rotation and stage height. */
  focus?: number;
  lampOn?: boolean;
  /** Index of the objective in the light path (0 = 4×, 1 = 10×, 2 = 40×). */
  objective?: number;
}

const OBJECTIVES = [
  { len: 0.026, band: '#d93025' },
  { len: 0.034, band: '#f5b800' },
  { len: 0.042, band: '#1a73e8' },
];

export function Microscope({ modelUrl, focus = 0.5, lampOn: lit = false, objective = 0, ...props }: MicroscopeProps) {
  const knobAngle = focus * Math.PI * 4;
  const stageY = 0.125 + focus * 0.012;
  const nosepieceRot = useMemo(() => -objective * ((Math.PI * 2) / 3), [objective]);
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      <mesh geometry={horseshoeGeometry()} material={plasticDark} castShadow receiveShadow />
      {/* Illuminator. */}
      <mesh material={enamel} position={[0, 0.037, 0.0]}>
        <cylinderGeometry args={[0.022, 0.026, 0.016, 24]} />
      </mesh>
      <mesh material={lit ? lampOn : lampOff} position={[0, 0.046, 0]} userData={{ dynamic: true }}>
        <cylinderGeometry args={[0.014, 0.014, 0.003, 20]} />
      </mesh>
      {/* Pillar and arm. */}
      <mesh material={enamel} position={[0, 0.045, -0.06]} castShadow>
        <boxGeometry args={[0.05, 0.035, 0.04]} />
      </mesh>
      <mesh geometry={armGeometry()} material={enamel} castShadow />
      {/* Focus knobs on both sides. */}
      {[-1, 1].map((side) => (
        <group key={side} position={[side * 0.026, 0.1, -0.052]} rotation={[knobAngle * side, 0, 0]} userData={{ dynamic: true }}>
          <StaticBatch>
          <mesh material={plasticBlack} rotation={[0, 0, Math.PI / 2]} position={[side * 0.006, 0, 0]}>
            <cylinderGeometry args={[0.023, 0.023, 0.012, 24]} />
          </mesh>
          <mesh material={plastic('#e5e7eb', 0.5)} position={[side * 0.0125, 0.016, 0]}>
            <boxGeometry args={[0.001, 0.008, 0.003]} />
          </mesh>
          <mesh material={plasticBlack} rotation={[0, 0, Math.PI / 2]} position={[side * 0.018, 0, 0]}>
            <cylinderGeometry args={[0.013, 0.013, 0.012, 20]} />
          </mesh>
          <mesh material={metalChrome} rotation={[0, 0, Math.PI / 2]} position={[side * 0.0245, 0, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.002, 12]} />
          </mesh>
          </StaticBatch>
        </group>
      ))}
      {/* Stage with clips and a slide. */}
      <group position={[0, stageY, 0]} userData={{ dynamic: true }}>
       <StaticBatch>
        <mesh material={plasticBlack} castShadow receiveShadow>
          <boxGeometry args={[0.13, 0.01, 0.12]} />
        </mesh>
        <mesh material={plasticDark} position={[0, 0.0051, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.011, 20]} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.035, 0.0058, -0.03]}>
            <mesh material={metalChrome} position={[0, 0.002, 0.018]}>
              <boxGeometry args={[0.008, 0.0012, 0.04]} />
            </mesh>
            <mesh material={metalChrome}>
              <cylinderGeometry args={[0.004, 0.004, 0.006, 10]} />
            </mesh>
          </group>
        ))}
        <mesh material={windowGlass} position={[0, 0.0062, 0.0]} renderOrder={2}>
          <boxGeometry args={[0.076, 0.0012, 0.026]} />
        </mesh>
        <mesh material={plastic('#c084fc', 0.6)} position={[0, 0.0066, 0.0]}>
          <boxGeometry args={[0.012, 0.0004, 0.012]} />
        </mesh>
        <mesh material={metalBrushed} position={[0, -0.015, 0]}>
          <cylinderGeometry args={[0.016, 0.012, 0.02, 20]} />
        </mesh>
       </StaticBatch>
      </group>
      {/* Head: body tube, nosepiece, objectives. */}
      <mesh material={enamel} position={[0, 0.262, 0.0]} castShadow>
        <boxGeometry args={[0.05, 0.04, 0.06]} />
      </mesh>
      <group position={[0, 0.232, 0.0]} rotation={[0, nosepieceRot, 0]} userData={{ dynamic: true }}>
       <StaticBatch>
        <mesh material={metalChrome}>
          <cylinderGeometry args={[0.026, 0.03, 0.016, 28]} />
        </mesh>
        {OBJECTIVES.map((o, i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <group key={i} position={[Math.sin(a) * 0.016, -0.008, Math.cos(a) * 0.016]} rotation={[-Math.cos(a) * 0.22, 0, Math.sin(a) * 0.22]}>
              <mesh material={metalChrome} position={[0, -o.len / 2, 0]}>
                <cylinderGeometry args={[0.0075, 0.0095, o.len, 16]} />
              </mesh>
              <mesh material={plastic(o.band, 0.4)} position={[0, -o.len * 0.35, 0]}>
                <cylinderGeometry args={[0.0092, 0.0092, 0.003, 16]} />
              </mesh>
              <mesh material={plasticBlack} position={[0, -o.len - 0.001, 0]}>
                <cylinderGeometry args={[0.004, 0.0045, 0.003, 12]} />
              </mesh>
            </group>
          );
        })}
       </StaticBatch>
      </group>
      {/* Tilted eyepiece tube. */}
      <group position={[0, 0.28, 0.0]} rotation={[Math.PI / 4, 0, 0]}>
        <mesh material={enamel} position={[0, 0.045, 0]} castShadow>
          <cylinderGeometry args={[0.014, 0.017, 0.09, 20]} />
        </mesh>
        <mesh material={plasticBlack} position={[0, 0.1, 0]}>
          <cylinderGeometry args={[0.0125, 0.0125, 0.03, 20]} />
        </mesh>
        <mesh material={plastic('#1a1c1f', 0.8)} position={[0, 0.118, 0]}>
          <torusGeometry args={[0.011, 0.003, 8, 20]} />
        </mesh>
      </group>
    </ModelOr>
  );
}

/** Low-detail stand-in (6 meshes) for distant LOD levels. */
export function MicroscopeLow(props: ModelProps) {
  return (
    <group {...props}>
      <StaticBatch>
      <mesh geometry={horseshoeGeometry()} material={plasticDark} />
      <mesh geometry={armGeometry()} material={enamel} />
      <mesh material={plasticBlack} position={[0, 0.13, 0]}>
        <boxGeometry args={[0.13, 0.01, 0.12]} />
      </mesh>
      <mesh material={enamel} position={[0, 0.262, 0]}>
        <boxGeometry args={[0.05, 0.04, 0.06]} />
      </mesh>
      <mesh material={metalChrome} position={[0, 0.215, 0]}>
        <cylinderGeometry args={[0.02, 0.028, 0.04, 10]} />
      </mesh>
      <mesh material={enamel} position={[0, 0.33, 0.05]} rotation={[Math.PI / 4, 0, 0]}>
        <cylinderGeometry args={[0.014, 0.016, 0.12, 10]} />
      </mesh>
      </StaticBatch>
    </group>
  );
}
