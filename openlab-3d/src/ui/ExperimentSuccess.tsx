import { useEffect, useRef } from 'react';
import { usePresentation, closePresentation } from '../lab/presentation';
import { useLabStore, experimentDone } from '../store/useLabStore';
import { experimentById } from '../lab/experiments';
import { useChemStore } from '../store/useChemStore';
import { useReactionView } from '../lab/reaction-view';
import { atom, solid, evaporationReaction, type ReactionObservation } from '../chemistry/reaction-view';
import { currentSession, isWorkbenchObject, itemDescription, repeatBenchExperiment } from '../experiments/workbench/session';
import { useGameStore } from '../store/useGameStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { endHeldUse } from '../interaction/useHeld';
import { releaseLock } from '../controls/usePointerLock';
import { exitBench } from '../experiments/nacl/bench';
import { MoleculeStage } from './MoleculeViewer';
import { sounds } from '../utils/sounds';
import { useShowcase } from '../experiments/workbench/guidance/showcase';
import { useProtocolResults } from '../experiments/workbench/guidance/results';
import { useDemoDone, useDemoShown } from '../experiments/workbench/guidance/hud-space';
import { isGrade8Lab } from '../experiments/workbench/guidance/grade8';
import { vesselFx } from '../lab/vesselFx';
function resultFor(id: string): ReactionObservation | null {
    const vessels = useReactionView.getState().vessels, mixtures = useChemStore.getState().mixtures;
    const candidates = Object.values(vessels).filter((r) => isWorkbenchObject(r.vesselId));
    const matching = candidates.find((r) => {
        const m = mixtures[r.vesselId];
        if (r.info || !m)
            return false;
        if (id === 'elephant')
            return r.preset === 'peroxide' && r.catalyst === 'iodide' && (m.aq.soap ?? 0) > 0 && m.foam > 2;
        if (id === 'precipitates')
            return r.products.some((p) => p.phase === 'solid' && (m.s[p.id.replace('solid-', '') as keyof typeof m.s] ?? 0) > 1e-8);
        if (id === 'gases')
            return ['acid', 'metal'].includes(r.preset) && r.rate > 1e-7;
        if (id === 'titration')
            return r.preset === 'neutral' && r.until > performance.now();
        if (id === 'color-tests' || id === 'indicators')
            return r.effect === 'color' && r.until > performance.now();
        if (id === 'crystals' || id === 'cuso4')
            return r.preset === 'evap' && r.products.some((s) => s.phase === 'solid');
        return false;
    });
    if (matching)
        return matching;
    if (id === 'nacl') {
        const hasCrystal = Object.entries(mixtures).some(([object, m]) => isWorkbenchObject(object) && !itemDescription(object).reagent && (m.s.NaCl ?? 0) > .00001);
        if (hasCrystal) {
            const r = evaporationReaction(0, 22, 'NaCl');
            r.equation = 'Na₂CO₃ + 2HCl → 2NaCl + H₂O + CO₂↑';
            r.products = [solid('NaCl')];
            return r;
        }
    }
    return null;
}
/** A workbench vessel is still visibly reacting: a live rate, standing foam, bubbles or vapour. */
function reactionStillVisible(): boolean {
    const now = performance.now(), mixtures = useChemStore.getState().mixtures;
    if (Object.values(useReactionView.getState().vessels).some((r) => !r.info && r.rate > 0 && r.until > now && isWorkbenchObject(r.vesselId)))
        return true;
    for (const [id, m] of Object.entries(mixtures)) {
        if (!isWorkbenchObject(id))
            continue;
        const fx = vesselFx.get(id);
        if (m.foam > 2 || (fx && (fx.bubbles > .05 || fx.steam > .05 || fx.smoke > .05)))
            return true;
    }
    return false;
}
export function ExperimentSuccess() {
    const modal = usePresentation((s) => s.modal), id = usePresentation((s) => s.experiment), result = usePresentation((s) => s.reaction);
    const reduced = useSettingsStore((s) => s.reducedMotion);
    const pending = useRef<{
        id: string;
        at: number;
        reaction: ReactionObservation;
    } | null>(null);
    useEffect(() => {
        const timer = window.setInterval(() => {
            const active = useLabStore.getState().active, presentation = usePresentation.getState();
            // This salt workup still has cooling, filtration and drying after its first crystals.
            const protocol = useProtocolResults.getState();
            if (active === 'nacl' && protocol.experiment === active && !protocol.complete && useShowcase.getState().status !== 'idle') {
                pending.current = null;
                return;
            }
            // A grade 8 demo's result is celebrated once its last step has played, never halfway through.
            // Starting the experiment again (resetPresentation) lets the student's own result be celebrated too.
            if (useDemoShown.getState() && !useDemoDone.getState()) {
                pending.current = null;
                return;
            }
            if (!active || presentation.modal || presentation.celebrated.includes(active) || !currentSession()?.ready) {
                pending.current = null;
                return;
            }
            // A finished grade 8 demo always ends on the celebration, whether or not its lab tracks steps.
            const expected = resultFor(active), done = (useDemoShown.getState() && useDemoDone.getState()) || (!currentSession()?.previouslyComplete && experimentDone(useLabStore.getState().progress, active));
            if (!expected && !done) {
                pending.current = null;
                return;
            }
            const x = experimentById(active);
            if (!x)
                return;
            const observed = Object.values(useReactionView.getState().vessels).filter((r)=>!r.info && isWorkbenchObject(r.vesselId) && r.products.length>0).sort((a,b)=>b.until-a.until)[0];
            const reaction = expected ?? (done ? observed : undefined) ?? {
                preset: 'generic' as const, key: `completed:${active}`, reactants: [], products: active === 'nacl' ? [solid('NaCl')] : active === 'elephant' ? [atom('O2', 'Хүчилтөрөгч', 'O₂', '#ef3038', 1, 'gas'), atom('H2O', 'Ус', 'H₂O', '#ef3038')] : [],
                rate: 0, temp: 22, equation: x.explain.split('. ')[0], sentence: x.explain, effect: 'water' as const,
            };
            if (pending.current?.id !== active) {
                pending.current = { id: active, at: performance.now(), reaction };
                return;
            }
            const waited = performance.now() - pending.current.at;
            if (waited < 1500)
                return;
            // Grade 8: let the visible reaction (eruption, fizzing, boiling) play out before celebrating.
            if (isGrade8Lab(active) && !useSettingsStore.getState().reducedMotion && waited < 9000 && reactionStillVisible())
                return;
            endHeldUse();
            releaseLock();
            sounds.play('success', .95);
            usePresentation.setState({ modal: 'success', experiment: active, reaction: pending.current.reaction, celebrated: [...presentation.celebrated, active] });
        }, 200);
        return () => clearInterval(timer);
    }, []);
    if (modal !== 'success' || !id || !result)
        return null;
    const lesson = experimentById(id), products = result.products;
    const product = products.map((s) => s.formula.replace(/↑$/, '')).join(' + ') || 'Туршилтын үр дүн';
    const restart = () => { pending.current = null; repeatBenchExperiment(id); };
    const choose = () => { closePresentation(); if (useGameStore.getState().mode === 'bench')
        exitBench(); useGameStore.getState().openPanel('menu'); };
    return <div role="dialog" aria-modal="true" aria-label="Туршилт амжилттай" className="fixed inset-0 z-[76] flex items-center justify-center overflow-hidden bg-slate-950/55 p-3">
    {!reduced && <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>{Array.from({ length: 32 }, (_, i) => <i key={i} style={{ left: `${(i * 37) % 100}%`, background: ['#38bdf8', '#facc15', '#a78bfa', '#4ade80'][i % 4], animationDelay: `${i % 8 * .08}s`, animationDuration: `${2 + i % 3 * .4}s` }} className="success-confetti absolute top-0 h-3 w-2 rounded-sm"/>)}</div>}
    <section className="relative max-h-[95dvh] w-full max-w-2xl overflow-auto rounded-2xl bg-white p-4 text-lab-ink shadow-2xl sm:p-6">
      <h2 className="text-xl font-bold text-emerald-800">🎉 Амжилттай! {product} гарган авлаа</h2>
      {id === 'elephant' && <p className="mt-1 text-sm text-sky-800">Ялгарсан O₂-ийг саван хөөс болгон барьж байна.</p>}
      {products.length > 0 && <div className="my-3 h-[32dvh] min-h-40 overflow-hidden rounded-xl" data-success-products={products.map((s) => s.id).join(',')}><MoleculeStage species={products}/></div>}
      <p className="text-sm font-bold">{result.equation}</p><p className="mt-2 text-sm text-slate-600">{lesson?.explain ?? result.sentence}</p>
      <div className="mt-4 flex flex-wrap gap-2"><button className="min-h-10 rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white" onClick={restart}>Дахин хийх</button><button className="min-h-10 rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={choose}>Өөр туршилт сонгох</button><button className="min-h-10 rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={closePresentation}>Үргэлжлүүлэн ажиглах</button></div>
    </section>
  </div>;
}
