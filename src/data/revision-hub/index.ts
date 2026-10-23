import { labForPractical } from '../../lib/textbook-investigations';
import content from './g8-chem/content.json';
import glossaryAdditions from './g8-chem/glossary-additions.json';
import type { ContentPack } from './types';

// JSON imports widen enum strings and tuples; content invariants are checked by test:hub.
const pack = { ...content, topics: content.topics.map((topic) => ({ ...topic, practicals: topic.practicals.map((p) => ({ ...p, labActivityId: labForPractical(p.id) })) })) } as unknown as ContentPack;

export function getPack(id: 'g8-chem'): ContentPack {
  if (id !== 'g8-chem') throw new Error(`Unknown revision pack: ${id}`);
  return pack;
}

/** Keep the supplied pack intact while making its otherwise unresolved key terms usable. */
export function getGlossary(): ContentPack['glossary'] {
  return [...pack.glossary, ...glossaryAdditions];
}

export type { ContentPack } from './types';
