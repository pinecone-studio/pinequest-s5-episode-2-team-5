/**
 * Runs inside the dev lab page (imported by scripts/playthrough.mjs through Vite, so it shares the
 * app's live stores). It starts one textbook experiment exactly as the menu does, sits at the
 * worktop, and either plays the experiment's full guided 3D demonstration or carries out the
 * book's procedure with the bench's own stock, while the real simulation and physics run.
 */
import grade7 from '../../src/data/textbook-experiments/experiments_grade7.json';
import grade8 from '../../src/data/textbook-experiments/experiments_grade8.json';
import grade9 from '../../src/data/textbook-experiments/experiments_grade9.json';
import grade10 from '../../src/data/textbook-experiments/experiments_grade10.json';
import { parseExperiment, type TextbookExperiment } from '../../src/menu/chapterBuild';
import { guideFor, startTextbookExperiment } from '../../src/menu/startExperiment';
import { useLaunchedProcedure } from '../../src/menu/launchedProcedure';
import { spawnTextbookSupplies } from '../../src/menu/textbookEquipment';
import { enterBench, exitBench } from '../../src/experiments/nacl/bench';
import { playerApi, useGameStore } from '../../src/store/useGameStore';
import { useInventoryStore } from '../../src/store/useInventoryStore';
import { useChemStore } from '../../src/store/useChemStore';
import { useLabStore } from '../../src/store/useLabStore';
import { useExperimentStore } from '../../src/store/useExperimentStore';
import { requestShowcase } from '../../src/experiments/workbench/guidance/launch-store';
import { useProtocolResults } from '../../src/experiments/workbench/guidance/results';
import { useShowcase } from '../../src/experiments/workbench/guidance/showcase';
import { GUIDED_PLANS, physicalShowcasePlan } from '../../src/experiments/workbench/guidance/plans';
import { currentSession, demonstratePreparation, useWorkbench } from '../../src/experiments/workbench/session';
import { onLab } from '../../src/lab/events';
import { MANUAL } from './manual';
import { _roots } from '@react-three/fiber';

/** Skip only the GPU draw (software WebGL renders ~1 frame/s); scene, physics and simulation still run every frame. */
export function drawFrames(on: boolean): number {
  let n = 0;
  for (const root of _roots.values()) {
    const gl = root.store.getState().gl as unknown as { render: (...args: unknown[]) => void; __render?: (...args: unknown[]) => void };
    gl.__render ??= gl.render;
    gl.render = on ? gl.__render : () => {};
    n++;
  }
  return n;
}

const BOOK = [...grade7, ...grade8, ...grade9, ...grade10].map(parseExperiment).filter(Boolean) as TextbookExperiment[];

export interface PlayStatus {
  id: string;
  title: string;
  kind: 'guided' | 'manual' | 'none';
  state: 'running' | 'pass' | 'fail';
  stage: string;
  messages: string[];
  failures: string[];
  spills: number;
  broken: number;
  seconds: number;
}

let status: PlayStatus | null = null;
let started = 0;
const events: string[] = [];
onLab((e) => { if (e.title) events.push(e.title); });

export const ids = () => BOOK.map((e) => e.id);
export const current = () => (status ? { ...status, seconds: (performance.now() - started) / 1000 } : null);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Start `id` from the menu, sit at the worktop and play it. Poll `current()` for the outcome. */
export function play(id: string): void {
  const e = BOOK.find((x) => x.id === id);
  if (!e) throw Error(`no experiment ${id}`);
  const lab = guideFor(e);
  const guided = !!lab && !!GUIDED_PLANS[lab.id] && !!physicalShowcasePlan(lab.id);
  status = { id, title: e.title, kind: guided ? 'guided' : MANUAL[id] ? 'manual' : 'none', state: 'running', stage: 'start', messages: [], failures: [], spills: 0, broken: 0, seconds: 0 };
  started = performance.now();
  events.length = 0;
  void run(e, lab?.id ?? null, guided).catch((error: unknown) => fail(String(error instanceof Error ? error.stack ?? error.message : error)));
}

function fail(why: string) { if (status) { status.failures.push(why); status.state = 'fail'; } }

async function run(e: TextbookExperiment, labId: string | null, guided: boolean) {
  const s = status!;
  if (useGameStore.getState().mode === 'bench') exitBench();
  await wait(200);
  const puddles = useChemStore.getState().puddles.length, broken = useInventoryStore.getState().brokenCount;
  startTextbookExperiment(e);
  await wait(300);
  playerApi.teleport(8.25, -13.6, 0);
  await wait(300);
  enterBench();
  await wait(800);
  if (useGameStore.getState().mode !== 'bench') return fail('ажлын ширээнд сууж чадсангүй');
  if (useLabStore.getState().active !== labId) return fail(`идэвхтэй заавар ${useLabStore.getState().active} ≠ ${labId}`);
  if (guided && labId) {
    s.stage = 'showcase';
    requestShowcase(labId);
    const deadline = performance.now() + 900000;
    let seenPlaying = false;
    while (performance.now() < deadline) {
      await wait(500);
      const show = useShowcase.getState(), protocol = useProtocolResults.getState();
      if (show.status === 'playing') seenPlaying = true;
      s.stage = `${show.key ?? ''} ${show.status} ${show.phase ?? ''}`.trim();
      if (protocol.experiment === labId && protocol.complete) break;
      if (show.status === 'failed') return fail(`үзүүлбэр зогслоо: ${show.message}`);
      if (!seenPlaying && performance.now() - started > 30000) return fail(`үзүүлбэр эхэлсэнгүй (${show.status})`);
    }
    const protocol = useProtocolResults.getState();
    if (!(protocol.experiment === labId && protocol.complete)) return fail(`15 минутад дуусаагүй: ${s.stage}`);
    s.messages.push(...protocol.records.slice(-1).flatMap((r) => r.readings.map((v) => `${v.label}: ${+v.value.toPrecision(4)} ${v.unit}`)));
  } else {
    s.stage = 'preparation';
    const prep = useLaunchedProcedure.getState().prep;
    if (prep) {
      const missing = spawnTextbookSupplies(prep);
      if (missing.length) s.failures.push(`лабд байхгүй: ${missing.join(', ')}`);
      useLaunchedProcedure.getState().finishPrep();
    } else demonstratePreparation();
    await wait(1500);
    const script = MANUAL[e.id];
    if (!script) return fail('гараар хийх алхам бичээгүй');
    s.stage = 'procedure';
    const notes = await script({ say: (m) => s.messages.push(m), check: (ok, why) => { if (!ok) s.failures.push(why); }, wait });
    if (notes) s.messages.push(notes);
  }
  s.spills = useChemStore.getState().puddles.length - puddles;
  s.broken = useInventoryStore.getState().brokenCount - broken;
  if (s.broken > 0) s.failures.push(`${s.broken} шилэн сав хагарлаа`);
  s.messages.push(...events.slice(-4));
  s.state = s.failures.length ? 'fail' : 'pass';
}

/** Exposed for the manual scripts and for debugging from the console. */
export const stores = { useInventoryStore, useChemStore, useLabStore, useExperimentStore, useWorkbench, currentSession };
