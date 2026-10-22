/**
 * Turns lab events into feedback: a toast for what you just saw, a notebook line, the
 * robot explaining reactions and warning about safety, sounds, and experiment-guide
 * progress (with praise when a whole experiment is done).
 */
import { useGameStore } from '../store/useGameStore';
import { useExperimentStore } from '../store/useExperimentStore';
import { useLabStore, experimentDone } from '../store/useLabStore';
import { sounds } from '../utils/sounds';
import { EXPERIMENTS } from './experiments';
import { onLab, type LabEvent } from './events';

const queue: { title: string; subtitle?: string }[] = [];
let pumping = false;

function toast(title: string, subtitle?: string): void {
  if (queue.length > 3) queue.shift();
  queue.push({ title, subtitle });
  if (pumping) return;
  pumping = true;
  const next = () => {
    const t = queue.shift();
    if (!t) {
      pumping = false;
      return;
    }
    useGameStore.getState().showToast(t.title, t.subtitle);
    window.setTimeout(next, 1900);
  };
  next();
}

const lastSaid = new Map<string, number>();
function say(key: string, text: string, mood: 'happy' | 'think' | 'wave', cooldownMs: number): void {
  const now = performance.now();
  if (now - (lastSaid.get(key) ?? -1e9) < cooldownMs) return;
  lastSaid.set(key, now);
  useGameStore.getState().say(text, mood);
}

const SAFETY: Record<string, string> = {
  'safety:goggles': 'Анхаар! Идэмхий эсвэл хортой урвалжтай ажиллахдаа хамгаалалтын шил зүү. Баруун хананы ширээ болон «Хамгаалалт» шургуулганд бий.',
  'safety:gloves': 'Энэ урвалж арьсанд хортой — нитрилэн бээлий өмсөөрэй.',
  'safety:grip': 'Халаахдаа шилийг гараар бүү барь. Хуруу шил барих хавчаар эсвэл тигель хавчаарыг аваад, сав дээр E дарж хавчаарай.',
  'safety:hot': 'Түлэгдэнэ! Халуун савыг тигель хавчаараар ав: хавчаараа барьж байгаад сав дээр E дар.',
  spill: 'Асгарсан бодисыг шууд арчиж цэвэрлэ: асгарсан газар руу хараад E дар.',
};

function onEvent(e: LabEvent): void {
  const game = useGameStore.getState();
  const lab = useLabStore.getState();
  const firstTime = !lab.seen.includes(e.key);
  const completed = lab.record(e);

  if (e.key.startsWith('ppt:') || e.key.startsWith('complex:') || e.key.startsWith('gas:') || e.key.startsWith('displace:') || e.key === 'neutralization' || e.key === 'starchIodine') {
    useExperimentStore.getState().markSkill('mix');
  }
  if (e.key === 'hood:open') useExperimentStore.getState().markSkill('hood');

  if (SAFETY[e.key]) {
    say(e.key, SAFETY[e.key], 'think', 45000);
    if (e.key === 'spill') toast('Уусмал асгарлаа!', 'Асгарсан газар руу хараад E дарж арчина');
  }

  if (e.title && !e.quiet) {
    toast(e.title, e.detail);
    game.logEvent(e.detail ? `${e.title}. ${e.detail}` : e.title);
    if (e.key.startsWith('gas:') || e.key === 'foam') sounds.play('fizz', 0.8);
    else if (e.key === 'break' || e.key === 'waste:sink') say(e.key, e.detail ?? e.title, 'think', 20000);
    else if (firstTime && e.detail && !e.key.startsWith('wear:')) {
      sounds.play('success', 0.35);
      say(e.key, `${/[!.?]$/.test(e.title) ? e.title : `${e.title}!`} ${e.detail}`, 'happy', 6000);
    }
  }

  for (const c of completed) {
    const x = EXPERIMENTS.find((ex) => ex.id === c.experiment);
    const step = x?.steps.find((s) => s.id === c.step);
    if (!x || !step) continue;
    const progress = useLabStore.getState().progress;
    if (experimentDone(progress, x.id)) {
      sounds.play('success', 0.9);
      toast(`🎉 Туршилт амжилттай: ${x.title}`, 'Цэс → Туршилт хэсгээс дараагийнхаа сонгоорой');
      game.logEvent(`Туршилт дууслаа: ${x.title}. ${x.explain}`);
      window.setTimeout(() => useGameStore.getState().say(`«${x.title}» туршилт дууслаа! ${x.explain}`, 'happy'), 2200);
      const active = useLabStore.getState().active;
      if (active === x.id) {
        const nextX = EXPERIMENTS.find((ex) => !experimentDone(progress, ex.id));
        useLabStore.getState().setActive(nextX?.id ?? null);
      }
    } else if (useLabStore.getState().active === x.id) {
      sounds.play('ui', 0.8);
      toast(`✓ ${step.text}`, x.title);
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
