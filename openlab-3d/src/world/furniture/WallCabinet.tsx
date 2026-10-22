/**
 * Upper wall cabinet with glass doors: 1.2 m × 0.75 m × 0.35 m (default), mounted with
 * its bottom at 1.45 m. Two hinged aluminum-framed glass doors, two shelves, and
 * instanced glassware inside.
 */
import { useLayoutEffect, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { CuboidCollider } from '@react-three/rapier';
import { InstancedMesh, LatheGeometry, Object3D, Vector2, type Group } from 'three';
import { paintedWhite } from '../../materials/plastic';
import { metalAluminum } from '../../materials/metal';
import { decorGlass, windowGlass } from '../../materials/glass';
import { Interactable } from '../../interaction/Interactable';
import { sounds } from '../../utils/sounds';
import { lazy } from '../../utils/lazy';
import { StaticBatch } from '../StaticBatch';

/** Simple 250 mL beaker silhouette for decorative stock (open top). */
export const stockBeakerGeometry = lazy(() => {
  const pts = [new Vector2(0, 0), new Vector2(0.034, 0), new Vector2(0.036, 0.004), new Vector2(0.036, 0.092), new Vector2(0.039, 0.096)];
  return new LatheGeometry(pts, 20);
});
export const stockFlaskGeometry = lazy(() => {
  const pts = [new Vector2(0, 0), new Vector2(0.04, 0), new Vector2(0.042, 0.006), new Vector2(0.03, 0.06), new Vector2(0.013, 0.1), new Vector2(0.013, 0.13), new Vector2(0.016, 0.135)];
  return new LatheGeometry(pts, 20);
});

function GlassDoor({ id, width, height, hinge }: { id: string; width: number; height: number; hinge: -1 | 1 }) {
  const pivot = useRef<Group>(null);
  const [open, setOpen] = useState(false);
  const amount = useRef(0);
  useFrame((_, dt) => {
    const target = open ? 1 : 0;
    if (amount.current === target || !pivot.current) return;
    amount.current += Math.sign(target - amount.current) * Math.min(Math.abs(target - amount.current), dt * 2.4);
    const k = amount.current * amount.current * (3 - 2 * amount.current);
    pivot.current.rotation.y = -hinge * k * ((105 * Math.PI) / 180);
  });
  const hx = (hinge * width) / 2;
  const f = 0.035;
  return (
    <Interactable id={id} label="Glass cabinet door" verb={open ? 'Close' : 'Open'} onInteract={() => { setOpen((o) => !o); sounds.play('click', 0.4); }}>
      <group position={[hx, 0, 0]}>
        <group ref={pivot}>
          <StaticBatch>
          <group position={[-hx, 0, 0]}>
            <mesh material={metalAluminum} position={[0, height / 2 - f / 2, 0]}>
              <boxGeometry args={[width - 0.01, f, 0.02]} />
            </mesh>
            <mesh material={metalAluminum} position={[0, -height / 2 + f / 2, 0]}>
              <boxGeometry args={[width - 0.01, f, 0.02]} />
            </mesh>
            <mesh material={metalAluminum} position={[-width / 2 + f / 2, 0, 0]}>
              <boxGeometry args={[f, height, 0.02]} />
            </mesh>
            <mesh material={metalAluminum} position={[width / 2 - f / 2, 0, 0]}>
              <boxGeometry args={[f, height, 0.02]} />
            </mesh>
            <mesh material={windowGlass} renderOrder={2}>
              <boxGeometry args={[width - f * 2, height - f * 2, 0.006]} />
            </mesh>
            <mesh material={metalAluminum} position={[-hinge * (width / 2 - 0.06), -height * 0.2, 0.018]}>
              <boxGeometry args={[0.015, 0.12, 0.02]} />
            </mesh>
          </group>
          </StaticBatch>
        </group>
      </group>
    </Interactable>
  );
}

export interface WallCabinetProps {
  id: string;
  position: [number, number, number];
  rotY?: number;
  width?: number;
  height?: number;
  depth?: number;
}

export function WallCabinet({ id, position, rotY = 0, width = 1.2, height = 0.75, depth = 0.35 }: WallCabinetProps) {
  // Decorative stock uses alpha glass: transmission would re-render the whole room for it.
  const glass = decorGlass('#eef8fb');
  const stock = useRef<InstancedMesh>(null);
  const count = Math.max(2, Math.floor(width / 0.12)) * 2;
  useLayoutEffect(() => {
    const d = new Object3D();
    const perShelf = count / 2;
    for (let i = 0; i < count; i++) {
      const shelf = i < perShelf ? 0 : 1;
      const j = i % perShelf;
      d.position.set(-width / 2 + 0.09 + (j * (width - 0.18)) / Math.max(1, perShelf - 1), 0.02 + shelf * (height / 2 - 0.01), -0.02 + ((j % 2) * 0.06 - 0.03));
      d.scale.setScalar(0.85 + ((i * 7) % 4) * 0.08);
      d.updateMatrix();
      stock.current?.setMatrixAt(i, d.matrix);
    }
    if (stock.current) {
      stock.current.instanceMatrix.needsUpdate = true;
      stock.current.computeBoundingSphere();
    }
  }, [count, width, height]);
  const t = 0.018;
  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Carcass: back, sides, top, bottom, middle shelf. Origin = bottom-center of the front. */}
      <group position={[0, 0, -depth / 2]}>
        <mesh material={paintedWhite} position={[0, height / 2, -depth / 2 + t / 2]} receiveShadow>
          <boxGeometry args={[width, height, t]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} material={paintedWhite} position={[(s * (width - t)) / 2, height / 2, 0]} castShadow>
            <boxGeometry args={[t, height, depth]} />
          </mesh>
        ))}
        <mesh material={paintedWhite} position={[0, height - t / 2, 0]} castShadow>
          <boxGeometry args={[width, t, depth]} />
        </mesh>
        <mesh material={paintedWhite} position={[0, t / 2, 0]} receiveShadow>
          <boxGeometry args={[width, t, depth]} />
        </mesh>
        <mesh material={paintedWhite} position={[0, height / 2, 0]} receiveShadow>
          <boxGeometry args={[width - t * 2, t * 0.8, depth - t]} />
        </mesh>
        <instancedMesh ref={stock} args={[stockBeakerGeometry(), glass, count]} position={[0, t, 0]} userData={{ noOutline: true }} />
      </group>
      <group position={[0, height / 2, 0.012]}>
        <group position={[-width / 4, 0, 0]}>
          <GlassDoor id={`${id}-l`} width={width / 2} height={height} hinge={-1} />
        </group>
        <group position={[width / 4, 0, 0]}>
          <GlassDoor id={`${id}-r`} width={width / 2} height={height} hinge={1} />
        </group>
      </group>
      <CuboidCollider args={[width / 2, height / 2, depth / 2]} position={[0, height / 2, -depth / 2]} />
    </group>
  );
}
