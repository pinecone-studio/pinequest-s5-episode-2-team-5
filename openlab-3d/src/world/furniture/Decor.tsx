/**
 * Smaller fixtures used across rooms: safety posters (CanvasTexture planes), potted
 * plants, hall seating benches, lockers (instanced), notice boards, worktables,
 * wall displays, a wall clock and a waste bin. Dimensions are noted per component.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { CuboidCollider, CylinderCollider } from '@react-three/rapier';
import { BoxGeometry, InstancedMesh, MeshStandardMaterial, Object3D, type Group, type Texture } from 'three';
import { posterTexture, type PosterSpec } from '../../utils/textures';
import { plastic, paintedWhite, wood, plasticBlack, plasticDark } from '../../materials/plastic';
import { metalAluminum, metalBrushed, metalDark, metalPainted } from '../../materials/metal';
import { FONTS } from '../../utils/fonts';
import { rectFromBox, registerSurface } from '../../interaction/surfaces';
import { lazy } from '../../utils/lazy';

/** Wall poster 0.5 m × 0.7 m (A2-ish). Origin at wall surface, facing +z. */
export function Poster({ position, rotY = 0, spec, scale = 1 }: { position: [number, number, number]; rotY?: number; spec: PosterSpec; scale?: number }) {
  const material = useMemo(() => new MeshStandardMaterial({ map: posterTexture(spec), roughness: 0.8 }), [spec]);
  return (
    <group position={position} rotation={[0, rotY, 0]} scale={scale}>
      <mesh material={material} position={[0, 0, 0.004]}>
        <planeGeometry args={[0.5, 0.707]} />
      </mesh>
      <mesh material={metalAluminum} position={[0, 0, 0.001]}>
        <boxGeometry args={[0.52, 0.727, 0.004]} />
      </mesh>
    </group>
  );
}

const leafMat = new MeshStandardMaterial({ color: '#3f8f4a', roughness: 0.85, flatShading: true });
const leafMat2 = new MeshStandardMaterial({ color: '#5aa85a', roughness: 0.85, flatShading: true });

/** Potted plant: Ø 0.4 m planter, foliage to ~1.3 m. */
export function Plant({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const leaves = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * Math.PI * 2;
        return { x: Math.cos(a) * 0.14, z: Math.sin(a) * 0.14, y: 0.75 + (i % 3) * 0.14, r: 0.2 + (i % 2) * 0.05 };
      }),
    [],
  );
  return (
    <group position={position} scale={scale}>
      <mesh material={plastic('#e9e4da', 0.7)} position={[0, 0.22, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.44, 24]} />
      </mesh>
      <mesh material={plastic('#4a3a2c', 1)} position={[0, 0.43, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.02, 20]} />
      </mesh>
      <mesh material={metalDark} position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.015, 0.02, 0.4, 6]} />
      </mesh>
      {leaves.map((l, i) => (
        <mesh key={i} material={i % 2 ? leafMat : leafMat2} position={[l.x, l.y, l.z]} castShadow>
          <icosahedronGeometry args={[l.r, 0]} />
        </mesh>
      ))}
      <CylinderCollider args={[0.5, 0.22]} position={[0, 0.5, 0]} />
    </group>
  );
}

/** Hall seating bench: 1.6 m × 0.45 m, seat at 0.45 m, wooden slats on a steel frame. */
export function HallBench({ position, rotY = 0 }: { position: [number, number, number]; rotY?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {[-0.15, -0.05, 0.05, 0.15].map((z) => (
        <mesh key={z} material={wood} position={[0, 0.45, z]} castShadow receiveShadow>
          <boxGeometry args={[1.6, 0.03, 0.085]} />
        </mesh>
      ))}
      {[-0.7, 0.7].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh material={metalDark} position={[0, 0.22, 0]}>
            <boxGeometry args={[0.04, 0.44, 0.4]} />
          </mesh>
        </group>
      ))}
      <CuboidCollider args={[0.8, 0.24, 0.22]} position={[0, 0.24, 0]} />
    </group>
  );
}

const lockerGeo = lazy(() => new BoxGeometry(0.44, 1.85, 0.45));
const lockerVentGeo = lazy(() => new BoxGeometry(0.22, 0.008, 0.004));
const lockerHandleGeo = lazy(() => new BoxGeometry(0.02, 0.1, 0.02));

/** A row of steel lockers (0.45 m wide × 1.85 m tall × 0.45 m deep each), instanced. Origin at wall. */
export function Lockers({ position, rotY = 0, count = 8 }: { position: [number, number, number]; rotY?: number; count?: number }) {
  const bodies = useRef<InstancedMesh>(null);
  const vents = useRef<InstancedMesh>(null);
  const handles = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const d = new Object3D();
    let v = 0;
    for (let i = 0; i < count; i++) {
      const x = (i - (count - 1) / 2) * 0.45;
      d.position.set(x, 0.925 + 0.06, 0.225);
      d.updateMatrix();
      bodies.current?.setMatrixAt(i, d.matrix);
      d.position.set(x + 0.15, 1.05, 0.452);
      d.updateMatrix();
      handles.current?.setMatrixAt(i, d.matrix);
      for (let k = 0; k < 4; k++) {
        d.position.set(x, 1.6 + k * 0.03, 0.452);
        d.updateMatrix();
        vents.current?.setMatrixAt(v++, d.matrix);
      }
    }
    for (const m of [bodies.current, vents.current, handles.current]) {
      if (!m) continue;
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }, [count]);
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <instancedMesh ref={bodies} args={[lockerGeo(), plastic('#5b7fb6', 0.45), count]} castShadow receiveShadow />
      <instancedMesh ref={vents} args={[lockerVentGeo(), plasticDark, count * 4]} />
      <instancedMesh ref={handles} args={[lockerHandleGeo(), metalBrushed, count]} />
      <mesh material={plasticDark} position={[0, 0.03, 0.22]}>
        <boxGeometry args={[count * 0.45, 0.06, 0.44]} />
      </mesh>
      <CuboidCollider args={[(count * 0.45) / 2, 0.95, 0.23]} position={[0, 0.95, 0.23]} />
    </group>
  );
}

/** Cork notice board 1.4 m × 0.9 m with pinned notes. Origin at wall. */
export function NoticeBoard({ position, rotY = 0, title = 'NOTICES' }: { position: [number, number, number]; rotY?: number; title?: string }) {
  const notes = useMemo(
    () => [
      { x: -0.45, y: 0.12, c: '#fff7a8', r: 0.05 },
      { x: -0.1, y: 0.2, c: '#ffffff', r: -0.04 },
      { x: 0.3, y: 0.1, c: '#bde3ff', r: 0.03 },
      { x: -0.35, y: -0.22, c: '#ffd1dc', r: -0.06 },
      { x: 0.15, y: -0.2, c: '#ffffff', r: 0.02 },
      { x: 0.48, y: -0.18, c: '#c9f2c7', r: -0.03 },
    ],
    [],
  );
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh material={wood} position={[0, 0, 0.01]}>
        <boxGeometry args={[1.44, 0.94, 0.02]} />
      </mesh>
      <mesh material={plastic('#c79a61', 0.95)} position={[0, 0, 0.021]}>
        <planeGeometry args={[1.36, 0.86]} />
      </mesh>
      {notes.map((n, i) => (
        <group key={i} position={[n.x, n.y, 0.023]} rotation={[0, 0, n.r]}>
          <mesh material={plastic(n.c, 0.9)}>
            <planeGeometry args={[0.26, 0.3]} />
          </mesh>
          {[0.07, 0.03, -0.01, -0.05].map((ly) => (
            <mesh key={ly} material={plastic('#9aa3ad', 0.9)} position={[0, ly, 0.001]}>
              <planeGeometry args={[0.18, 0.012]} />
            </mesh>
          ))}
          <mesh material={plastic('#dc2626', 0.4)} position={[0, 0.13, 0.006]}>
            <sphereGeometry args={[0.01, 8, 6]} />
          </mesh>
        </group>
      ))}
      <Text font={FONTS.bold} fontSize={0.06} color="#1f2328" position={[0, 0.54, 0.02]} anchorX="center">
        {title}
      </Text>
    </group>
  );
}

/** Simple worktable with steel legs. Registers its top as a placement surface. */
export function Table({ id, position, rotY = 0, width = 1.6, depth = 0.8, height = 0.86, top = '#d6d9dc' }: { id: string; position: [number, number]; rotY?: number; width?: number; depth?: number; height?: number; top?: string }) {
  const [x, z] = position;
  useLayoutEffect(() => registerSurface({ id, ...rectFromBox(x, z, width, depth, rotY), y: height }), [id, x, z, width, depth, height, rotY]);
  return (
    <group position={[x, 0, z]} rotation={[0, rotY, 0]}>
      <mesh material={plastic(top, 0.55)} position={[0, height - 0.015, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, 0.03, depth]} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} material={metalPainted} position={[sx * (width / 2 - 0.05), (height - 0.03) / 2, sz * (depth / 2 - 0.05)]} castShadow>
            <boxGeometry args={[0.04, height - 0.03, 0.04]} />
          </mesh>
        )),
      )}
      <mesh material={metalPainted} position={[0, 0.15, 0]}>
        <boxGeometry args={[width - 0.1, 0.02, depth - 0.1]} />
      </mesh>
      <CuboidCollider args={[width / 2, height / 2, depth / 2]} position={[0, height / 2, 0]} />
    </group>
  );
}

/** Wall-mounted display 2.4 m × 1.4 m showing a texture (emissive). Origin at wall. */
export function WallDisplay({ position, rotY = 0, texture, width = 2.4, height = 1.35 }: { position: [number, number, number]; rotY?: number; texture: Texture; width?: number; height?: number }) {
  const screen = useMemo(() => new MeshStandardMaterial({ color: '#000', emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: 1.1, toneMapped: false }), [texture]);
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh material={plasticBlack} position={[0, 0, 0.03]}>
        <boxGeometry args={[width + 0.06, height + 0.06, 0.05]} />
      </mesh>
      <mesh material={screen} position={[0, 0, 0.056]} userData={{ noOutline: true }}>
        <planeGeometry args={[width, height]} />
      </mesh>
    </group>
  );
}

/** Wall clock Ø 0.32 m showing local time. Origin at wall. */
export function WallClock({ position, rotY = 0 }: { position: [number, number, number]; rotY?: number }) {
  const hour = useRef<Group>(null);
  const minute = useRef<Group>(null);
  const second = useRef<Group>(null);
  useFrame(() => {
    const now = new Date();
    const s = now.getSeconds() + now.getMilliseconds() / 1000;
    const m = now.getMinutes() + s / 60;
    const h = (now.getHours() % 12) + m / 60;
    if (second.current) second.current.rotation.z = -(s / 60) * Math.PI * 2;
    if (minute.current) minute.current.rotation.z = -(m / 60) * Math.PI * 2;
    if (hour.current) hour.current.rotation.z = -(h / 12) * Math.PI * 2;
  });
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh material={paintedWhite} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.02]}>
        <cylinderGeometry args={[0.16, 0.16, 0.04, 40]} />
      </mesh>
      <mesh material={metalDark} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.02]}>
        <torusGeometry args={[0.16, 0.012, 8, 40]} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => (
        <mesh key={i} material={plasticBlack} position={[Math.sin((i / 12) * Math.PI * 2) * 0.135, Math.cos((i / 12) * Math.PI * 2) * 0.135, 0.041]} rotation={[0, 0, -(i / 12) * Math.PI * 2]}>
          <boxGeometry args={[0.008, i % 3 === 0 ? 0.03 : 0.016, 0.002]} />
        </mesh>
      ))}
      <group ref={hour} position={[0, 0, 0.044]} userData={{ dynamic: true }}>
        <mesh material={plasticBlack} position={[0, 0.04, 0]}>
          <boxGeometry args={[0.012, 0.08, 0.003]} />
        </mesh>
      </group>
      <group ref={minute} position={[0, 0, 0.047]} userData={{ dynamic: true }}>
        <mesh material={plasticBlack} position={[0, 0.058, 0]}>
          <boxGeometry args={[0.008, 0.116, 0.003]} />
        </mesh>
      </group>
      <group ref={second} position={[0, 0, 0.05]} userData={{ dynamic: true }}>
        <mesh material={plastic('#dc2626', 0.4)} position={[0, 0.05, 0]}>
          <boxGeometry args={[0.003, 0.12, 0.002]} />
        </mesh>
      </group>
    </group>
  );
}

/** Pedal waste bin Ø 0.3 m × 0.5 m. */
export function WasteBin({ position, color = '#9ca3af' }: { position: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      <mesh material={plastic(color, 0.5)} position={[0, 0.25, 0]} castShadow>
        <cylinderGeometry args={[0.15, 0.13, 0.5, 20]} />
      </mesh>
      <mesh material={metalBrushed} position={[0, 0.505, 0]}>
        <cylinderGeometry args={[0.152, 0.152, 0.02, 20]} />
      </mesh>
      <CylinderCollider args={[0.26, 0.16]} position={[0, 0.26, 0]} />
    </group>
  );
}

/** Hanging ceiling sign with a room direction (double-sided). */
export function HangingSign({ position, rotY = 0, text, width = 1.6 }: { position: [number, number, number]; rotY?: number; text: string; width?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} material={metalDark} position={[(x * width) / 1.6, 0.25, 0]}>
          <cylinderGeometry args={[0.004, 0.004, 0.5, 6]} />
        </mesh>
      ))}
      <mesh material={plastic('#2b3036', 0.5)}>
        <boxGeometry args={[width, 0.26, 0.03]} />
      </mesh>
      {[1, -1].map((side) => (
        <Text key={side} font={FONTS.bold} fontSize={0.1} color="#ffffff" position={[0, 0, side * 0.017]} rotation={[0, side === 1 ? 0 : Math.PI, 0]} anchorX="center" anchorY="middle" letterSpacing={0.04}>
          {text}
        </Text>
      ))}
    </group>
  );
}

/** Big 3D wordmark on a wall. */
export function WallLogo({ position, rotY = 0 }: { position: [number, number, number]; rotY?: number }) {
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      <mesh material={plastic('#F5B800', 0.5)} position={[-1.05, 0, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 40]} />
      </mesh>
      <Text font={FONTS.display} fontSize={0.2} color="#ffffff" position={[-1.05, -0.01, 0.045]} anchorX="center" anchorY="middle">
        OL
      </Text>
      <Text font={FONTS.display} fontSize={0.34} color="#2b3036" position={[-0.72, 0.05, 0.03]} anchorX="left" anchorY="middle">
        OpenLab
      </Text>
      <Text font={FONTS.semibold} fontSize={0.11} color="#6b7280" position={[-0.71, -0.2, 0.03]} anchorX="left" anchorY="middle" letterSpacing={0.18}>
        SCIENCE FACILITY
      </Text>
    </group>
  );
}

