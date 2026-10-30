/**
 * Liquid mixing shader shared by every vessel. Presentation only: the chemistry decides the
 * final color and the amount of suspended solid; this decides how the change travels.
 *
 * - A new color enters as a plume from where liquid arrives (the top) and spreads through
 *   the old one along swirling, falling tendrils, slightly more concentrated at the front.
 * - A precipitate blooms from the same point as opaque flocs, then sinks as it settles.
 * - Color follows the liquid's real path length (Beer–Lambert): thin films are paler,
 *   tall columns deeper.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, MeshPhysicalMaterial, ShaderChunk, Vector3, type MeshStandardMaterial } from 'three';
import { useSettingsStore } from '../store/useSettingsStore';
import { useLiteShading, useTransmission } from '../materials/glass';

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
  uGlow: { value: number };
  uCloud: { value: number };
  uCloudColor: { value: Color };
  uForm: { value: number };
  uSettle: { value: number };
  uClock: { value: number };
  uSurf: { value: number };
  uFizz: { value: number };
  uFlash: { value: number };
  uFlashSize: { value: number };
  uFlashColor: { value: Color };
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

/**
 * The free surface: concentric ripples where a stream lands, a stirred vortex dip with spiral
 * arms, fizz where bubbles burst and a meniscus against the wall. Drawn as a normal
 * perturbation (lighting and reflections move), so the cap needs no extra vertices.
 */
const SURFACE = /* glsl */ `
vec3 sp = vLiquidPos * uScale;
// The cap is found by height (lathe normals at its rim are bevelled); use its true face normal.
if (abs(sp.y - uTop) < 0.0004 && vLiquidUp > -0.5) {
  normal = normalize(cross(dFdx(vViewPosition), dFdy(vViewPosition)));
  float rr = length(sp.xz);
  float R = max(1e-4, uRadius);
  // Slightly irregular rings: real ripples interfere and wobble.
  float px = max(1e-7, length(dFdx(vViewPosition)));
  // Detail finer than a few pixels only aliases into grain; fade it with distance.
  float fine = 1.0 - smoothstep(0.08, 0.3, px * 150.0);
  float wob = lfxNoise(vec3(sp.xz * 160.0, uClock * 0.8)) * 0.0018;
  float rings = fine * uSurf * 0.0005 * sin((rr + wob) * 950.0 - uClock * 18.0) * exp(-rr / (R * 0.8));
  float vortex = -uSwirl * 0.0016 * exp(-rr * rr / (R * R * 0.12))
    + uSwirl * 0.00018 * sin(atan(sp.z, sp.x) * 3.0 + rr * 700.0 - uClock * 9.0);
  float fizz = fine * uFizz * 0.00022 * lfxNoise(vec3(sp.xz * 1100.0, uClock * 7.0));
  float meniscus = 0.0009 * pow(smoothstep(0.82, 1.0, rr / R), 2.0);
  float hgt = rings + vortex + fizz + meniscus;
  vec2 dHdxy = vec2(dFdx(hgt), dFdy(hgt)) / px;
  vec3 sX = normalize(dFdx(-vViewPosition)), sY = normalize(dFdy(-vViewPosition));
  vec3 r1 = cross(sY, normal), r2 = cross(normal, sX);
  float det = dot(sX, r1) * faceDirection;
  normal = normalize(abs(det) * normal - sign(det) * (dHdxy.x * r1 + dHdxy.y * r2));
  // Ripples also bend what is seen through the surface: slopes facing the light brighten.
  float shade = clamp(dHdxy.x * 0.5 - dHdxy.y * 0.7, -0.35, 0.45);
  // Where the stream plunges in, the surface churns white with entrained air.
  float churn = uSurf * (1.0 - uFlash * 0.75) * (1.0 - smoothstep(R * 0.03, R * 0.16, rr)) * (0.55 + 0.45 * lfxNoise(vec3(sp.xz * 1400.0, uClock * 9.0)));
  diffuseColor.rgb = mix(diffuseColor.rgb * (1.0 + shade), vec3(0.93, 0.96, 0.98), clamp(churn, 0.0, 0.8));
  lfxSheen = max(shade, 0.0) * 0.35 + churn * 0.3;
}
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
  // A drop's local color (e.g. pink indicator around base) blooms where it lands, then fades.
  float flashR = 0.22 + 0.55 * uFlashSize;
  float fromDrop = length(vec2(r, (1.0 - h) * 1.4));
  float flash = uFlash * (1.0 - smoothstep(flashR * 0.4, flashR, fromDrop + n2 * 0.1 + n1 * 0.08));
  col = mix(col, uFlashColor, clamp(flash * 1.2, 0.0, 0.95));
  // Beer–Lambert over the real path: mostly the liquid's depth (we look down into vessels),
  // partly its width. Colors are defined at a 25 mm path; a thin film is paler, a tall column deeper.
  float path = 0.7 * (uTop - uBottom) + 0.3 * 1.6 * uRadius;
  float depthK = clamp(path / 0.025, 0.5, 1.8);
  diffuseColor.rgb = pow(max(col, vec3(0.0005)), vec3(mix(depthK, 1.0, lfxCloud)));
  diffuseColor.a = mix(diffuseColor.a, 1.0, lfxCloud);
}
`;

function patch(material: LiquidMaterial, uniforms: LiquidUniforms) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLiquidPos;\nvarying float vLiquidUp;')
      .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvLiquidUp = objectNormal.y;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLiquidPos = transformed;');
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vLiquidPos;
varying float vLiquidUp;
uniform vec3 uPrev; uniform float uMix; uniform float uTime; uniform float uSwirl;
uniform float uBottom; uniform float uTop; uniform float uRadius; uniform vec3 uScale;
uniform float uGlow; uniform float uCloud; uniform vec3 uCloudColor; uniform float uForm; uniform float uSettle;
uniform float uClock; uniform float uSurf; uniform float uFizz;
uniform float uFlash; uniform float uFlashSize; uniform vec3 uFlashColor;
float lfxCloud = 0.0;
float lfxSheen = 0.0;
${NOISE}`,
      )
      .replace('#include <color_fragment>', `#include <color_fragment>\n${FRAGMENT}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>\n${SURFACE}`)
      .replace('#include <clearcoat_normal_fragment_maps>', '#include <clearcoat_normal_fragment_maps>\n#ifdef USE_CLEARCOAT\nclearcoatNormal = normal;\n#endif')
      // Flocs scatter light instead of letting it through.
      .replace('#include <transmission_fragment>', ShaderChunk.transmission_fragment.replace('material.transmission = transmission;', 'material.transmission = transmission * (1.0 - lfxCloud);'))
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance = diffuseColor.rgb * uGlow + vec3(lfxSheen);');
  };
  material.customProgramCacheKey = () => 'liquid-fx-9';
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
  /** A stream is landing on the surface right now. */
  pouring?: boolean;
  /** 0..1 every frame: bubbles bursting at the surface. */
  fizz?: () => number;
  /** A drop just landed with this local color; `key` changes per drop. */
  flash?: { color: string; key: number } | null;
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
      uGlow: { value: 0.1 },
      uCloud: { value: 0 },
      uCloudColor: { value: new Color('#ffffff') },
      uForm: { value: 1 },
      uSettle: { value: 0 },
      uClock: { value: 0 },
      uSurf: { value: 0 },
      uFizz: { value: 0 },
      uFlash: { value: 0 },
      uFlashSize: { value: 0 },
      uFlashColor: { value: new Color('#ffffff') },
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
  const flashAge = useRef(99);
  useEffect(() => {
    if (!input.flash) return;
    uniforms.uFlashColor.value.set(input.flash.color);
    flashAge.current = 0;
  }, [input.flash, uniforms]);
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
    const mixing = u.uMix.value < 1;
    const duration = reduced ? 0.6 : input.agitated ? 1.6 : 4.2;
    if (input.progress !== undefined) {
      if (input.from) u.uPrev.value.set(input.from);
      u.uMix.value += (Math.max(0, Math.min(1, input.progress)) - u.uMix.value) * (1 - Math.exp(-dt * 2));
    } else u.uMix.value = Math.min(1, u.uMix.value + dt / duration);
    const swirlTarget = reduced ? 0 : input.agitated ? 1 : mixing ? 0.55 * (1 - u.uMix.value) + 0.1 : 0.04;
    u.uSwirl.value += (swirlTarget - u.uSwirl.value) * (1 - Math.exp(-dt * 3));
    u.uTime.value += dt * (reduced ? 0.1 : 0.35 + u.uSwirl.value);
    u.uClock.value += reduced ? 0 : dt;
    // Rings keep spreading for a moment after the stream stops.
    u.uSurf.value += ((input.pouring && !reduced ? 1 : 0) - u.uSurf.value) * (1 - Math.exp(-dt * (input.pouring ? 6 : 1.2)));
    u.uFizz.value = reduced ? 0 : Math.max(0, Math.min(1, input.fizz?.() ?? 0));
    flashAge.current += dt;
    const life = reduced ? 0.6 : 1.6,
      f = Math.min(1, flashAge.current / life);
    u.uFlash.value = 1 - f * f;
    u.uFlashSize.value = f;
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
 * Liquid body material. On High (refracting glass) it is opaque so the glass can show it;
 * otherwise it is alpha-blended with the alpha glass.
 */
/** Opaque on purpose: three.js glass only refracts opaque objects behind it, so a transmissive
 * liquid would vanish behind the vessel wall. The glass does the refraction. */
export function newLiquidMaterial(transmission: boolean): MeshPhysicalMaterial {
  // The glossy wet finish the lab was designed with: a full, smooth clearcoat.
  return transmission
    ? new MeshPhysicalMaterial({ roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04 })
    : new MeshPhysicalMaterial({ roughness: 0.15, transparent: true, opacity: 0.86 });
}

/** Cloudiness and opacity; Low quality drops the clearcoat layer, which is costly on phone GPUs. */
export function shadeLiquid(material: MeshPhysicalMaterial, color: string, turbidity: number, transmission: boolean, lite: boolean): void {
  const c = new Color(color);
  material.roughness = 0.08 + turbidity * 0.6;
  material.clearcoat = lite ? 0 : 1 - turbidity * 0.8;
  if (!transmission) {
    const dark = 1 - (c.r + c.g + c.b) / 3;
    material.opacity = Math.min(0.97, 0.55 + Math.max(turbidity, dark) * 0.45);
  }
}

export function useLiquidMaterial(color: string, turbidity: number, fx: Omit<LiquidFxInput, 'color'>): MeshPhysicalMaterial {
  const transmission = useTransmission();
  const lite = useLiteShading();
  const material = useMemo(() => newLiquidMaterial(transmission), [transmission]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => shadeLiquid(material, color, turbidity, transmission, lite), [material, color, turbidity, transmission, lite]);
  useLiquidFx(material, { glow: 0.12, ...fx, color });
  return material;
}
