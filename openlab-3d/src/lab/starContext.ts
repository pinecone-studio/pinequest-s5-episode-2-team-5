/**
 * What Star needs to answer about the lesson in front of the student: the textbook experiment
 * they opened (its procedure, substances and safety) and what is in the bench's vessels right now,
 * so "why did it turn milky?" or "what is the pH now?" gets an answer about this bench.
 */
import { useLaunchedProcedure } from '../menu/launchedProcedure';
import { currentSession } from '../experiments/workbench/session';
import { useChemStore } from '../store/useChemStore';
import { useInventoryStore } from '../store/useInventoryStore';
import { CATALOG } from '../equipment/equipmentCatalog';
import { composition, summarize } from '../chemistry/describe';
import { phOf } from '../chemistry/equilibrium';
import { isEmptyMixture } from '../chemistry/mixture';

/** Vessels listed for Star; a bench rarely has more in use. */
const BENCH_LIMIT = 10;

export function textbookLesson() {
  const launched = useLaunchedProcedure.getState();
  if (!launched.title && !launched.steps.length) return null;
  return {
    title: launched.title,
    procedure: launched.steps,
    stepsDone: launched.stepsDone,
    ...(launched.prep ? { textbookId: launched.prep.id, substances: launched.prep.substances, equipment: launched.prep.equipment, safety: launched.prep.safety } : {}),
  };
}

export function benchReadings() {
  const mixtures = useChemStore.getState().mixtures;
  const inventory = useInventoryStore.getState();
  const ids = new Set(Object.values(currentSession()?.objects ?? {}));
  if (inventory.held) ids.add(inventory.held.id);
  const vessels = [];
  for (const id of ids) {
    const m = mixtures[id];
    if (isEmptyMixture(m)) continue;
    const kind = inventory.held?.id === id ? inventory.held.kind : inventory.worldItems.find((w) => w.id === id)?.kind;
    const { dissolved, solids } = composition(m);
    const ph = phOf(m);
    vessels.push({
      vessel: kind ? CATALOG[kind].name : id,
      holding: inventory.held?.id === id,
      contents: summarize(m),
      dissolved: dissolved.map((r) => `${r.name} ${r.value}`),
      solids: solids.map((r) => `${r.name} ${r.value}`),
      temperatureC: Math.round(m.temp * 10) / 10,
      ...(ph === null ? {} : { pH: Math.round(ph * 10) / 10 }),
    });
    if (vessels.length >= BENCH_LIMIT) break;
  }
  return vessels;
}
