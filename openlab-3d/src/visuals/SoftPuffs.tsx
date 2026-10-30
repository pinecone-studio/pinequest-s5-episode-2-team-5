/**
 * Soft billboard puffs for steam, smoke and vapour: one instanced draw call, each puff with
 * its own size and opacity, drawn from a billowy cloud texture instead of hard spheres.
 * Puffs live above the rim (outside the glass), so plain alpha blending is correct here.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, Color, InstancedBufferAttribute, Object3D, PlaneGeometry, ShaderMaterial, type InstancedMesh } from 'three';
import { lazy } from '../utils/lazy';

const cloudTexture = lazy(() => {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const x = c.getContext('2d');
  if (x) {
    // Overlapping soft blobs give a billowy, uneven edge rather than a perfect disc.
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 26; i++) {
      const a = rnd() * Math.PI * 2,
        d = rnd() * 30,
        r = 18 + rnd() * 26,
        cx = 64 + Math.cos(a) * d,
        cy = 64 + Math.sin(a) * d;
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
      g.addColorStop(0, 'rgba(255,255,255,0.22)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.08)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 128, 128);
    }
  }
  return new CanvasTexture(c);
});
const plane = lazy(() => new PlaneGeometry(1, 1));

const VERTEX = /* glsl */ `
attribute float aAlpha;
attribute float aSpin;
varying float vAlpha;
varying vec2 vUv;
void main() {
  vAlpha = aAlpha;
  float c = cos(aSpin), s = sin(aSpin);
  vUv = mat2(c, -s, s, c) * (uv - 0.5) + 0.5;
  vec4 center = modelViewMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  float size = length(instanceMatrix[0].xyz);
  center.xy += position.xy * size;
  gl_Position = projectionMatrix * center;
}`;
const FRAGMENT = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uColor;
varying float vAlpha;
varying vec2 vUv;
void main() {
  float a = texture2D(uMap, vUv).r * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(uColor, a);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export interface Puff {
  x: number;
  y: number;
  z: number;
  size: number;
  alpha: number;
  spin: number;
}

/**
 * `layout(i, puff)` fills puff i for this frame and returns false when that puff is unused.
 * Positions are in the parent's space.
 */
export function SoftPuffs({ max, color, layout }: { max: number; color: string; layout: (i: number, puff: Puff, dt: number) => boolean }) {
  const ref = useRef<InstancedMesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: { uMap: { value: cloudTexture() }, uColor: { value: new Color(color) } },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
      }),
    // Color updates go through the uniform below.
    [],
  );
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    material.uniforms.uColor.value.set(color);
  }, [material, color]);
  const { geometry, alpha, spin } = useMemo(() => {
    const g = plane().clone(),
      a = new InstancedBufferAttribute(new Float32Array(max), 1),
      s = new InstancedBufferAttribute(new Float32Array(max), 1);
    g.setAttribute('aAlpha', a);
    g.setAttribute('aSpin', s);
    return { geometry: g, alpha: a, spin: s };
  }, [max]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const dummy = useMemo(() => new Object3D(), []);
  const puff = useMemo<Puff>(() => ({ x: 0, y: 0, z: 0, size: 0, alpha: 0, spin: 0 }), []);
  useFrame((_, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    const dt = Math.min(0.05, delta);
    let n = 0;
    for (let i = 0; i < max; i++) {
      if (!layout(i, puff, dt) || puff.alpha <= 0.002) continue;
      dummy.position.set(puff.x, puff.y, puff.z);
      dummy.scale.setScalar(Math.max(1e-5, puff.size));
      dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
      alpha.setX(n, puff.alpha);
      spin.setX(n, puff.spin);
      n++;
    }
    mesh.count = n;
    mesh.visible = n > 0;
    mesh.instanceMatrix.needsUpdate = true;
    alpha.needsUpdate = true;
    spin.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[geometry, material, max]} frustumCulled={false} renderOrder={5} userData={{ noOutline: true, noBatch: true }} raycast={() => undefined} />;
}
