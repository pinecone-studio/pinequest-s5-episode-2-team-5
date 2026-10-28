import { bookSupplies } from '../experiments/workbench/bookSupplies';
import { collectSupply } from '../experiments/workbench/session';
import type { TextbookPrep } from './launchedProcedure';

let skipSequence = 0;

/**
 * Put textbook equipment and substances on the shared workbench (experiments without a lab
 * guide). Items already standing on the bench are reused, not doubled. Returns any name that has
 * no lab item (bookSupplies.ts maps them all; tests/book-supplies.test.mjs keeps it that way).
 */
export function spawnTextbookSupplies(prep: Pick<TextbookPrep, 'id' | 'equipment' | 'substances'>): string[] {
  const run = ++skipSequence;
  const { supplies, unmatched } = bookSupplies(prep);
  for (const supply of supplies) collectSupply({ ...supply, key: `textbook-${run}-${supply.key}` });
  return unmatched;
}

/** One line of «Бэлтгэлээ хийе»: the equipment or substance it names. */
export function spawnTextbookItem(prep: Pick<TextbookPrep, 'id'>, name: string, group: 'equipment' | 'substance'): string[] {
  return spawnTextbookSupplies({ id: prep.id, equipment: group === 'equipment' ? [name] : [], substances: group === 'substance' ? [name] : [] });
}
