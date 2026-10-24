# ChemQuest · Хими 8 Revision Hub — integration notes

A separate hub, modelled on SaveMyExams (past papers excluded), for the Mongolian Grade 8 chemistry textbook *Хими VIII* (4th ed., 2022). It does not import, modify, or depend on the virtual lab.

## What's in the pack

| Item | Count |
|---|---|
| Topics (textbook subchapters 1.1–4.3) | 11 |
| Revision-note sections | 40 |
| Flashcards | 106 |
| MCQs (auto-marked) | 79 |
| Structured questions with mark schemes and model answers | 33 (166 marks) |
| Practical summaries (mapped to textbook experiment numbers) | 23 |
| Learning objectives (for the RAG checklist) | 43 |
| Glossary terms | 47 |
| Textbook errata notes | 13 |
| Periodic table (all 118 elements, Mongolian names, mass, category, state) | 1 |
| Reference tables (ions, tests, reactivity series, group data, units, E-numbers…) | 17 |
| Lab skills: equipment cards / observations / hazard symbols | 16 / 25 / 7 |
| Practicals with structured before/after-lab flow (variables, safety check, results table, auto-check, graph, mark scheme) | 8 of 23 (the rest use a simpler observation flow) |

All text is original Mongolian, written against the textbook's chapter structure and objectives. Textbook passages, figures, and exercises were not copied. Page references let teachers cross-reference.

## Files

- `grade8-chemistry.content.json` — the content pack (single source of truth). Typed by `types.ts`.
- `chemquest-g8-hub.html` — standalone demo. Vanilla JS, no dependencies. Progress is saved to localStorage.
- `001_revision_hub.sql` — Supabase migration. Creates its own `hub` schema with RLS. No lab tables are touched.
- `types.ts` — TypeScript types for the pack.

## Integration path

1. Add a new route or tab (e.g. `/hub/g8-chemistry`) next to the existing hubs. Don't put it inside the lab route.
2. Bundle `grade8-chemistry.content.json` as a static asset (about 290 KB, or about 60 KB gzipped). Load it lazily.
3. Port the renderers from the demo's `<script>`. The block renderer (`blocks()`), `fmt()` inline markup, flashcards, quiz, structured questions, and figures are all plain functions and can be ported to React or React Native components 1:1. The SVG figures need `react-native-svg` on mobile.
4. Swap the `P` localStorage object for the `hub.*` tables. The keys match: note id, card id, question id, objective id.
5. XP: the demo awards +5 per note read, +1 per card first marked known, +2 per MCQ first answered correctly, and +1 per mark first earned. Post these to the existing XP system through a single function, so the hub never writes lab or ranking tables directly.
6. Practicals: progress per practical is saved under `lab[<practicalId>]` (steps s1–s3, done, data, marks). Fill in `labActivityId` with the IDs of the matching entries among the 30 existing Grade 8 experiment guides. The hub only deep-links, and the lab stays unchanged.

## Not built (needs your codebase)

- Teacher assignments and class reports. `hub.mcq_attempts.source = 'assignment'` is reserved for this. The class/enrolment tables should follow your existing org model.
- Content QA by a Mongolian chemistry teacher. Native-speaker review of terminology and tone is still needed before a pilot.

## Notes for the Expo / React Native app (added after Phase 0)

- `types.ts` now covers the whole pack, including `Element.config/shells/block/look/color/use` and `lab` (`LabPack`). The JSON was validated against every enum in it.
- The demo is HTML. In React Native: SVG figures → `react-native-svg`; `<sub>/<sup>` → nested `<Text>` with smaller font size, or Unicode sub/superscript digits; tables → horizontal `ScrollView`; localStorage → AsyncStorage.
- Static import of a ~460 KB JSON is fine in Metro. Split it per chapter only if startup time on low-end Android becomes a measured problem.
