import {HydrostaticLiquid} from './HydrostaticLiquid';
import {useShowcase} from '../experiments/workbench/guidance/showcase';
import {useGuideCue} from '../experiments/workbench/guidance/runtime';
import {actionVisual} from '../interaction/actions';
import {appearanceOf} from '../chemistry/appearance';
import {useChemStore} from '../store/useChemStore';
import {ReactionCloud} from '../visuals/ReactionCloud';
/**
 * What is inside a vessel, drawn from its inner profile: the liquid (color, cloudiness),
 * settled sediment or dry crystals, and — for live items — rising bubbles, steam, foam
 * and flames driven by the chemistry simulation.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, CanvasTexture, Color, InstancedMesh, LatheGeometry, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, Object3D, SphereGeometry, SpriteMaterial, Vector2, type Group, type Sprite } from 'three';
import type { MixtureLook } from '../chemistry/color';
import { useLiteShading, useTransmission } from '../materials/glass';
import { useStill, useWakeHolder } from '../interaction/still';
import { lazy } from '../utils/lazy';
import { bandGeometry, heightForVolume, radiusAt, rimHeight, type VesselProfile } from './profiles';
import { bubblePose } from '../lab/reaction-animation';
import { useSettingsStore } from '../store/useSettingsStore';
import { vesselFx } from '../lab/vesselFx';
import {VesselContentsGrade8} from './VesselContents.grade8';
import {useGrade8Lab} from '../experiments/workbench/guidance/grade8';

const bubbleGeometry = lazy(() => new SphereGeometry(1, 6, 4));
const bubbleMaterial = lazy(() => new MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, roughness: 0.05, depthWrite: false }));
const foamMaterial = lazy(() => new MeshStandardMaterial({ color: '#fbfbf7', roughness: 0.95 }));
const flameOuter = lazy(() => new MeshBasicMaterial({ color: '#ff8a1f', transparent: true, opacity: 0.75, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
const flameInner = lazy(() => new MeshBasicMaterial({ color: '#ffd35a', transparent: true, opacity: 0.9, blending: AdditiveBlending, depthWrite: false, toneMapped: false }));
const flameGeometry = lazy(() => {
  const pts: Vector2[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push(new Vector2(Math.sin(Math.PI * Math.pow(t, 0.55)) * (1 - t * 0.3) + 0.02, t * 2.4));
  }
  return new LatheGeometry(pts, 12);
});

const steamTexture = lazy(() => {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  if (ctx) {
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  }
  return new CanvasTexture(c);
});

function newLiquidMaterial(transmission: boolean): MeshPhysicalMaterial {
  return transmission
    ? new MeshPhysicalMaterial({ roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.04, emissiveIntensity: 0.12 })
    : new MeshPhysicalMaterial({ roughness: 0.15, transparent: true, opacity: 0.86, emissiveIntensity: 0.06 });
}

/** Cloudiness and opacity; Low quality drops the clearcoat layer, which is costly on phone GPUs. */
function shadeLiquid(material: MeshPhysicalMaterial, color: string, turbidity: number, transmission: boolean, lite: boolean): void {
  const c = new Color(color);
  material.roughness = 0.08 + turbidity * 0.6;
  material.clearcoat = lite ? 0 : 1 - turbidity * 0.8;
  if (!transmission) {
    const dark = 1 - (c.r + c.g + c.b) / 3;
    material.opacity = Math.min(0.97, 0.55 + Math.max(turbidity, dark) * 0.45);
  }
}

function useLiquidMaterial(color: string, turbidity: number): MeshPhysicalMaterial {
  const transmission = useTransmission();
  const lite = useLiteShading();
  const material = useMemo(() => newLiquidMaterial(transmission), [transmission]);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => shadeLiquid(material, color, turbidity, transmission, lite), [material, color, turbidity, transmission, lite]);
  // Fade to a new color; parse it once per change and stop work once the fade has landed.
  const target = useMemo(() => new Color(), []);
  const placed = useRef(false);
  useEffect(() => {
    target.set(color);
    if (!placed.current) {
      placed.current = true;
      material.color.copy(target);
      material.emissive.copy(target);
    }
  }, [target, color, material]);
  useFrame((_, dt) => {
    const c = material.color;
    if (Math.abs(c.r - target.r) + Math.abs(c.g - target.g) + Math.abs(c.b - target.b) < 1e-3) return;
    c.lerp(target, Math.min(1, dt * 4));
    material.emissive.copy(c);
  });
  return material;
}

function useSolidMaterial(color: string, metal: boolean): MeshStandardMaterial {
  const material = useMemo(() => new MeshStandardMaterial({ roughness: 0.85 }), []);
  useEffect(() => () => material.dispose(), [material]);
  useEffect(() => {
    material.color.set(color);
    material.metalness = metal ? 0.75 : 0;
    material.roughness = metal ? 0.38 : 0.85;
  }, [material, color, metal]);
  return material;
}

/** Bubbles rising through the liquid while gas is released or the liquid boils. */
function Bubbles({ itemId, profile, bottom, top }: { itemId: string; profile: VesselProfile; bottom: number; top: number }) {
  const ref = useRef<InstancedMesh>(null);
  const elapsed = useRef(0);
  const particleCount = 32;
  const dummy = useMemo(() => new Object3D(), []);
  useFrame((_, dt) => {
    const mesh = ref.current;
    if (!mesh) return;
    const fx = vesselFx.get(itemId);
    const intensity = fx ? Math.min(1, fx.bubbles) : 0;
    const reduced = useSettingsStore.getState().reducedMotion;
    const count = Math.round(intensity * (reduced ? 12 : particleCount));
    elapsed.current += Math.min(.05, dt);
    mesh.count = count;
    mesh.visible = count > 0 && top - bottom > 0.002;
    if (!mesh.visible) return;
    for (let i = 0; i < count; i++) {
      const bubble = bubblePose(i, elapsed.current, radiusAt(profile, bottom) * .8, bottom, top, intensity, reduced);
      const allowed = radiusAt(profile, bubble.y) * .8;
      const spread = Math.hypot(bubble.x, bubble.z);
      const inset = spread > allowed ? allowed / spread : 1;
      dummy.position.set(bubble.x * inset, bubble.y, bubble.z * inset);
      dummy.scale.setScalar(Math.min(bubble.size, (top - bottom) * .2));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });
  return <instancedMesh ref={ref} args={[bubbleGeometry(), bubbleMaterial(), particleCount]} frustumCulled={false} userData={{ noOutline: true, noBatch: true }} raycast={() => undefined} />;
}

/** Steam puffs above the rim of a hot vessel. */
function Steam({ itemId, rim, radius }: { itemId: string; rim: number; radius: number }) {
  const group = useRef<Group>(null);
  const puffs = useMemo(() => Array.from({ length: 6 }, (_, i) => ({ t: i / 6, x: (Math.random() - 0.5) * radius, z: (Math.random() - 0.5) * radius })), [radius]);
  const material = useMemo(() => new SpriteMaterial({ map: steamTexture(), transparent: true, depthWrite: false, opacity: 0 }), []);
  useEffect(() => () => material.dispose(), [material]);
  useFrame((_, dt) => {
    const g = group.current;
    if (!g) return;
    const fx = vesselFx.get(itemId);
    const steam = fx ? Math.min(1, fx.steam + fx.smoke) : 0;
    g.visible = steam > 0.02;
    if (!g.visible) return;
    material.opacity = 0.18 + steam * 0.45;
    material.color.set(fx && fx.smoke > fx.steam ? '#55524d' : '#ffffff');
    g.children.forEach((child, i) => {
      const p = puffs[i];
      p.t = (p.t + dt * 0.45) % 1;
      const sprite = child as Sprite;
      sprite.position.set(p.x * (1 + p.t), rim + p.t * 0.12, p.z * (1 + p.t));
      const s = radius * (0.9 + p.t * 2.2);
      sprite.scale.set(s, s, s);
    });
  });
  return (
    <group ref={group} userData={{ noOutline: true, noBatch: true }}>
      {puffs.map((_, i) => (
        <sprite key={i} material={material} raycast={() => undefined} />
      ))}
    </group>
  );
}

function Flame({ y, radius }: { y: number; radius: number }) {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.scale.set(radius * (1 + Math.sin(t * 23) * 0.08), radius * (1 + Math.sin(t * 17) * 0.15 + Math.sin(t * 41) * 0.06), radius * (1 + Math.cos(t * 19) * 0.08));
  });
  return (
    <group ref={ref} position={[0, y, 0]} userData={{ noOutline: true, noBatch: true }}>
      <mesh geometry={flameGeometry()} material={flameOuter()} raycast={() => undefined} />
      <mesh geometry={flameGeometry()} material={flameInner()} scale={[0.55, 0.6, 0.55]} raycast={() => undefined} />
    </group>
  );
}

export interface VesselContentsProps {
  profile: VesselProfile;
  look: MixtureLook;
  /** Live item id: enables bubbles, steam and flames from the simulation. */
  itemId?: string;
}

/** Live contents on the bench and in hand; still ones in a drawer or cabinet (see interaction/still.ts). */
function VesselContentsMain(props: VesselContentsProps) {
  return useStill() ? <StillContents {...props} /> : <LiveContents {...props} />;
}

/** Still contents share one material per colour: no fades, so nothing to animate per vessel. */
const stillLiquids = new Map<string, MeshPhysicalMaterial>();
function stillLiquid(color: string, turbidity: number, transmission: boolean, lite: boolean): MeshPhysicalMaterial {
  const key = `${color}|${turbidity.toFixed(2)}|${transmission}|${lite}`;
  let material = stillLiquids.get(key);
  if (!material) {
    material = newLiquidMaterial(transmission);
    shadeLiquid(material, color, turbidity, transmission, lite);
    material.color.set(color);
    material.emissive.set(color);
    stillLiquids.set(key, material);
  }
  return material;
}
const stillSolids = new Map<string, MeshStandardMaterial>();
function stillSolid(color: string, metal: boolean): MeshStandardMaterial {
  const key = `${color}|${metal}`;
  let material = stillSolids.get(key);
  if (!material) {
    material = new MeshStandardMaterial({ color, metalness: metal ? 0.75 : 0, roughness: metal ? 0.38 : 0.85 });
    stillSolids.set(key, material);
  }
  return material;
}

/** Liquid, layers, sediment and foam of a stored vessel, without bubbles, steam, flames or clouds. */
function StillContents({ profile, look, itemId }: VesselContentsProps) {
  useWakeHolder();
  const transmission = useTransmission();
  const lite = useLiteShading();
  const mixture = itemId ? useChemStore.getState().mixtures[itemId] : undefined;
  const phases = mixture ? appearanceOf(mixture) : null;
  const rim = rimHeight(profile);
  const bottom = profile.wall[0][1];
  const sedimentTop = look.sedimentMl > 0.005 ? heightForVolume(profile, look.sedimentMl * (look.liquid ? 1 : 1.4)) : bottom;
  const liquidTop = look.liquid ? heightForVolume(profile, look.sedimentMl + look.liquidMl) : sedimentTop;
  const boundary = phases?.layered ? heightForVolume(profile, look.sedimentMl + phases.aqueousMl) : liquidTop;
  const rimR = radiusAt(profile, rim);
  const foamH = look.foamMl > 2 ? Math.min(0.12, (look.foamMl * 1e-6) / (Math.PI * rimR * rimR) + 0.003) : 0;
  const foamFrom = Math.max(liquidTop, sedimentTop);
  const showSediment = look.solidColor && sedimentTop - bottom > 0.0006;
  const showLiquid = look.liquid && liquidTop - sedimentTop > 0.0006;
  const flags = { noOutline: true, noBatch: true };
  return (
    <group userData={{ noBatch: true }}>
      {showSediment && <mesh geometry={bandGeometry(profile, bottom, sedimentTop, 0.97)} material={stillSolid(look.solidColor ?? '#ffffff', look.solidMetal)} userData={flags} />}
      {showLiquid && <mesh geometry={bandGeometry(profile, sedimentTop, boundary)} material={stillLiquid(look.liquid ?? '#cfe6f5', look.turbidity, transmission, lite)} userData={flags} />}
      {showLiquid && phases?.layered && <mesh geometry={bandGeometry(profile, boundary, liquidTop)} material={stillLiquid(phases.organicColor ?? '#eff2e9', 0, transmission, lite)} userData={flags} />}
      {foamH > 0 && <mesh geometry={bandGeometry(profile, foamFrom, Math.min(rim, foamFrom + foamH), 0.99)} material={foamMaterial()} userData={flags} />}
    </group>
  );
}

function LiveContents({ profile, look, itemId }: VesselContentsProps) {
  const pouring=useShowcase(s=>!!itemId&&s.source===itemId&&s.tool==='pour'&&['playing','paused'].includes(s.status));
  const stirring=useShowcase(s=>s.targetId===itemId&&s.operation==='stir'&&s.status==='playing');
  const flow=useShowcase(s=>s.flow),receiving=useGuideCue(s=>s.target===itemId);
  const agitated=!!itemId&&(stirring||receiving&&flow||actionVisual.targetId===itemId&&actionVisual.strength>0);
  const mixture=useChemStore(s=>itemId?s.mixtures[itemId]:undefined);
  const phases=useMemo(()=>mixture?appearanceOf(mixture):null,[mixture]);
  const rim = rimHeight(profile);
  const bottom = profile.wall[0][1];
  const sedimentTop = look.sedimentMl > 0.005 ? heightForVolume(profile, look.sedimentMl * (look.liquid ? 1 : 1.4)) : bottom;
  const liquidTop = look.liquid ? heightForVolume(profile, look.sedimentMl + look.liquidMl) : sedimentTop;
  const liquidMat = useLiquidMaterial(look.liquid ?? '#cfe6f5', look.turbidity);
  const organicMat=useLiquidMaterial(phases?.organicColor??'#eff2e9',0);
  const boundary=phases?.layered?heightForVolume(profile,look.sedimentMl+phases.aqueousMl):liquidTop;
  const solidMat = useSolidMaterial(look.solidColor ?? '#ffffff', look.solidMetal);
  const rimR = radiusAt(profile, rim);
  const foamH = look.foamMl > 2 ? Math.min(0.12, (look.foamMl * 1e-6) / (Math.PI * rimR * rimR) + 0.003) : 0;
  const foamFrom = Math.max(liquidTop, sedimentTop);
  const showSediment = look.solidColor && sedimentTop - bottom > 0.0006;
  const showLiquid = look.liquid && liquidTop - sedimentTop > 0.0006;
  return (
    <group userData={{ noBatch: true }}>
      {showSediment && <mesh geometry={bandGeometry(profile, bottom, sedimentTop, 0.97)} material={solidMat} userData={{ noOutline: true, noBatch: true }} />}
      {showLiquid && !pouring && <mesh geometry={bandGeometry(profile, sedimentTop, boundary)} material={liquidMat} userData={{ noOutline: true, noBatch: true }} />}
      {pouring&&showLiquid&&<HydrostaticLiquid profile={profile} ml={look.liquidMl} color={look.liquid??'#e2f0fa'}/>}
      {showLiquid&&!pouring&&phases?.layered&&<mesh geometry={bandGeometry(profile,boundary,liquidTop)} material={organicMat} userData={{noOutline:true,noBatch:true}}/>}
      {showLiquid&&itemId&&phases?.colored&&!phases.layered&&!phases.visiblePrecipitate&&<ReactionCloud radius={Math.min(radiusAt(profile,liquidTop),radiusAt(profile,sedimentTop+.001))*.85} bottom={sedimentTop+.0005} top={boundary} color={look.liquid??'#edf5f7'} strength={agitated?.35:0} spread={.8} agitated={agitated} fromTop/>}
      {showLiquid&&phases?.visiblePrecipitate&&(phases.suspension??0)>.01&&<ReactionCloud radius={Math.min(radiusAt(profile,liquidTop),radiusAt(profile,sedimentTop+.001))*.85} bottom={sedimentTop+.0005} top={boundary} color={phases?.precipitateColor??'#eee'} strength={phases!.suspension} spread={phases!.suspension}/>}
      {foamH > 0 && (
        <group userData={{ noOutline: true, noBatch: true }}>
          <mesh geometry={bandGeometry(profile, foamFrom, Math.min(rim, foamFrom + foamH), 0.99)} material={foamMaterial()} />
          {foamFrom + foamH > rim && (
            <mesh material={foamMaterial()} position={[0, rim, 0]} scale={[radiusAt(profile, rim) * 1.15, Math.min(radiusAt(profile, rim) * 1.15, foamFrom + foamH - rim), radiusAt(profile, rim) * 1.15]}>
              <sphereGeometry args={[1, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
            </mesh>
          )}
        </group>
      )}
      {itemId && look.liquid && <Bubbles itemId={itemId} profile={profile} bottom={sedimentTop} top={liquidTop} />}
      {itemId && <Steam itemId={itemId} rim={rim} radius={radiusAt(profile, rim)} />}
      {look.burning && <Flame y={Math.max(liquidTop, bottom)} radius={radiusAt(profile, liquidTop) * 0.9} />}
    </group>
  );
}
/** Grade 8 keeps its earlier 3D demo look (VesselContents.grade8.tsx); every other grade uses main's. */
export function VesselContents(props:VesselContentsProps){
 return useGrade8Lab()?<VesselContentsGrade8 {...props}/>:<VesselContentsMain {...props}/>;
}
