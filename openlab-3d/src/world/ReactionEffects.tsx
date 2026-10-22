/** Bounded macro effects, driven by actual foam, temperature, products and mol/s. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { Color, Object3D, type Group, type InstancedMesh, type MeshStandardMaterial } from 'three';
import { useReactionView } from '../lab/reaction-view';
import { useChemStore } from '../store/useChemStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { useGameStore } from '../store/useGameStore';
import { CATALOG } from '../equipment/equipmentCatalog';
import { itemDescription, itemPosition, isWorkbenchObject, isBenchPaused } from '../experiments/workbench/session';
import { heldObjectId } from '../experiments/nacl/sandbox';
import { mixtureLook } from '../chemistry/color';
import { liquidMl } from '../chemistry/mixture';
import { sounds } from '../utils/sounds';
function VesselEffect({ id }: {
    id: string;
}) {
    const root = useRef<Group>(null), foam = useRef<InstancedMesh>(null), gas = useRef<InstancedMesh>(null), steam = useRef<InstancedMesh>(null), cloud = useRef<InstancedMesh>(null);
    const low = useSettingsStore((s) => s.quality === 'low' || s.reducedMotion);
    const n = low ? 24 : 72, dummy = useMemo(() => new Object3D(), []), tint = useMemo(() => new Color(), []);
    const audio = useRef({ at: 0, erupted: false });
    const reaction = useReactionView((s) => s.vessels[id]);
    const productGas = reaction?.products.find((p) => p.phase === 'gas');
    useFrame(({ clock }, rawDt) => {
        if (!root.current || !foam.current || !gas.current || !steam.current || !cloud.current)
            return;
        const m = useChemStore.getState().mixtures[id], rx = useReactionView.getState().vessels[id], now = performance.now();
        const paused = isBenchPaused(id) || !['bench', 'walk', 'inspect'].includes(useGameStore.getState().mode);
        if (!m || paused) {
            root.current.visible = false;
            return;
        }
        root.current.visible = true;
        root.current.position.copy(itemPosition(id));
        const kind = itemDescription(id).kind, spec = kind ? CATALOG[kind] : null;
        const height = spec?.size[1] ?? .12, radius = Math.max(.018, Math.min(.065, (spec?.size[0] ?? .07) * .36));
        const actualRate = rx && rx.until > now && !rx.info ? rx.rate : 0;
        const intensity = Math.min(1, actualRate * 2200), hasSoap = (m.aq.soap ?? 0) > 1e-9;
        const available = (spec?.capacityMl ?? 100) - liquidMl(m);
        const foamHeight = hasSoap ? Math.min(.95, Math.max(0, m.foam - Math.max(0, available)) * .000001 / (Math.PI * radius * radius)) : 0;
        // At the rim the real foam already occupies the headspace. Overflow becomes a
        // visible column, then lobes running down to the supporting bench.
        const foamCount = foamHeight > .002 ? n : 0;
        foam.current.count = foamCount;
        for (let i = 0; i < foamCount; i++) {
            const u = i / n, angle = i * 2.39996, column = i < n * .7;
            const spread = column ? radius * .8 : radius + Math.min(.28, foamHeight * .35) * (u - .7) / .3;
            const y = column ? height + u / .7 * foamHeight : Math.max(.015, height - (u - .7) / .3 * height);
            dummy.position.set(Math.cos(angle) * spread, y, Math.sin(angle) * spread);
            const wobble = low ? 1 : 1 + Math.sin(clock.elapsedTime * 3 + i) * .08;
            dummy.scale.set(radius * .85 * wobble, Math.max(.02, foamHeight / n * 3.6), radius * .85 * wobble);
            dummy.updateMatrix();
            foam.current.setMatrixAt(i, dummy.matrix);
        }
        foam.current.instanceMatrix.needsUpdate = true;
        const look = mixtureLook(m);
        tint.set(look.liquid ?? '#e9f8ff');
        const foamMat = foam.current.material as MeshStandardMaterial;
        foamMat.color.lerp(tint.clone().lerp(new Color('white'), .88), Math.min(1, rawDt * 3));
        const gasCount = intensity > .005 ? Math.max(3, Math.round(n * intensity)) : 0;
        gas.current.count = gasCount;
        for (let i = 0; i < gasCount; i++) {
            const u = (clock.elapsedTime * (low ? .6 : 1.2) + i / n) % 1, angle = i * 2.39996;
            dummy.position.set(Math.cos(angle) * radius * .7, height * .1 + u * (height + .32), Math.sin(angle) * radius * .7);
            dummy.scale.setScalar((.002 + u * .009) * (1 + intensity));
            dummy.updateMatrix();
            gas.current.setMatrixAt(i, dummy.matrix);
        }
        gas.current.instanceMatrix.needsUpdate = true;
        const steamIntensity = Math.min(1, Math.max(0, (m.temp - 28) / 35) + foamHeight * .5);
        const steamCount = steamIntensity > .03 ? Math.max(2, Math.round(n / 3 * steamIntensity)) : 0;
        steam.current.count = steamCount;
        for (let i = 0; i < steamCount; i++) {
            const u = (clock.elapsedTime * .35 + i / Math.max(1, steamCount)) % 1;
            dummy.position.set(Math.sin(i * 4 + u * 3) * radius * (1 + u * 2), height + foamHeight + u * .4, Math.cos(i * 2) * radius);
            dummy.scale.set(.015 + u * .045, .02 + u * .08, .015 + u * .045);
            dummy.updateMatrix();
            steam.current.setMatrixAt(i, dummy.matrix);
        }
        steam.current.instanceMatrix.needsUpdate = true;
        const cloudCount = look.sedimentMl > .001 || rx?.effect === 'precipitate' ? Math.round(n * .6) : 0;
        cloud.current.count = cloudCount;
        (cloud.current.material as MeshStandardMaterial).color.lerp(new Color(look.solidColor ?? '#ffffff'), Math.min(1, rawDt * 2));
        for (let i = 0; i < cloudCount; i++) {
            const u = (i * .618) % 1, y = .008 + u * height * .75 * Math.max(.04, m.cloud);
            dummy.position.set(Math.cos(i * 2.4) * radius * Math.sqrt(u) * .8, y, Math.sin(i * 2.4) * radius * Math.sqrt(u) * .8);
            dummy.scale.setScalar(.003 + m.cloud * .006);
            dummy.updateMatrix();
            cloud.current.setMatrixAt(i, dummy.matrix);
        }
        cloud.current.instanceMatrix.needsUpdate = true;
        if (now - audio.current.at > 180 && actualRate > 0) {
            sounds.play(rx?.effect === 'precipitate' ? 'crystalCrackle' : 'reactionFizz', Math.min(.95, intensity * .85));
            if (intensity > .12)
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
    return <group ref={root} userData={{ noBatch: true, noOutline: true }}>
    <instancedMesh ref={foam} args={[undefined, undefined, n]} frustumCulled={false} raycast={() => undefined}><sphereGeometry args={[1, low ? 8 : 12, 8]}/><meshStandardMaterial color="#fffefa" roughness={.8}/></instancedMesh>
    <instancedMesh ref={gas} args={[undefined, undefined, n]} frustumCulled={false} raycast={() => undefined}><sphereGeometry args={[1, 6, 4]}/><meshStandardMaterial color="#e8f8ff" transparent opacity={.45} depthWrite={false}/></instancedMesh>
    <instancedMesh ref={steam} args={[undefined, undefined, n]} frustumCulled={false} raycast={() => undefined}><sphereGeometry args={[1, 6, 4]}/><meshStandardMaterial color="white" transparent opacity={.13} depthWrite={false}/></instancedMesh>
    <instancedMesh ref={cloud} args={[undefined, undefined, n]} frustumCulled={false} raycast={() => undefined}><sphereGeometry args={[1, 6, 4]}/><meshStandardMaterial color="white" transparent opacity={.7} depthWrite={false}/></instancedMesh>
    {productGas && !reaction?.info && <Html position={[0, (itemDescription(id).kind ? CATALOG[itemDescription(id).kind!].size[1] : .15) + .04, 0]} center style={{ pointerEvents: 'none' }}><span data-gas={productGas.id} className="whitespace-nowrap rounded-full bg-white/95 px-2 py-1 text-sm font-bold text-sky-900 shadow">{productGas.formula.replace(/↑$/, '')}↑</span></Html>}
  </group>;
}
export function ReactionEffects() {
    const [ids, setIds] = useState<string[]>([]);
    useEffect(() => {
        const timer = window.setInterval(() => {
            const now = performance.now(), all = useReactionView.getState().vessels;
            const next = Object.keys(all).filter((id) => (all[id].until > now || (useChemStore.getState().mixtures[id]?.foam ?? 0) > 2) && (isWorkbenchObject(id) || heldObjectId() === id || useGameStore.getState().focus?.id === id)).slice(0, 4);
            setIds((old) => old.join('|') === next.join('|') ? old : next);
        }, 200);
        return () => clearInterval(timer);
    }, []);
    return <>{ids.map((id) => <VesselEffect key={id} id={id}/>)}</>;
}
