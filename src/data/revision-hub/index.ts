import grade7 from './g7-chem/content.json';
import grade10 from './g10-chem/content.json';
import { matchesContentShape } from '../../lib/learning-content';
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

export function getPack(id: 'g7-chem' | 'g8-chem' | 'g9-chem' | 'g10-chem'): ContentPack {
  if (id === 'g7-chem') return grade7 as unknown as ContentPack;
  if (id === 'g10-chem') return grade10 as unknown as ContentPack;
  if (remotePacks[id]) return remotePacks[id]!;
  if (id === 'g9-chem') return grade9 as unknown as ContentPack;
  if (id !== 'g8-chem') throw new Error(`Unknown revision pack: ${id}`);
  return pack;
}

/** Keep the supplied pack intact while making its otherwise unresolved key terms usable. */
export function getGlossary(id: 'g7-chem' | 'g8-chem' | 'g9-chem' | 'g10-chem' = 'g8-chem'): ContentPack['glossary'] {
  if (id === 'g7-chem') return grade7.glossary;
  if (id === 'g10-chem') return grade10.glossary;
  if (remotePacks[id]) return remotePacks[id]!.glossary;
  if (id === 'g9-chem') return grade9.glossary;
  return [...pack.glossary, ...glossaryAdditions];
}

export type { ContentPack } from './types';

export function applyLessonPack(id: 'g7-chem' | 'g8-chem' | 'g9-chem' | 'g10-chem', value: unknown): boolean {
  const target = getPack(id);
  if (!matchesContentShape(value, target)) return false;
  const next = value as ContentPack;
  if (next.meta.id !== id || next.meta.grade !== target.meta.grade) return false;
  // Preserve stable progress and practical links when loading editorial database content.
  const identity = (p: ContentPack) => p.topics.map(t => [t.id, t.chapterId, t.notes.map(n => n.id), t.flashcards.map(c => c.id), t.quiz.map(q => q.id), t.questions.map(q => q.id), t.objectives.map(o => o.id), t.practicals.map(p => [p.id, p.labActivityId])]);
  if (JSON.stringify(identity(target)) !== JSON.stringify(identity(next))) return false;
  const incoming=structuredClone(next);
  if ((id==='g7-chem'||id==='g10-chem') && Number(incoming.meta.version.split('.')[0])<2) {
    // A published v1 notebook pack can still supply editorial notes, but cannot undo the lab upgrade.
    const practicals=new Map(target.topics.flatMap(t=>t.practicals.map(p=>[p.id,p] as const)));
    incoming.topics=incoming.topics.map(t=>({...t,practicals:t.practicals.map(p=>{const local=practicals.get(p.id);return local?{...p,steps:[...local.steps],safety:local.safety,result:local.result,labActivityId:local.labActivityId}:p;})}));
    incoming.meta={...incoming.meta,version:target.meta.version,note:target.meta.note};
  }
  Object.assign(target, incoming);
  return true;
}
