import { labForPractical } from '../../lib/textbook-investigations';
import content from './g8-chem/content.json';
import grade9 from './g9-chem/content.json';
import glossaryAdditions from './g8-chem/glossary-additions.json';
import type { ContentPack } from './types';

// JSON imports widen enum strings and tuples; content invariants are checked by test:hub.
const pack = { ...content, topics: content.topics.map((topic) => ({ ...topic, practicals: topic.practicals.map((p) => ({ ...p, labActivityId: labForPractical(p.id) })) })) } as unknown as ContentPack;
const remotePacks: Partial<Record<'g8-chem' | 'g9-chem', ContentPack>> = {};

/** Accept a remote revision pack only when its identity and main sections match the expected grade. */
export function applyRemotePack(id: 'g8-chem' | 'g9-chem', value: unknown): boolean {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ContentPack>;
  const expectedId = id === 'g8-chem' ? 'mn-g8-chemistry' : 'g9-chem';
  const expectedGrade = id === 'g8-chem' ? 8 : 9;
  if (candidate.meta?.id !== expectedId || candidate.meta.grade !== expectedGrade
    || !Array.isArray(candidate.chapters) || !Array.isArray(candidate.topics)
    || !Array.isArray(candidate.glossary) || !Array.isArray(candidate.elements)
    || !Array.isArray(candidate.tables) || !candidate.lab) return false;
  const validated = candidate as ContentPack;
  remotePacks[id] = id === 'g8-chem'
    ? { ...validated, topics: validated.topics.map((topic) => ({ ...topic, practicals: topic.practicals.map((p) => ({ ...p, labActivityId: labForPractical(p.id) })) })) }
    : validated;
  return true;
}

export function getPack(id: 'g8-chem' | 'g9-chem'): ContentPack {
  if (remotePacks[id]) return remotePacks[id]!;
  if (id === 'g9-chem') return grade9 as unknown as ContentPack;
  if (id !== 'g8-chem') throw new Error(`Unknown revision pack: ${id}`);
  return pack;
}

/** Keep the supplied pack intact while making its otherwise unresolved key terms usable. */
export function getGlossary(id: 'g8-chem' | 'g9-chem' = 'g8-chem'): ContentPack['glossary'] {
  if (id === 'g9-chem') return grade9.glossary;
  return [...pack.glossary, ...glossaryAdditions];
}

export type { ContentPack } from './types';
