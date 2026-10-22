/**
 * Laptop: 320 × 16 × 220 mm silver-gray chassis, an instanced keyboard (66 keys), a
 * trackpad, and a lid hinged at the back edge (opened 105°). The 290 × 180 mm screen is
 * an emissive plane with a CanvasTexture desktop (generic blue gradient, original icons).
 * `screenAnchor` receives an Object3D at the screen center, facing the viewer.
 */
import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react';
import { RoundedBox } from '@react-three/drei';
import { BoxGeometry, CanvasTexture, InstancedMesh, MeshStandardMaterial, Object3D, SRGBColorSpace } from 'three';
import { metalAluminum } from '../materials/metal';
import { plastic, plasticBlack, glossyBlack } from '../materials/plastic';
import { drawDesktop, type DesktopState } from '../utils/textures';
import { lazy } from '../utils/lazy';
import { ModelOr, type ModelProps } from './ModelOr';

const W = 0.32;
const D = 0.22;
const BASE_T = 0.016;
const LID_T = 0.01;
const keyGeometry = lazy(() => new BoxGeometry(1, 1, 1));
const keyMaterial = new MeshStandardMaterial({ color: '#2a2d31', roughness: 0.6 });

function Keyboard() {
  const ref = useRef<InstancedMesh>(null);
  const layout = useMemo(() => {
    const keys: { x: number; z: number; w: number }[] = [];
    const pitch = 0.0195;
    const rows = [13, 13, 12, 11];
    rows.forEach((n, r) => {
      const rowW = n * pitch;
      for (let i = 0; i < n; i++) keys.push({ x: -rowW / 2 + pitch * (i + 0.5) + r * 0.003, z: -0.075 + r * pitch, w: 0.016 });
    });
    // Bottom row: modifiers + space bar.
    keys.push({ x: -0.1, z: -0.075 + 4 * pitch, w: 0.024 }, { x: -0.072, z: -0.075 + 4 * pitch, w: 0.024 });
    keys.push({ x: 0, z: -0.075 + 4 * pitch, w: 0.11 });
    keys.push({ x: 0.072, z: -0.075 + 4 * pitch, w: 0.024 }, { x: 0.1, z: -0.075 + 4 * pitch, w: 0.024 });
    return keys;
  }, []);
  useLayoutEffect(() => {
    const d = new Object3D();
    layout.forEach((k, i) => {
      d.position.set(k.x, BASE_T + 0.0012, k.z);
      d.scale.set(k.w, 0.0024, 0.016);
      d.updateMatrix();
      ref.current?.setMatrixAt(i, d.matrix);
    });
    if (ref.current) {
      ref.current.instanceMatrix.needsUpdate = true;
      ref.current.computeBoundingSphere();
    }
  }, [layout]);
  return <instancedMesh ref={ref} args={[keyGeometry(), keyMaterial, layout.length]} userData={{ noOutline: true }} />;
}

export interface LaptopProps extends ModelProps {
  desktop?: DesktopState;
  lidAngle?: number;
  screenAnchor?: MutableRefObject<Object3D | null>;
}

export function Laptop({ modelUrl, desktop = { measurements: 0, estimate: null }, lidAngle = 105, screenAnchor, ...props }: LaptopProps) {
  const { texture, canvas } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 640;
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    return { texture: t, canvas: c };
  }, []);
  useEffect(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawDesktop(ctx, canvas.width, canvas.height, desktop);
    texture.needsUpdate = true;
  }, [canvas, texture, desktop]);
  useEffect(() => () => texture.dispose(), [texture]);
  const screenMat = useMemo(() => new MeshStandardMaterial({ color: '#000000', emissive: '#ffffff', emissiveMap: texture, emissiveIntensity: 1.25, roughness: 0.25, toneMapped: false }), [texture]);
  const anchor = useRef<Object3D>(null);
  useEffect(() => {
    if (screenAnchor) screenAnchor.current = anchor.current;
  }, [screenAnchor]);
  const a = (-lidAngle * Math.PI) / 180;
  return (
    <ModelOr modelUrl={modelUrl} {...props}>
      {/* Base. */}
      <RoundedBox args={[W, BASE_T, D]} radius={0.004} smoothness={2} position={[0, BASE_T / 2, 0]} material={metalAluminum} castShadow receiveShadow />
      <mesh material={plasticBlack} position={[0, BASE_T + 0.0002, -0.035]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.28, 0.105]} />
      </mesh>
      <Keyboard />
      <mesh material={plastic('#b9bec4', 0.35)} position={[0, BASE_T + 0.0003, 0.068]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.105, 0.065]} />
      </mesh>
      {/* Hinged lid. */}
      <group position={[0, BASE_T, -D / 2 + 0.004]} rotation={[a, 0, 0]}>
        <RoundedBox args={[W, LID_T, D]} radius={0.004} smoothness={2} position={[0, LID_T / 2, D / 2]} material={metalAluminum} castShadow />
        <mesh material={glossyBlack} position={[0, -0.0004, D / 2]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[W - 0.01, D - 0.01]} />
        </mesh>
        <mesh material={screenMat} position={[0, -0.0008, D / 2 + 0.004]} rotation={[Math.PI / 2, 0, 0]} userData={{ noOutline: true }}>
          <planeGeometry args={[0.29, 0.181]} />
        </mesh>
        {/* Screen center, facing out of the screen (local -y). */}
        <object3D ref={anchor} position={[0, -0.001, D / 2 + 0.004]} rotation={[Math.PI / 2, 0, 0]} />
      </group>
    </ModelOr>
  );
}
