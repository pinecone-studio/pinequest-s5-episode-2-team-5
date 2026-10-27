import {useGrade9Apparatus} from '../grade9/store';
import { isWorkbenchObject, isBenchPaused } from './session';
import { vesselObservation } from '../../lab/container-observation';
import { useEffect, useRef, useState } from 'react';
import { AmbientLight, CanvasTexture, Sprite, SpriteMaterial, Color, DirectionalLight, DynamicDrawUsage, InstancedMesh, MeshPhongMaterial, Object3D, PerspectiveCamera, Scene, SphereGeometry, WebGLRenderer } from 'three';
import { describe, heldObjectId, useSandbox } from '../nacl/sandbox';
import { useBenchView } from '../nacl/view';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useGameStore } from '../../store/useGameStore';
import { automaticReaction, useReactionView, type VesselReaction } from '../../lab/reaction-view';
import { reactionProjection } from './WorkbenchRuntime';
import { sounds } from '../../utils/sounds';
import { MoleculeViewerButton } from '../../ui/MoleculeViewer';
import { MolecularModel, type Species } from './molecules';

/** Atom offsets make each molecular species distinguishable in the shared instanced draw. */
const ATOMS: Record<Species, [number, number, number, string, number][]> = {
  Na: [[0, 0, 0, '#ae77ff', .085]], Cl: [[0, 0, 0, '#52db73', .09]], H: [[0, 0, 0, '#ffffff', .055]],
  CO3: [[0, 0, 0, '#7b8290', .065], [.09, 0, 0, '#f55457', .06], [-.045, .078, 0, '#f55457', .06], [-.045, -.078, 0, '#f55457', .06]],
  H2O: [[0, 0, 0, '#f55457', .065], [.075, -.04, 0, '#ffffff', .045], [-.075, -.04, 0, '#ffffff', .045]],
  H2: [[-.06, 0, 0, '#ffffff', .055], [.06, 0, 0, '#ffffff', .055]],
  O2: [[-.065, 0, 0, '#f55457', .065], [.065, 0, 0, '#f55457', .065]],
  OH: [[0, 0, 0, '#f55457', .065], [.075, 0, 0, '#ffffff', .045]],
  H2O2: [[-.05, 0, 0, '#f55457', .06], [.05, 0, 0, '#f55457', .06], [-.075, .08, 0, '#ffffff', .04], [.075, -.04, .069, '#ffffff', .04]],
  I: [[0,0,0,'#d285ff',.09]], K: [[0,0,0,'#a96aff',.09]], IO: [[-.04,0,0,'#d285ff',.08],[.075,0,0,'#f55457',.06]],
  steam: [[0, 0, 0, '#f55457', .065], [.075, -.04, 0, '#ffffff', .045], [-.075, -.04, 0, '#ffffff', .045]],
  CO2: [[0, 0, 0, '#434a56', .065], [-.105, 0, 0, '#f55457', .065], [.105, 0, 0, '#f55457', .065]],
};

/** A contents lens (nothing reacting) hides after this long until the selection or its contents change. */
const CONTENTS_TIMEOUT_MS = 8000;

/** Only what is held, selected or inspected right now; a container put down no longer keeps its lens. */
function lensTarget(): string | null {
  const game = useGameStore.getState();
  return (game.mode === 'inspect' ? game.inspectTarget?.sourceId : heldObjectId() ?? useBenchView.getState().selected) ?? null;
}

/** Select actual observed chemistry; looking/holding has priority over bench selection. */
function currentReaction(dismissed: number | null): VesselReaction | null {
  const game = useGameStore.getState();
  if (!['walk', 'bench', 'inspect'].includes(game.mode)) return null;
  const all = useReactionView.getState().vessels, now = performance.now();
  const nearby = game.mode === 'bench' || game.mode === 'walk' && useSandbox.getState().near;
  const automatic = nearby ? automaticReaction(all, now, dismissed, (id) => isWorkbenchObject(id) && !isBenchPaused(id)) : null;
  if (automatic) return automatic;
  if (!nearby && game.mode !== 'inspect') return null;
  const selected = lensTarget();
  if (selected && (describe(selected).capacity > 0 || ['jar', 'reagentJar', 'spat', 'spatula'].includes(describe(selected).role))) {
    const reaction = all[selected];
    if (reaction && !reaction.info && reaction.until > now) return reaction;
    const contents = vesselObservation(selected);
    if(useGrade9Apparatus.getState().rigs[selected]&&!contents.reactants.length)return null;
    // Stable identity until this container's species change; do not rebuild every poll.
    const key = `${selected}:${contents.reactants.map((s) => s.id).join(',')}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (Math.imul(hash, 31) + key.charCodeAt(i)) | 0;
    return { ...contents, vesselId: selected, episode: -1 - (hash >>> 0), until: now + 500 };
  }
  return null;
}
export function ReactionLens() {
  const mode = useGameStore((s) => s.mode);
  const dismissed = useRef<number | null>(null), contentsSince = useRef<{ episode: number; at: number } | null>(null);
  const target = useRef<string | null>(null);
  const [shown, setShown] = useState<VesselReaction | null>(null);
  const viewport = useRef<HTMLDivElement>(null), anchor = useRef<HTMLDivElement>(null), connector = useRef<SVGLineElement>(null);
  const quality = useSettingsStore((s) => s.quality), reduced = useSettingsStore((s) => s.reducedMotion);
  useEffect(() => {
    const poll = () => {
      const now = performance.now();
      // Picking up, selecting or inspecting again restarts a closed or timed-out contents lens
      // (contents episodes are negative); a closed live reaction stays closed.
      if (lensTarget() !== target.current) {
        target.current = lensTarget(); contentsSince.current = null;
        if (dismissed.current !== null && dismissed.current < 0) dismissed.current = null;
      }
      let next = currentReaction(dismissed.current);
      if (next?.info && contentsSince.current?.episode !== next.episode) contentsSince.current = { episode: next.episode, at: now };
      const timedOut = next?.info && useGameStore.getState().mode !== 'inspect' && now - (contentsSince.current?.at ?? now) > CONTENTS_TIMEOUT_MS;
      if (next && (next.episode === dismissed.current || timedOut)) next = null;
      setShown((previous) => {
        if (next) return next.episode === previous?.episode && Math.abs(next.temp - previous.temp) < .5 && next.equation === previous.equation && next.sentence === previous.sentence ? previous : next;
        if (previous && !previous.info && previous.until + 2500 > performance.now()
            && (useGameStore.getState().mode === 'bench' || useSandbox.getState().near)) return previous;
        return null;
      });
    };
    poll(); const timer = window.setInterval(poll, 100); return () => clearInterval(timer);
  }, [reduced]);
  const episode = shown?.episode;
  useEffect(() => {
    if (!viewport.current || !shown) return;
    const host = viewport.current, id = shown.vesselId;
    const model = new MolecularModel(shown, quality === 'low' || reduced ? 40 : 150);
    const colors = Object.fromEntries([...shown.reactants, ...shown.products, ...(shown.spectators ?? [])].map((s) => [s.id, s.color]));
    const renderer = new WebGLRenderer({ antialias: quality !== 'low', alpha: true, powerPreference: 'low-power' });
    const node = renderer.domElement;
    node.style.cssText = 'width:100%;height:100%;display:block'; host.appendChild(node);
    renderer.setSize(240, 240, false); renderer.setPixelRatio(1);
    const scene = new Scene(); scene.background = new Color('#102f47');
    const camera = new PerspectiveCamera(42, 1, .01, 10); camera.position.set(0, .3, 3.3); camera.lookAt(0, 0, 0);
    scene.add(new AmbientLight('#ffffff', 2));
    const light = new DirectionalLight('#c5eaff', 3); light.position.set(2, 4, 3); scene.add(light);
    const geometry = new SphereGeometry(1, quality === 'low' ? 8 : 12, 8), material = new MeshPhongMaterial({ shininess: 60 });
    const mesh = new InstancedMesh(geometry, material, model.limit * 4);
    mesh.instanceMatrix.setUsage(DynamicDrawUsage); mesh.frustumCulled = false; scene.add(mesh);
    const labels = ['I','IO','K'].map((species) => {
      const canvas = document.createElement('canvas'); canvas.width=160; canvas.height=64;
      const ctx=canvas.getContext('2d')!; ctx.font='bold 32px sans-serif'; ctx.textAlign='center'; ctx.fillStyle=species==='K'?'#ffffff':'#ffe570';
      ctx.fillText(species==='IO'?'IO⁻':species==='K'?'K⁺':'I⁻',80,42);
      const texture=new CanvasTexture(canvas), material=new SpriteMaterial({map:texture,depthTest:false,transparent:true});
      return {species,texture,material};
    });
    const sprites=Array.from({length:model.limit},()=>{const s=new Sprite(labels[0].material);s.visible=false;s.scale.set(.27,.11,1);scene.add(s);return s;});
    const atom = new Object3D(), color = new Color();
    let raf = 0, last = performance.now(), tickAt = 0, fizzAt = 0, lastHits = 0;
    node.dataset.particles = String(model.limit); node.dataset.preset = shown.preset;
    const update = (now: number) => {
      const rx = useReactionView.getState().vessels[id];
      const active = rx?.episode === episode && rx.until > now;
      const rate = active ? Math.min(3, rx.rate * (rx.rateUnit === 'g/s' ? 1 : 1000)) : 0;
      model.advance(Math.min(.04, (now - last) / 1000), rate, active ? rx.temp : shown.temp); last = now;
      let count = 0, labelCount=0;
      sprites.forEach((s)=>{s.visible=false;});
      for (const p of model.particles) {
        if (!p.active) continue;
        const label=labels.find((s)=>s.species===p.species);
        if(label) {const sprite=sprites[labelCount++];sprite.visible=true;sprite.material=label.material;sprite.position.set(p.x,p.y+.13,p.z);sprite.scale.setScalar(p.species!=='K'&&p.hits>0?.38:.27);sprite.scale.y*=.4;}

        const atoms = ATOMS[p.species] ?? [[0, 0, 0, colors[p.species] ?? '#b8d7ee', .085] as [number, number, number, string, number]];
        for (const [x, y, z, c, r] of atoms) {
          atom.position.set(p.x + x, p.y + y, p.z + z); atom.scale.setScalar(r); atom.updateMatrix();
          mesh.setMatrixAt(count, atom.matrix); color.set(c); if(shown.catalyst && ['I','IO'].includes(p.species) && p.hits>0)color.lerp(new Color('#ffe579'),.35+.25*Math.sin(now*.008)); mesh.setColorAt(count++, color);
        }
      }
      mesh.count = count; mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      renderer.render(scene, camera);
      node.dataset.collisions = String(model.collisions); node.dataset.products = String(model.products); node.dataset.escaped = String(model.escaped); node.dataset.catalyst = shown.catalyst ?? ''; node.dataset.intermediates=String(model.intermediates); node.dataset.turnovers=String(model.turnovers); node.dataset.rate=String(active?rx.rate:0);
      if (active && model.collisions > lastHits && now - tickAt > 140) {
        sounds.play('moleculeTick', Math.min(.8, .12 + (model.collisions - lastHits) * .04) * Math.min(1, rate)); tickAt = now;
      }
      lastHits = model.collisions;
      if (active && now - fizzAt > 240) {
        sounds.play(['precipitate', 'evap'].includes(shown.preset) ? 'crystalCrackle' : 'reactionFizz', Math.min(1, rate / 1.8)); fizzAt = now;
      }
      const inspecting = useGameStore.getState().mode === 'inspect';
      const projected = inspecting ? reactionProjection.inspect() : reactionProjection.project(id);
      if (anchor.current && projected) {
        const width = Math.min(270, innerWidth - 24);
        const reserve = inspecting ? 410 : useGameStore.getState().mode === 'bench' ? 300 : 12;
        const x = innerWidth < 640 ? 12 : Math.max(12, Math.min(innerWidth - width - reserve, projected.x + 30));
        const y = innerWidth < 640 ? Math.max(150, Math.min(260, innerHeight * .31)) : Math.max(75, Math.min(innerHeight - 405, projected.y - 150));
        anchor.current.style.transform = `translate(${x}px,${y}px)`;
        anchor.current.style.visibility = projected.visible ? 'visible' : 'hidden';
        anchor.current.style.opacity = '1';
        connector.current?.setAttribute('x1', String(projected.x)); connector.current?.setAttribute('y1', String(projected.y));
        connector.current?.setAttribute('x2', String(x + width / 2)); connector.current?.setAttribute('y2', String(y + 90));
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => { cancelAnimationFrame(raf); labels.forEach((l)=>{l.texture.dispose();l.material.dispose();}); node.remove(); mesh.dispose(); geometry.dispose(); material.dispose(); renderer.dispose(); renderer.forceContextLoss(); };
    // One particle population per reaction episode; instantaneous rates are read in RAF.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [episode, quality, reduced]);
  if (!['walk', 'bench', 'inspect'].includes(mode)) return null;
  if (!shown) return null;
  const legend = [...new Map([...shown.reactants, ...shown.products, ...(shown.spectators ?? [])].map((s) => [s.id, s])).values()];
  const close = () => { dismissed.current = shown.episode; setShown(null); };
  return <><svg className="pointer-events-none fixed inset-0 z-[51] h-full w-full" aria-hidden><line ref={connector} stroke="#a5dffc" strokeWidth="1.5" /></svg>
    <div ref={anchor} style={{ zIndex: mode === 'inspect' ? 52 : 32 }} className="pointer-events-none fixed left-0 top-0 z-[52] w-[min(270px,calc(100vw-24px))] text-lab-ink transition-opacity duration-700" aria-label="Урвалын молекулын линз" data-vessel={shown.vesselId}>
      <div className="pointer-events-none mx-auto w-40 overflow-hidden rounded-full border-2 border-sky-200 bg-slate-900 shadow-hud sm:w-56"><div ref={viewport} className="aspect-square w-full" aria-label="Сав доторх бөөмсийн хөдөлгөөн" /></div>
      <div className="pointer-events-auto text-center"><MoleculeViewerButton reaction={shown}/></div>
      <div className="pointer-events-none relative rounded-lg bg-white/95 p-2 px-7 text-center text-xs shadow-hud" aria-label="Урвалын тэгшитгэл">
        <button type="button" className="focus-ring pointer-events-auto absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full text-sm text-slate-500 hover:bg-slate-100" onClick={close} aria-label="Хаах" title="Хаах">✕</button>
        <b>{shown.equation}</b>{shown.catalyst && <p className="mt-1 text-[10px] text-indigo-800">I⁻ — катализатор, K⁺ — ажиглагч ион<br/>H₂O₂ + I⁻ → H₂O + IO⁻<br/>H₂O₂ + IO⁻ → H₂O + O₂↑ + I⁻</p>}<p className="mt-1 text-[11px]">{shown.sentence}</p>
        <div className="mt-1 hidden flex-wrap justify-center gap-x-2 gap-y-1 text-[10px] sm:flex">{legend.map((s) => <span key={s.id}>{s.name} {s.formula}</span>)}</div>
        <div className="mt-1 hidden text-[9px] text-slate-500 sm:block">Мөргөлдөөн ба хэмжээ нь тайлбарлах загвар · {shown.temp.toFixed(1)} °C</div>
      </div>
    </div></>;
}
