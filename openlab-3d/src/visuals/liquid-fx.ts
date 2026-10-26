/**
 * Liquid mixing shader shared by every vessel. Presentation only: the chemistry decides the
 * final color and the amount of suspended solid; this decides how the change travels.
 *
 * - A new color enters as a plume from where liquid arrives (the top) and spreads through
 *   the old one along swirling, falling tendrils, slightly more concentrated at the front.
 * - A precipitate blooms from the same point as opaque flocs, then sinks as it settles.
 * - Color is deepened with the vessel's path length (Beer–Lambert), so thin layers of
 *   strongly colored solutions do not wash out under bright lab lighting.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, MeshPhysicalMaterial, ShaderChunk, Vector3, type MeshStandardMaterial } from 'three';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTransmission } from '../materials/glass';

type LiquidMaterial = MeshPhysicalMaterial | MeshStandardMaterial;

export interface LiquidUniforms {
  uPrev: { value: Color };
  uMix: { value: number };
  uTime: { value: number };
  uSwirl: { value: number };
  uBottom: { value: number };
  uTop: { value: number };
  uRadius: { value: number };
  uScale: { value: Vector3 };
  uDepth: { value: number };
  uGlow: { value: number };
  uCloud: { value: number };
  uCloudColor: { value: Color };
  uForm: { value: number };
  uSettle: { value: number };
}

const NOISE = /* glsl */ `
vec3 lfxMod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 lfxMod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 lfxPermute(vec4 x){return lfxMod289(((x*34.0)+10.0)*x);}
vec4 lfxInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float lfxNoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);vec3 l=1.0-g;vec3 i1=min(g.xyz,l.zxy);vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;vec3 x2=x0-i2+C.yyy;vec3 x3=x0-D.yyy;
  i=lfxMod289(i);
  vec4 p=lfxPermute(lfxPermute(lfxPermute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);vec4 x_=floor(j*ns.z);vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;vec4 y=y_*ns.x+ns.yyyy;vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;vec4 s1=floor(b1)*2.0+1.0;vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);vec3 p1=vec3(a0.zw,h.y);vec3 p2=vec3(a1.xy,h.z);vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=lfxInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.5-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);m=m*m;
  return 105.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
float lfxFbm(vec3 p){return lfxNoise(p)*0.6+lfxNoise(p*2.03+7.1)*0.28+lfxNoise(p*4.1-3.7)*0.12;}
`;

const FRAGMENT = /* glsl */ `
{
  vec3 lp = vLiquidPos * uScale;
  float span = max(1e-4, uTop - uBottom);
  float h = clamp((lp.y - uBottom) / span, 0.0, 1.0);
  float ang = uTime * (0.4 + 2.6 * uSwirl) + h * uSwirl * 3.5;
  float ca = cos(ang), sa = sin(ang);
  vec2 q = vec2(ca * lp.x - sa * lp.z, sa * lp.x + ca * lp.z);
  vec3 np = vec3(q.x, lp.y, q.y) / max(1e-4, uRadius) * 1.4;
  float n1 = lfxFbm(np + vec3(0.0, uTime * 0.45, 0.0));
  float n2 = lfxNoise(np * vec3(2.2, 0.7, 2.2) + vec3(uTime * 0.15, uTime * 0.9, 0.0));
  // Distance from where liquid arrives: the surface, then outwards.
  float r = clamp(length(lp.xz) / max(1e-4, uRadius), 0.0, 1.0);
  float d = (1.0 - h) * 0.82 + r * 0.18 * (1.0 - uSwirl);
  float front = uMix * 1.7 - 0.3;
  float mixMask = 1.0 - smoothstep(front - 0.16, front + 0.16, d + n1 * 0.32 + n2 * 0.22);
  mixMask = uMix >= 0.999 ? 1.0 : mixMask;
  vec3 base = diffuseColor.rgb;
  // The arriving plume is more concentrated than the final mixture.
  vec3 conc = pow(max(base, vec3(0.002)), vec3(1.0 + 1.6 * (1.0 - uMix)));
  float edge = mixMask * (1.0 - mixMask) * 4.0;
  vec3 col = mix(uPrev, base, mixMask);
  col = mix(col, conc, clamp(edge * (1.0 - uMix), 0.0, 1.0) * 0.7);
  // Precipitate flocs: bloom from the entry point, then sink while settling.
  float floc = smoothstep(-0.15, 0.55, lfxFbm(np * 2.6 + vec3(0.0, uTime * 0.08 + uSettle * 1.5, 0.0)));
  float formMask = 1.0 - smoothstep(uForm * 1.7 - 0.45, uForm * 1.7 - 0.15, d + n1 * 0.3);
  float sink = mix(1.0, clamp((1.0 - h) * 1.9 - 0.15, 0.0, 1.0), uSettle);
  float bloom = (1.0 - uForm) * (1.0 - smoothstep(0.0, 0.25, abs(d - (uForm * 1.7 - 0.3)))) * 0.6;
  lfxCloud = clamp(uCloud * formMask * sink * (0.3 + 0.7 * floc + bloom), 0.0, 0.94);
  col = mix(col, uCloudColor, lfxCloud);
  diffuseColor.rgb = pow(max(col, vec3(0.0005)), vec3(mix(uDepth, 1.0, lfxCloud)));
  diffuseColor.a = mix(diffuseColor.a, 1.0, lfxCloud);
}
`;

function patch(material: LiquidMaterial, uniforms: LiquidUniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLiquidPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLiquidPos = transformed;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vLiquidPos;
uniform vec3 uPrev; uniform float uMix; uniform float uTime; uniform float uSwirl;
uniform float uBottom; uniform float uTop; uniform float uRadius; uniform vec3 uScale; uniform float uDepth;
uniform float uGlow; uniform float uCloud; uniform vec3 uCloudColor; uniform float uForm; uniform float uSettle;
float lfxCloud = 0.0;
${NOISE}`,
      )
      .replace('#include <color_fragment>', `#include <color_fragment>\n${FRAGMENT}`)
      // Flocs scatter light instead of letting it through.
      .replace('#include <transmission_fragment>', ShaderChunk.transmission_fragment.replace('material.transmission = transmission;', 'material.transmission = transmission * (1.0 - lfxCloud);'))
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = diffuseColor.rgb * uGlow;');
  };
  material.customProgramCacheKey = () => 'liquid-fx-1';
  material.needsUpdate = true;
}

/** The animated uniforms of a liquid material (for callers that move the level themselves). */
export function liquidUniforms(material: LiquidMaterial): LiquidUniforms | undefined {
  return material.userData.liquidFx as LiquidUniforms | undefined;
}

export interface LiquidFxInput {
  /** Final chemistry color of the liquid. */
  color: string;
  /** Liquid is being poured into, stirred or otherwise agitated. */
  agitated: boolean;
  /** 0..1 amount of suspended precipitate. */
  cloud: number;
  cloudColor: string | null;
  bottom: number;
  top: number;
  radius: number;
  /** Object-space → metre scale (for meshes stretched by their transform). */
  scale?: [number, number, number];
  /** Self-lit share of the color, so dark solutions still read under bright light. */
  glow?: number;
  /** The caller writes uBottom/uTop/uScale every frame (animated level). */
  manual?: boolean;
  /** Drive the plume directly (0..1), e.g. unstirred diffusion measured by the simulation. */
  progress?: number;
  /** Color the plume starts from when `progress` drives it. */
  from?: string;
}

/**
 * Animates a liquid material toward the chemistry color. The base color is the true result;
 * only the path to it (plume, swirl, flocs) is staged.
 */
export function useLiquidFx(material: LiquidMaterial, input: LiquidFxInput) {
  const uniforms = useMemo<LiquidUniforms>(
    () => ({
      uPrev: { value: new Color(input.color) },
      uMix: { value: 1 },
      uTime: { value: 0 },
      uSwirl: { value: 0 },
      uBottom: { value: 0 },
      uTop: { value: 1 },
      uRadius: { value: 0.03 },
      uScale: { value: new Vector3(1, 1, 1) },
      uDepth: { value: 1.4 },
      uGlow: { value: 0.1 },
      uCloud: { value: 0 },
      uCloudColor: { value: new Color('#ffffff') },
      uForm: { value: 1 },
      uSettle: { value: 0 },
    }),
    [],
  );
  useEffect(() => {
    patch(material, uniforms);
    material.userData.liquidFx = uniforms;
  }, [material, uniforms]);
  const state = useRef({ placed: false, target: new Color(), shown: new Color(), cloud: 0 });
  const next = useMemo(() => new Color(), []);
  useEffect(() => {
    const s = state.current;
    next.set(input.color);
    if (!s.placed) {
      s.placed = true;
      s.target.copy(next);
      uniforms.uPrev.value.copy(next);
      uniforms.uMix.value = 1;
    } else if (Math.abs(next.r - s.target.r) + Math.abs(next.g - s.target.g) + Math.abs(next.b - s.target.b) > 0.04) {
      // Start a new plume from what is on screen now.
      const m = uniforms.uMix.value;
      s.shown.copy(uniforms.uPrev.value).lerp(s.target, m * m * (3 - 2 * m));
      uniforms.uPrev.value.copy(s.shown);
      uniforms.uMix.value = 0;
      s.target.copy(next);
    } else s.target.copy(next);
    material.color.copy(s.target);
  }, [input.color, material, uniforms, next]);
  useEffect(() => {
    if (input.cloudColor) uniforms.uCloudColor.value.set(input.cloudColor);
  }, [input.cloudColor, uniforms]);
  useFrame((_, delta) => {
    const dt = Math.min(0.1, delta);
    const reduced = useSettingsStore.getState().reducedMotion;
    const u = uniforms,
      s = state.current;
    if (!input.manual) {
      u.uBottom.value = input.bottom;
      u.uTop.value = Math.max(input.bottom + 1e-4, input.top);
      if (input.scale) u.uScale.value.set(...input.scale);
    }
    u.uRadius.value = Math.max(1e-4, input.radius);
    u.uGlow.value = input.glow ?? 0.1;
    // Deeper vessels show a little more color; ≈1.05 for a test tube, ≈1.25 for a beaker.
    u.uDepth.value = 1 + Math.min(0.3, input.radius * 8);
    const mixing = u.uMix.value < 1;
    const duration = reduced ? 0.6 : input.agitated ? 1.6 : 4.2;
    if (input.progress !== undefined) {
      if (input.from) u.uPrev.value.set(input.from);
      u.uMix.value += (Math.max(0, Math.min(1, input.progress)) - u.uMix.value) * (1 - Math.exp(-dt * 2));
    } else u.uMix.value = Math.min(1, u.uMix.value + dt / duration);
    const swirlTarget = reduced ? 0 : input.agitated ? 1 : mixing ? 0.55 * (1 - u.uMix.value) + 0.1 : 0.04;
    u.uSwirl.value += (swirlTarget - u.uSwirl.value) * (1 - Math.exp(-dt * 3));
    u.uTime.value += dt * (reduced ? 0.1 : 0.35 + u.uSwirl.value);
    const cloud = input.cloudColor ? Math.max(0, Math.min(1, input.cloud)) : 0;
    if (s.cloud < 0.02 && cloud >= 0.02) u.uForm.value = 0;
    s.cloud = cloud;
    u.uForm.value = Math.min(1, u.uForm.value + dt / (reduced ? 0.5 : 2.6));
    // Strongly stirred suspensions stay up; otherwise the flocs gather near the bottom.
    u.uCloud.value += (Math.min(0.92, cloud * 1.6) - u.uCloud.value) * (1 - Math.exp(-dt * 4));
    u.uSettle.value += ((input.agitated ? 0 : 1 - cloud) - u.uSettle.value) * (1 - Math.exp(-dt * 1.5));
  });
  return uniforms;
}

/**
 * Liquid body material. With transmission (High) it refracts like water and is drawn in the
 * opaque pass, so it stays visible through transmissive glass; otherwise it is alpha-blended.
 */
export function useLiquidMaterial(color: string, turbidity: number, fx: Omit<LiquidFxInput, 'color'>): MeshPhysicalMaterial {
  const transmission = useTransmission();
  const material = useMemo(
    () =>
      transmission
        ? new MeshPhysicalMaterial({ roughness: 0.06, metalness: 0, transmission: 1, ior: 1.33, thickness: 0.02, clearcoat: 0.3, clearcoatRoughness: 0.05, specularIntensity: 0.6 })
        : new MeshPhysicalMaterial({ roughness: 0.12, transparent: true, opacity: 0.86, clearcoat: 0.3 }),
    [transmission],
  );
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    const c = new Color(color);
    material.roughness = 0.06 + turbidity * 0.3;
    // Refraction through a full vessel, not a 2 cm slab.
    if (transmission) material.thickness = Math.max(0.004, fx.radius * 1.6);
    else {
      const dark = 1 - (c.r + c.g + c.b) / 3;
      material.opacity = Math.min(0.97, 0.62 + Math.max(turbidity, dark) * 0.38);
    }
  }, [material, color, turbidity, transmission, fx.radius]);
  useLiquidFx(material, { ...fx, color });
  return material;
}
