/**
 * Outdoor backdrop seen through the windows: a gradient sky dome (radius 150 m),
 * distant low-poly trees (instanced) and a few trees in the garden south of the lab.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import { BackSide, Color, ConeGeometry, CylinderGeometry, InstancedMesh, MeshStandardMaterial, Object3D, ShaderMaterial, SphereGeometry } from 'three';

const skyMaterial = new ShaderMaterial({
  side: BackSide,
  depthWrite: false,
  uniforms: {
    top: { value: new Color('#6fb1ea') },
    horizon: { value: new Color('#e6f2fb') },
    bottom: { value: new Color('#cfe0c8') },
  },
  vertexShader: /* glsl */ `
    varying vec3 vDir;
    void main() {
      vDir = normalize(position);
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom;
    varying vec3 vDir;
    void main() {
      float h = vDir.y;
      vec3 col = h > 0.0 ? mix(horizon, top, pow(h, 0.6)) : mix(horizon, bottom, pow(-h, 0.4));
      // Soft sun glow in the west-north-west.
      float sun = pow(max(dot(normalize(vDir), normalize(vec3(-0.8, 0.35, -0.3))), 0.0), 24.0);
      col += vec3(1.0, 0.95, 0.85) * sun * 0.35;
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }`,
});

const trunkGeo = new CylinderGeometry(0.12, 0.18, 1.6, 6);
trunkGeo.translate(0, 0.8, 0);
const crownGeo = new ConeGeometry(1.4, 3.6, 7);
crownGeo.translate(0, 3.2, 0);
const trunkMat = new MeshStandardMaterial({ color: '#7a5a3a', roughness: 1 });
const crownMat = new MeshStandardMaterial({ color: '#4f8a4a', roughness: 0.95, flatShading: true });

function Trees({ positions }: { positions: [number, number, number][] }) {
  const trunks = useRef<InstancedMesh>(null);
  const crowns = useRef<InstancedMesh>(null);
  useLayoutEffect(() => {
    const d = new Object3D();
    positions.forEach(([x, z, s], i) => {
      d.position.set(x, 0, z);
      d.scale.setScalar(s);
      d.rotation.y = i * 1.7;
      d.updateMatrix();
      trunks.current?.setMatrixAt(i, d.matrix);
      crowns.current?.setMatrixAt(i, d.matrix);
    });
    for (const m of [trunks.current, crowns.current]) {
      if (!m) continue;
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
    }
  }, [positions]);
  return (
    <group>
      <instancedMesh ref={trunks} args={[trunkGeo, trunkMat, positions.length]} />
      <instancedMesh ref={crowns} args={[crownGeo, crownMat, positions.length]} />
    </group>
  );
}

export function SkyDome() {
  const trees = useMemo(() => {
    const list: [number, number, number][] = [];
    // Ring of distant trees around the lab.
    for (let i = 0; i < 46; i++) {
      const a = (i / 46) * Math.PI * 2;
      const r = 34 + ((i * 37) % 11);
      list.push([Math.cos(a) * r * 1.2, Math.sin(a) * r, 1.1 + ((i * 13) % 7) / 6]);
    }
    // Garden south of the lab.
    list.push([10, 6, 0.9], [16.5, 9, 1.1], [12.5, 12.5, 0.8], [18, 4, 0.7]);
    return list;
  }, []);
  return (
    <group>
      <mesh material={skyMaterial} renderOrder={-10} frustumCulled={false}>
        <primitive object={new SphereGeometry(150, 32, 16)} attach="geometry" />
      </mesh>
      <Trees positions={trees} />
    </group>
  );
}
