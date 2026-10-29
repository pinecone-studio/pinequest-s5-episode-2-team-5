/**
 * Turns lab events into feedback: a toast for what you just saw, a notebook line, Star
 * cheering, comforting or saying "Stop!" (starLines.ts), sounds, and experiment-guide
 * progress (with praise when a whole experiment is done).
 */
import { useGameStore } from '../store/useGameStore';
import { useExperimentStore } from '../store/useExperimentStore';
import { useLabStore, experimentDone } from '../store/useLabStore';
import { sounds } from '../utils/sounds';
import { getExperiments } from './experiments';
import { onLab, type LabEvent } from './events';
import { starSay } from './starCoach';
import { experimentDoneLine, pepTalk, starLineFor } from './starLines';

const queue: { title: string; subtitle?: string }[] = [];
let pumping = false;
let toastTimer: number | null = null;

function toast(title: string, subtitle?: string): void {
  if (queue.length > 3) queue.shift();
  queue.push({ title, subtitle });
  if (pumping) return;
  pumping = true;
  const next = () => {
    const t = queue.shift();
    if (!t) {
      pumping = false; toastTimer = null;
      return;
    }
    useGameStore.getState().showToast(t.title, t.subtitle);
    toastTimer = window.setTimeout(next, 1900);
  };
  next();
}

function onEvent(e: LabEvent): void {
  const game = useGameStore.getState();
  const lab = useLabStore.getState();
  const firstTime = !lab.seen.includes(e.key);
  const completed = lab.record(e);

  if (e.key.startsWith('ppt:') || e.key.startsWith('complex:') || e.key.startsWith('gas:') || e.key.startsWith('displace:') || e.key === 'neutralization' || e.key === 'starchIodine') {
    useExperimentStore.getState().markSkill('mix');
  }
  if (e.key === 'hood:open') useExperimentStore.getState().markSkill('hood');

  const line = starLineFor(e, firstTime);
  if (e.key === 'spill') toast('Уусмал асгарлаа!', 'Асгарсан газар руу хараад E дарж арчина');

  if (e.title && !e.quiet) {
    toast(e.title, e.detail);
    game.logEvent(e.detail ? `${e.title}. ${e.detail}` : e.title);
    if (e.key.startsWith('gas:') || e.key === 'foam') sounds.play('fizz', 0.8);
    else if (line?.tone === 'good') sounds.play('success', 0.35);
  }
  if (line) starSay(line);

  for (const c of completed) {
    const x = getExperiments().find((ex) => ex.id === c.experiment);
    const step = x?.steps.find((s) => s.id === c.step);
    if (!x || !step) continue;
    const progress = useLabStore.getState().progress;
    if (experimentDone(progress, x.id)) {
      sounds.play('success', 0.9);
      toast(`🎉 Туршилт амжилттай: ${x.title}`, 'Цэс → Туршилт хэсгээс дараагийнхаа сонгоорой');
      game.logEvent(`Туршилт дууслаа: ${x.title}. ${x.explain}`);
      window.setTimeout(() => starSay(experimentDoneLine(x.id, x.title, x.explain)), 2200);
    } else if (useLabStore.getState().active === x.id) {
      sounds.play('ui', 0.8);
      toast(`✓ ${step.text}`, x.title);
      // A short pep talk, unless Star already has something to say about this moment.
      if (!line) starSay(pepTalk(x.steps.find((s) => !(progress[x.id] ?? []).includes(s.id))?.text));
    }
  }
}

let stop: (() => void) | null = null;

export function startAnnouncer(): () => void {
  if (stop) return () => undefined;
  stop = onLab(onEvent);
  return () => {
    stop?.();
    stop = null;
  };
}

/** Discard feedback queued by the attempt that has just been packed away. */
export function clearExperimentFeedback() {
  if(toastTimer!==null) window.clearTimeout(toastTimer);
  toastTimer=null;queue.length=0;pumping=false;
  useGameStore.setState({toast:null});
}
