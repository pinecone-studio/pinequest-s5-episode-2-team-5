/** Bounded macro effects, driven by actual foam, temperature, products and mol/s. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Color, Object3D, type Group, type InstancedMesh, type Mesh, type MeshPhysicalMaterial, type MeshStandardMaterial } from 'three';
import { useReactionView } from '../lab/reaction-view';
import { useChemStore } from '../store/useChemStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useGameStore } from '../store/useGameStore';
import { CATALOG } from '../equipment/equipmentCatalog';
import { itemDescription, itemPosition, isWorkbenchObject, isBenchPaused } from '../experiments/workbench/session';
import { heldObjectId } from '../experiments/nacl/sandbox';
import { mixtureLook } from '../chemistry/color';
import { liquidMl } from '../chemistry/mixture';
import { reactionIntensity, foamOverflowHeight, foamPose, collapsedFoam } from '../lab/reaction-animation';
import { PROFILES, heightForVolume, radiusAt } from '../equipment/profiles';
import { surfaceYAt } from '../interaction/surfaces';
import { vesselFx } from '../lab/vesselFx';
import { sounds } from '../utils/sounds';
const residueUntil = new Map<string, number>();

function VesselEffect({ id }: {
    id: string;
}) {
    const root = useRef<Group>(null), foam = useRef<InstancedMesh>(null), steam = useRef<InstancedMesh>(null), cloud = useRef<InstancedMesh>(null), smoke = useRef<InstancedMesh>(null);
    const low = useSettingsStore((s) => s.quality === 'low' || s.reducedMotion);
    const n = low ? 24 : 72, dummy = useMemo(() => new Object3D(), []), tint = useMemo(() => new Color(), []);
    const residue = useRef<Mesh>(null);
    const residueState = useRef({ volume: 0, age: 0, at: new Object3D().position, landed: false });
    const audio = useRef({ at: 0, erupted: false });
    const motion = useRef({ time: 0, foam: 0, peakFoam: 0, spillAge: 0 });
    const white = useMemo(() => new Color('white'), []);
    const reaction = useReactionView((s) => s.vessels[id]);
    const productGas = reaction?.products.find((p) => p.phase === 'gas');
    useFrame((_, rawDt) => {
        if (!root.current || !foam.current || !steam.current || !cloud.current || !smoke.current)
            return;
        const m = useChemStore.getState().mixtures[id], rx = useReactionView.getState().vessels[id], now = performance.now();
        const paused = isBenchPaused(id) || !['bench', 'walk', 'inspect'].includes(useGameStore.getState().mode);
        if (!m || paused) {
            root.current.visible = false;
            if (residue.current) residue.current.visible = false;
            if (!m) residueUntil.delete(id);
            return;
        }
        root.current.visible = true;
        root.current.position.copy(itemPosition(id));
        const kind = itemDescription(id).kind, spec = kind ? CATALOG[kind] : null;
        const height = spec?.size[1] ?? .12, radius = Math.max(.006, Math.min(.065, (spec?.size[0] ?? .07) * .43));
        const actualRate = rx && rx.until > now && !rx.info ? rx.rate : 0;
        const intensity = reactionIntensity(actualRate), hasSoap = (m.aq.soap ?? 0) > 1e-9;
        const available = (spec?.capacityMl ?? 100) - liquidMl(m);
        const wantedFoam = foamOverflowHeight(m.foam, available, radius, hasSoap);
        const elapsed = Math.min(.05, Math.max(0, rawDt));
        motion.current.time += elapsed;
        motion.current.foam += (wantedFoam - motion.current.foam) * Math.min(1, elapsed * (wantedFoam > motion.current.foam ? 7 : 6));
        const foamHeight = motion.current.foam;
        motion.current.peakFoam = Math.max(motion.current.peakFoam, foamHeight);
        // Follow drainage continuously: lower the body while revealing the wet film.
        const drained = motion.current.peakFoam > .002
            ? Math.max(0, Math.min(1, 1 - foamHeight / motion.current.peakFoam)) : 0;
        const settling = drained * drained * (3 - 2 * drained);
        const wet = residueState.current;
        if (residue.current) {
            wet.age += elapsed;
            const landed = motion.current.spillAge > Math.sqrt(height / 1.25);
            if (landed && foamHeight > .002) {
                const arriving = foamHeight * Math.PI * radius * radius * 1e6 * .06;
                wet.volume = Math.max(wet.volume, arriving);
                if (!wet.landed) { wet.at.copy(root.current.position); wet.at.y = surfaceYAt(wet.at.x, wet.at.z, wet.at.y + .02); wet.landed = true; }
                wet.age = 0;
                residueUntil.set(id, now + 90000);
            }
            const appearance = collapsedFoam(wet.volume, wet.age);
            residue.current.visible = wet.landed && appearance.opacity > .01;
            residue.current.position.copy(wet.at).y += .002;
            residue.current.scale.set(appearance.radius, appearance.thickness, appearance.radius);
            const material = residue.current.material as MeshPhysicalMaterial;
            material.opacity = appearance.opacity * (.2 + .8 * settling);
            material.color.set(mixtureLook(m).liquid ?? '#d8eeef').lerp(white, .3);
        }
        const effectTime = motion.current.time;
        const profile = kind && kind in PROFILES ? PROFILES[kind as keyof typeof PROFILES] : null;
        const surface = profile ? heightForVolume(profile, liquidMl(m)) : height * Math.min(.94, liquidMl(m) / Math.max(1, spec?.capacityMl ?? 150));
        // At the rim the real foam already occupies the headspace. Overflow becomes a
        // visible column, then lobes running down to the supporting bench.
        const foamCount = foamHeight > .002 ? n : 0;
        motion.current.spillAge = foamCount ? motion.current.spillAge + elapsed : 0;
        foam.current.count = foamCount;
        for (let i = 0; i < foamCount; i++) {
            const pose = foamPose(i, n, foamHeight * Math.PI * radius * radius * 1e6, radius, height, motion.current.spillAge);
            if (pose) {
                const flatten = 1 - settling * .96;
                const spread = 1 + settling * .22;
                dummy.position.set(pose.x * spread, pose.y * flatten, pose.z * spread);
                dummy.scale.set(pose.sx * spread, pose.sy * flatten, pose.sz * spread);
            } else dummy.scale.setScalar(0);
            dummy.updateMatrix();
            foam.current.setMatrixAt(i, dummy.matrix);
        }
        foam.current.instanceMatrix.needsUpdate = true;
        const look = mixtureLook(m);
        tint.set(look.liquid ?? '#e9f8ff');
        const foamMat = foam.current.material as MeshStandardMaterial;
        foamMat.color.lerp(tint.lerp(white, .8), Math.min(1, rawDt * 3));
        foamMat.opacity = Math.min(1, foamHeight / .02) * (1 - settling * .8);
        foamMat.roughness = .95 - settling * .65;
        if (foamHeight < .0001 && wantedFoam < .0001) motion.current.peakFoam = 0;
        // Gas bubbles are drawn inside the vessel by VesselContents (visible through glass).
        const gasIntensity = productGas && actualRate > 0 ? intensity : 0;
        const fx = vesselFx.get(id);
        const steamIntensity = liquidMl(m) > .05 ? fx?.steam ?? 0 : 0;
        const steamCount = steamIntensity > .03 ? Math.max(2, Math.round(n / 3 * steamIntensity)) : 0;
        steam.current.count = steamCount;
        for (let i = 0; i < steamCount; i++) {
            const u = (effectTime * .35 + i / Math.max(1, steamCount)) % 1;
            dummy.position.set(Math.sin(i * 4 + u * 3) * radius * (1 + u * 2), height + foamHeight + u * .4, Math.cos(i * 2) * radius);
            const fade = Math.sin(Math.PI * u);
            dummy.scale.set((.008 + u * .025) * fade, (.015 + u * .045) * fade, (.008 + u * .025) * fade);
            dummy.updateMatrix();
            steam.current.setMatrixAt(i, dummy.matrix);
        }
        steam.current.instanceMatrix.needsUpdate = true;
        const smokeIntensity = fx?.smoke ?? 0;
        const smokeCount = smokeIntensity > .01 ? Math.max(2, Math.round(n / 3 * smokeIntensity)) : 0;
        smoke.current.count = smokeCount;
        for (let i = 0; i < smokeCount; i++) {
            const u = (effectTime * .45 + i / smokeCount) % 1;
            const fade = Math.sin(Math.PI * u);
            dummy.position.set(Math.sin(i * 2.4 + u * 4) * radius * (1 + u), height + u * .45, Math.cos(i * 2.4 + u * 3) * radius * (1 + u));
            dummy.scale.setScalar((.008 + u * .04) * fade);
            dummy.updateMatrix(); smoke.current.setMatrixAt(i, dummy.matrix);
        }
        smoke.current.instanceMatrix.needsUpdate = true;
        // Metal pieces sink at once; only powders and precipitates are stirred up.
        const cloudCount = look.sedimentMl > .001 && !look.solidMetal && liquidMl(m) > .05 ? Math.round(n * .6) : 0;
        cloud.current.count = cloudCount;
        (cloud.current.material as MeshStandardMaterial).color.lerp(tint.set(look.solidColor ?? '#ffffff'), Math.min(1, rawDt * 2));
        for (let i = 0; i < cloudCount; i++) {
            const u = (i * .618) % 1;
            const suspended = Math.max(0, Math.min(1, m.cloud));
            const y = Math.min(surface, .004 + u * Math.max(0, surface - .006) * suspended);
            const cloudRadius = profile ? Math.min(radius, radiusAt(profile, y) * .8) : radius;
            const angle = i * 2.4 + (low ? 0 : effectTime * .3 * suspended);
            dummy.position.set(Math.cos(angle) * cloudRadius * Math.sqrt(u) * .8, y, Math.sin(angle) * cloudRadius * Math.sqrt(u) * .8);
            const clump = Math.min(cloudRadius * .27, .0015 + suspended * .004);
            const grain = .8 + ((i * .37) % 1) * .4;
            dummy.scale.set(clump * grain, clump * .75, clump / grain);
            dummy.updateMatrix();
            cloud.current.setMatrixAt(i, dummy.matrix);
        }
        cloud.current.instanceMatrix.needsUpdate = true;
        if (now - audio.current.at > (low ? 650 : 380) && actualRate > 0) {
            if (rx?.effect === 'precipitate' || gasIntensity > 0) sounds.play(rx?.effect === 'precipitate' ? 'crystalCrackle' : 'reactionFizz', Math.min(.7, intensity * (rx?.effect === 'precipitate' ? .35 : .7)));
            if (gasIntensity > .12)
                sounds.play('bubble', intensity * .6);
            if (steamIntensity > .2)
                sounds.play('sizzle', steamIntensity * .45);
            audio.current.at = now;
        }
        if (foamHeight > .025 && !audio.current.erupted) {
            sounds.play('eruption', .95);
            audio.current.erupted = true;
        }
        if (foamHeight < .005)
            audio.current.erupted = false;
    });
    return <><mesh name={`reaction-residue-${id}`} ref={residue} visible={false} raycast={() => undefined} userData={{ noBatch: true, noOutline: true }}>
      <sphereGeometry args={[1, 32, 12]} />
      <meshPhysicalMaterial transparent opacity={0} roughness={.16} metalness={0} clearcoat={1} depthWrite={false} />
    </mesh><group name={`reaction-effects-${id}`} ref={root} userData={{ noBatch: true, noOutline: true }}>
    <instancedMesh name="reaction-foam" ref={foam} args={[undefined, undefined, n]} frustumCulled={false} raycast={() => undefined}><sphereGeometry args={[1, low ? 12 : 20, 12]}/><meshStandardMaterial color="#fffefa" roughness={.95} transparent opacity={1}/></instancedMesh>
    <instancedMesh ref={steam} args={[undefined, undefined, n]} frustumCulled={false} raycast={() => undefined}><sphereGeometry args={[1, 6, 4]}/><meshStandardMaterial color="white" transparent opacity={.13} depthWrite={false}/></instancedMesh>
    <instancedMesh name="reaction-smoke" ref={smoke} args={[undefined, undefined, n]} frustumCulled={false} raycast={() => undefined}><sphereGeometry args={[1, 8, 6]}/><meshStandardMaterial color="#625b58" transparent opacity={.16} depthWrite={false}/></instancedMesh>
    <instancedMesh name="reaction-cloud" ref={cloud} args={[undefined, undefined, n]} frustumCulled={false} raycast={() => undefined}><icosahedronGeometry args={[1, 0]}/><meshStandardMaterial color="white" roughness={.95}/></instancedMesh>
    {productGas && !reaction?.info && <Html position={[0, (itemDescription(id).kind ? CATALOG[itemDescription(id).kind!].size[1] : .15) + .04, 0]} center style={{ pointerEvents: 'none' }}><span data-gas={productGas.id} className="whitespace-nowrap rounded-full bg-white/95 px-2 py-1 text-sm font-bold text-sky-900 shadow">{productGas.formula.replace(/↑$/, '')}↑</span></Html>}
  </group></>;
}
export function ReactionEffects() {
    const [ids, setIds] = useState<string[]>([]);
    useEffect(() => {
        const timer = window.setInterval(() => {
            const now = performance.now(), all = useReactionView.getState().vessels;
            for (const [id, until] of residueUntil) if (until < now || !useChemStore.getState().mixtures[id]) residueUntil.delete(id);
            const next = [...new Set([...Object.keys(all), ...vesselFx.keys(), ...residueUntil.keys()])].filter((id) => ((residueUntil.get(id) ?? 0) > now || all[id]?.until > now || (vesselFx.get(id)?.steam ?? 0) > .01 || (vesselFx.get(id)?.smoke ?? 0) > .01 || (useChemStore.getState().mixtures[id]?.foam ?? 0) > 2 || all[id]?.effect === 'precipitate' && (useChemStore.getState().mixtures[id]?.cloud ?? 0) > .03) && (residueUntil.has(id) || isWorkbenchObject(id) || heldObjectId() === id || useGameStore.getState().focus?.id === id)).slice(0, 4);
            setIds((old) => old.join('|') === next.join('|') ? old : next);
        }, 200);
        return () => clearInterval(timer);
    }, []);
    return <>{ids.map((id) => <VesselEffect key={id} id={id}/>)}</>;
}
