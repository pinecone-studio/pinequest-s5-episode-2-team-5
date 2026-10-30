/**
 * Puts Star's lines in its speech bubble: repeats are held back, "Stop!" shows at once (and Star
 * flies off to point at what fixes it), and a few good moments per visit are reworded by the AI
 * with what the student is doing (STAR_AI in starLines.ts sets how many). Whenever the AI is
 * slow, out of budget or unreachable, Star says its own line instead.
 */
import { useGameStore } from '../store/useGameStore';
import { useLabStore } from '../store/useLabStore';
import { experimentById } from './experiments';
import { useDemoShown } from '../experiments/workbench/guidance/hud-space';
import { askHost } from './starBridge';
import { startGuide } from './starGuide';
import { canAskAi, GUIDE_HINT, STAR_AI, type StarBudget, type StarLine } from './starLines';

const lastSaid = new Map<string, number>();
const budget: StarBudget = { used: 0, lastAt: -Infinity, failures: 0 };

/** What Star knows when it writes: the chosen experiment (or free lab) and the last few things done. */
export function starContext(): string {
  const lab = useLabStore.getState();
  const x = lab.active ? experimentById(lab.active) : undefined;
  const done = x ? lab.progress[x.id] ?? [] : [];
  return JSON.stringify({
    mode: x ? 'experiment' : 'free lab',
    currentExperiment: x ? { title: x.title, goal: x.goal, safety: x.safety, explain: x.explain, steps: x.steps.map((s) => ({ text: s.text, done: done.includes(s.id) })) } : null,
    recent: useGameStore.getState().log.slice(-6).map((entry) => entry.text),
  });
}

export function starSay(line: StarLine): void {
  // A grade 8 demo does the steps, not the student: no "Stop!" or comforting about them.
  if (line.tone !== 'good' && useDemoShown.getState()) return;
  const now = performance.now();
  if (now - (lastSaid.get(line.key) ?? -Infinity) < line.cooldownMs) return;
  lastSaid.set(line.key, now);
  const game = useGameStore.getState();
  if (!canAskAi(line, budget, now)) {
    // After a mistake, Star shows where the fix is (goggles, tongs, the spill, the waste bin).
    const guided = (line.tone === 'danger' || line.tone === 'oops') && startGuide(line.key);
    game.say(guided ? `${line.text} ${GUIDE_HINT}` : line.text, line.mood);
    return;
  }
  budget.used += 1;
  budget.lastAt = now;
  const before = game.robot.id;
  void askHost({ type: 'openlab:star-comment', tone: line.tone, event: line.about ?? line.text, context: starContext() }, STAR_AI.waitMs).then((answer) => {
    budget.failures = answer ? 0 : budget.failures + 1;
    const store = useGameStore.getState();
    // Star said something else meanwhile (a "Stop!" or a newer moment): that bubble stays.
    if (store.robot.id !== before) return;
    store.say(answer?.trim() || line.text, line.mood);
  });
}
