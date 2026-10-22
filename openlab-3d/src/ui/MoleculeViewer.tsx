import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Billboard, OrbitControls, Text } from '@react-three/drei';
import { Quaternion, Vector3 } from 'three';
import type { OrbitControls as Controls } from 'three-stdlib';
import { ELEMENTS, moleculeGeometry, type ModelBond, type MoleculeGeometry } from '../chemistry/molecules3d';
import { atom, ion, solid, type MoleculeSpec, type ReactionObservation } from '../chemistry/reaction-view';
import type { AqId, SolidId } from '../chemistry/species';
import { useReactionView } from '../lab/reaction-view';
import { closePresentation, usePresentation } from '../lab/presentation';
import { mixtureOf } from '../store/useChemStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { interactables } from '../interaction/registry';
import { releaseLock } from '../controls/usePointerLock';
import { useSettingsStore } from '../store/useSettingsStore';
import { FONTS } from '../utils/fonts';
export function vesselObservation(id: string): ReactionObservation {
    const reaction = useReactionView.getState().vessels[id];
    if (reaction)
        return reaction;
    const inv = useInventoryStore.getState(), item = inv.held?.id === id ? inv.held : inv.worldItems.find((w) => w.id === id);
    const target = interactables.get(id)?.useTarget;
    const m = mixtureOf(id, item?.variant ?? (target?.type === 'item' ? target.variant : undefined));
    const species = [...Object.entries(m.aq).filter(([, n]) => n > 1e-10).map(([key]) => ion(key as AqId)), ...Object.entries(m.s).filter(([, n]) => n > 1e-10).map(([key]) => solid(key as SolidId))];
    if (m.water > 0)
        species.unshift(atom('H2O', 'Ус', 'H₂O', '#ef3038'));
    if (m.ethanol > 0)
        species.push(atom('ethanol', 'Этанол', 'C₂H₅OH', '#ffffff'));
    return { preset: 'generic', key: `contents:${id}`, reactants: species, products: [], rate: 0, info: true, temp: m.temp, equation: 'Сав доторх бодисууд', sentence: 'Одоогийн агуулгын бүтцийг сонгон харна уу.', effect: 'water' };
}
export function openMoleculeViewer(reaction: ReactionObservation) {
    releaseLock();
    usePresentation.setState({ modal: 'molecules', reaction });
}
export function MoleculeViewerButton({ id, reaction }: {
    id?: string;
    reaction?: ReactionObservation;
}) {
    return <button className="pointer-events-auto my-2 min-h-9 rounded-lg border border-sky-300 bg-white px-3 py-2 text-xs font-semibold text-sky-800" onClick={() => openMoleculeViewer(reaction ?? vesselObservation(id!))}>Молекулыг 3D-ээр харах</button>;
}
function Bond({ bond, geometry }: {
    bond: ModelBond;
    geometry: MoleculeGeometry;
}) {
    const from = new Vector3(...geometry.atoms[bond.from].at), to = new Vector3(...geometry.atoms[bond.to].at);
    const direction = to.clone().sub(from), rotation = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction.clone().normalize());
    const offset = direction.clone().cross(new Vector3(0, 0, 1)).normalize().multiplyScalar(.10);
    return <>{Array.from({ length: bond.order }, (_, i) => {
            const center = from.clone().add(to).multiplyScalar(.5).addScaledVector(offset, i - (bond.order - 1) / 2);
            return <mesh key={i} position={center} quaternion={rotation}><cylinderGeometry args={[.055, .055, direction.length(), 10]}/><meshStandardMaterial color="#aebac8" roughness={.35}/></mesh>;
        })}</>;
}
function Molecule({ species, position }: {
    species: MoleculeSpec;
    position: [
        number,
        number,
        number
    ];
}) {
    const geometry = useMemo(() => moleculeGeometry(species.id, species.formula), [species.id, species.formula]);
    const center = geometry.atoms.reduce((v, a) => v.add(new Vector3(...a.at)), new Vector3()).multiplyScalar(1 / Math.max(1, geometry.atoms.length));
    const extent = Math.max(.8, ...geometry.atoms.map((a) => new Vector3(...a.at).distanceTo(center)));
    return <group position={position} scale={1.25 / extent}><group position={center.clone().negate()}>
    {geometry.bonds.map((bond, i) => <Bond key={i} bond={bond} geometry={geometry}/>)}
    {geometry.atoms.map((a, i) => {
            const e = ELEMENTS[a.element] ?? { color: '#8092ad', radius: .45 };
            return <group key={i} position={a.at}><mesh><sphereGeometry args={[e.radius, 20, 14]}/><meshStandardMaterial color={e.color} roughness={.28} metalness={.06}/></mesh><Billboard><Text font={FONTS.semibold} position={[0, 0, e.radius + .025]} fontSize={a.element.length > 3 ? .14 : .23} color={a.element === 'H' ? '#15263e' : '#ffffff'} outlineWidth={.012} outlineColor="#182638" anchorX="center" anchorY="middle">{a.element}{a.charge ?? ''}</Text></Billboard></group>;
        })}
  </group></group>;
}
function ViewerControls() {
    const ref = useRef<Controls>(null), touched = useRef(-Infinity);
    const reduced = useSettingsStore((s) => s.reducedMotion);
    useFrame(() => { if (ref.current)
        ref.current.autoRotate = !reduced && performance.now() - touched.current > 2500; });
    return <OrbitControls ref={ref} makeDefault minDistance={1.5} maxDistance={35} autoRotate autoRotateSpeed={.65} enableDamping onStart={() => { touched.current = Infinity; }} onEnd={() => { touched.current = performance.now(); }}/>;
}
export function MoleculeStage({ species, all = false, reactantCount = 0 }: {
    species: MoleculeSpec[];
    all?: boolean;
    reactantCount?: number;
}) {
    const n = species.length;
    return <Canvas dpr={[1, 1.5]} camera={{ position: [0, 1.5, Math.max(5, n * 1.9)], fov: 38, near: .01, far: 100 }} style={{ touchAction: 'none', cursor: 'grab' }} aria-label="Элементийн тэмдэгтэй 3D молекул; чирж эргүүлж, гүйлгэж томруулна">
    <color attach="background" args={['#132e46']}/><ambientLight intensity={1.8}/><directionalLight position={[3, 5, 4]} intensity={2.5}/>
    <Suspense fallback={null}>{species.map((s, i) => <Molecule key={`${s.id}:${i}`} species={s} position={[(i - (n - 1) / 2) * 3.2, 0, 0]}/>)}
      {all && reactantCount > 0 && reactantCount < n && <Billboard position={[(reactantCount - n / 2) * 3.2, 1.7, 0]}><Text font={FONTS.bold} fontSize={.6} color="white">→</Text></Billboard>}
    </Suspense><ViewerControls />
  </Canvas>;
}
export function MoleculeViewerPanel() {
    const modal = usePresentation((s) => s.modal), reaction = usePresentation((s) => s.reaction);
    const [selected, setSelected] = useState('all');
    if (modal !== 'molecules' || !reaction)
        return null;
    const species = [...new Map([...reaction.reactants, ...reaction.products, ...(reaction.spectators ?? [])].map((s) => [s.id, s])).values()];
    const chosen = species.find((s) => s.id === selected), visible = chosen ? [chosen] : species;
    const atoms = visible.flatMap((s) => moleculeGeometry(s.id, s.formula).atoms);
    const elements = [...new Set(atoms.map((a) => a.element))];
    return <div role="dialog" aria-modal="true" aria-label="Молекулын 3D загвар" className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/65 p-3" onPointerDown={(e) => e.stopPropagation()}>
    <section className="flex max-h-[95dvh] w-full max-w-4xl flex-col overflow-auto rounded-2xl bg-white p-3 text-lab-ink shadow-2xl sm:p-5">
      <header className="flex items-center justify-between"><h2 className="font-bold">Молекулын 3D загвар</h2><button className="min-h-9 px-3" aria-label="Молекулын загварыг хаах" onClick={closePresentation}>✕</button></header>
      <div className="my-2 flex flex-wrap gap-2"><button className="rounded-full border px-3 py-2 text-xs" aria-pressed={!chosen} onClick={() => setSelected('all')}>Бүгдийг</button>{species.map((s) => <button key={s.id} className={`rounded-full border px-3 py-2 text-xs ${selected === s.id ? 'border-sky-600 bg-sky-50' : ''}`} aria-pressed={selected === s.id} onClick={() => setSelected(s.id)}>{s.formula} · {s.name}</button>)}</div>
      <div className="h-[40dvh] min-h-48 overflow-hidden rounded-xl" data-atom-count={atoms.length} data-atom-symbols={atoms.map((a) => a.element).join(' ')}><MoleculeStage key={selected + reaction.key} species={visible} all={!chosen} reactantCount={reaction.reactants.length}/></div>
      <div className="my-2 flex flex-wrap gap-2">{elements.map((e) => <span key={e} className="rounded-full border border-slate-200 px-2 py-1 text-xs"><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: ELEMENTS[e]?.color ?? '#8092ad' }}/>{e} — {ELEMENTS[e]?.name ?? 'Бодисын тэмдэг'}</span>)}</div>
      <p className="text-xs text-slate-600">Чирж эргүүл · Дугуй / хоёр хуруугаар ойртуул · Түр зогсоход автоматаар эргэнэ.</p>
      {chosen && <p className="mt-2 text-xs">{moleculeGeometry(chosen.id, chosen.formula).note}</p>}
      <p className="mt-2 text-sm font-semibold">{reaction.equation}</p><p className="mt-1 text-xs">{reaction.sentence}</p>
    </section>
  </div>;
}
