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
import { AdditiveBlending, IcosahedronGeometry, LatheGeometry, MeshBasicMaterial, MeshStandardMaterial, Vector2, type Group, type MeshPhysicalMaterial } from 'three';
import type { MixtureLook } from '../chemistry/color';
import { useLiteShading, useTransmission } from '../materials/glass';
import { useStill, useWakeHolder } from '../interaction/still';
import { lazy } from '../utils/lazy';
import { bandGeometry, heightForVolume, radiusAt, rimHeight, type VesselProfile } from './profiles';
import { BubbleSprites } from '../visuals/BubbleSprites';
import { newLiquidMaterial, shadeLiquid, useLiquidMaterial } from '../visuals/liquid-fx';
import { dropFlash } from '../visuals/drop-flash';
import { Condensation } from '../visuals/ThermalFx';
import { vesselFx } from '../lab/vesselFx';
import { useReactionView } from '../lab/reaction-view';
import { reactionIntensity } from '../lab/reaction-animation';

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
/** Boiling / released gas from the simulation, or a live gas-producing reaction (mol/s). */
function gasIntensity(itemId: string): number {
  const rx = useReactionView.getState().vessels[itemId];
  const gas = rx && !rx.info && rx.until > performance.now() && rx.products.some((p) => p.phase === 'gas') ? reactionIntensity(rx.rate) : 0;
  return Math.min(1, Math.max(vesselFx.get(itemId)?.bubbles ?? 0, gas));
}

function Bubbles({ itemId, profile, bottom, top, fromSolid }: { itemId: string; profile: VesselProfile; bottom: number; top: number; fromSolid: boolean }) {
  return <BubbleSprites intensity={() => gasIntensity(itemId)} radiusAt={(y) => radiusAt(profile, y)} bottom={bottom} top={top} fromSolid={fromSolid} />;
}

const granuleGeometry = lazy(() => new IcosahedronGeometry(1, 0));

/** Metal pieces (granules, turnings) lie on the bottom as lumps, not as a flat layer. */
function Granules({ profile, bottom, ml, material }: { profile: VesselProfile; bottom: number; ml: number; material: MeshStandardMaterial }) {
  const size = Math.min(0.0028, radiusAt(profile, bottom + 0.004) * 0.42);
  const count = Math.max(1, Math.min(12, Math.round((ml * 1e-6) / ((4 / 3) * Math.PI * size ** 3))));
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const a = i * 2.39996 + 0.4,
          layer = Math.floor(i / 6),
          y = bottom + size * (0.8 + layer * 1.3),
          r = Math.max(0, radiusAt(profile, y) - size * 1.1) * Math.sqrt(((i * 0.618) % 1) * 0.9);
        return { p: [Math.cos(a) * r, y, Math.sin(a) * r] as [number, number, number], rot: [i * 1.3, i * 0.7, i * 2.1] as [number, number, number], s: [size * (0.9 + (i % 3) * 0.15), size * (0.65 + (i % 2) * 0.2), size * (1 + (i % 4) * 0.1)] as [number, number, number] };
      }),
    [count, size, bottom, profile],
  );
  return (
    <group userData={{ noOutline: true, noBatch: true }}>
      {pieces.map((g, i) => (
        <mesh key={i} geometry={granuleGeometry()} material={material} position={g.p} rotation={g.rot} scale={g.s} castShadow raycast={() => undefined} />
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
export function VesselContents(props: VesselContentsProps) {
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
  // Each small addition flashes its local color where it lands (titration pink, etc.).
  const previous=useRef(mixture);
  const flash=useMemo(()=>{const color=dropFlash(previous.current,mixture);previous.current=mixture;return color?{color,key:performance.now()}:null;},[mixture]);
  const rim = rimHeight(profile);
  const bottom = profile.wall[0][1];
  const sedimentTop = look.sedimentMl > 0.005 ? heightForVolume(profile, look.sedimentMl * (look.liquid ? 1 : 1.4)) : bottom;
  const liquidTop = look.liquid ? heightForVolume(profile, look.sedimentMl + look.liquidMl) : sedimentTop;
  const boundary=phases?.layered?heightForVolume(profile,look.sedimentMl+phases.aqueousMl):liquidTop;
  const precipitate=!!phases?.visiblePrecipitate&&(phases.suspension??0)>.01;
  const liquidMat = useLiquidMaterial(look.liquid ?? '#cfe6f5', look.turbidity, { agitated, pouring: receiving && flow, fizz: () => (itemId ? gasIntensity(itemId) : 0), flash, cloud: precipitate ? phases!.suspension : 0, cloudColor: phases?.precipitateColor ?? null, bottom: sedimentTop, top: boundary, radius: radiusAt(profile, (sedimentTop + boundary) / 2) });
  const organicMat=useLiquidMaterial(phases?.organicColor??'#eff2e9',0,{ agitated, cloud: 0, cloudColor: null, bottom: boundary, top: liquidTop, radius: radiusAt(profile, liquidTop) });
  const solidMat = useSolidMaterial(look.solidColor ?? '#ffffff', look.solidMetal);
  const rimR = radiusAt(profile, rim);
  const foamH = look.foamMl > 2 ? Math.min(0.12, (look.foamMl * 1e-6) / (Math.PI * rimR * rimR) + 0.003) : 0;
  const foamFrom = Math.max(liquidTop, sedimentTop);
  const showSediment = look.solidColor && sedimentTop - bottom > 0.0006;
  const showLiquid = look.liquid && liquidTop - sedimentTop > 0.0006;
  return (
    <group userData={{ noBatch: true }}>
      {look.solidMetal && look.solidColor ? <Granules profile={profile} bottom={bottom} ml={look.sedimentMl} material={solidMat} /> : showSediment && <mesh geometry={bandGeometry(profile, bottom, sedimentTop, 0.97)} material={solidMat} userData={{ noOutline: true, noBatch: true }} />}
      {showLiquid && !pouring && <mesh geometry={bandGeometry(profile, sedimentTop, boundary)} material={liquidMat} userData={{ noOutline: true, noBatch: true }} />}
      {pouring&&showLiquid&&<HydrostaticLiquid profile={profile} ml={look.liquidMl} color={look.liquid??'#e2f0fa'}/>}
      {showLiquid&&!pouring&&phases?.layered&&<mesh geometry={bandGeometry(profile,boundary,liquidTop)} material={organicMat} userData={{noOutline:true,noBatch:true}}/>}
      {showLiquid&&!pouring&&precipitate&&<ReactionCloud radius={Math.min(radiusAt(profile,liquidTop),radiusAt(profile,sedimentTop+.001))*.85} bottom={sedimentTop+.0005} top={boundary} color={phases?.precipitateColor??'#eee'} strength={phases!.suspension} agitated={agitated}/>}
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
      {itemId && look.liquid && <Bubbles itemId={itemId} profile={profile} bottom={sedimentTop} top={liquidTop} fromSolid={!!showSediment || look.solidMetal} />}
      {look.burning && <Flame y={Math.max(liquidTop, bottom)} radius={radiusAt(profile, liquidTop) * 0.9} />}
      {mixture && showLiquid && <Condensation profile={profile} bottom={bottom} top={liquidTop} temp={mixture.temp} />}
    </group>
  );
}
