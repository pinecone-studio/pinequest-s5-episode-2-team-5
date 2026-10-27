# Lesson Hall and Grade 8 revision hub

## Separate entry points

`/lessons` is a mode selector. The first/primary option opens the topic-based Grade 8
revision hub at `/hub/g8-chem`. The other options open the catalyst journey at
`/lessons/catalyst` and the original XP/star lesson path at `/lessons/basics`.
The original lessons retain their content, progress rules and completion routes.

## Revision study area

- Chapter/topic navigation across all 11 topics.
- URL-addressable topic tabs: `notes`, `cards`, `quiz`, `questions`, `prac`.
- All 40 notes, 106 flashcards, 79 MCQs, 33 structured questions and 23 practical summaries.
- Shared chemistry formatting, including stacked nuclides, formulas and charges.
- Native SVG teaching figures registered for all 15 figure names; simplified illustrations,
  not an embedded HTML demo or a physical simulation.
- Cards: flip, previous/next, jump list, shuffle and known/again ratings.
- Quizzes: immediate feedback, explanations, final score, retry and saved topic best.
- Structured questions: model answers, per-point self-marking and saved best scores.
- References: 17 tables, glossary, 13 errata, 43 objective ratings, search, review,
  a 10-question mixed test, progress overview and atom/displacement tools.
- All 118 elements: table, cards and category map, shell diagrams, configurations and
  sample illustrations. La/Ac f-row positions, H classification and Cr/Cu configurations
  are checked by unit tests.
- Collapsible topic menu, phone layout and focus mode.

The supplied JSON remains unchanged. `getGlossary()` combines the 47 original glossary
entries with the existing 34-entry supplement to resolve the supplied key terms.
These additions remain editorial draft content pending the teacher QA described in README.

Progress is versioned and saved with AsyncStorage under the signed-in user's ID.
Writes are serialized across mounts, scores use maxima and note/practical sets use unions.
Card and objective ratings reflect the latest selection. Storage failures expose retry.
Signed-in progress also syncs to `hub.revision_progress` through `sync_revision_progress`
(own-row, security definer; merge rules in `202610270001_revision_progress_merge.sql`).
Sync is debounced and runs on load, on backgrounding and on unmount; the toolbar shows
its status. Wrong answers are latest-wins per question. No global XP is awarded here.

The eight structured practical workbooks, streak/quiz-history views,
and teacher/entitlement features from later phases are not part of this implementation.
The practical tab explicitly labels its completion as reviewing instructions, rather than
performing or automatically verifying a 3D lab experiment.

## Verification

Commands: `npm run typecheck`, `npm run lint`, `npm run test:hub`,
`npm run test:experiments`. Expo web and Android exports were also checked.
Native device behavior has not been tested on an Android/iOS device.

`scripts/check-revision-study.cjs` checks topic tabs, separate Lesson Hall entries,
references, interactive controls and progress reload at 390px and 1280px using Chrome
and Playwright Core. It mocks Supabase authentication/profile responses and performs
no cloud writes. It expects a web export served with SPA fallback and the existing
public Supabase URL in `.env.local`.

Optional environment variables: `CHEMQUEST_PLAYWRIGHT_PATH`, `CHROME_EXECUTABLE_PATH`,
`CHEMQUEST_TEST_URL` (default `http://127.0.0.1:8098`), `CHEMQUEST_SCREENSHOTS`,
and `WIDTHS` (comma-separated viewport widths). The catalyst-specific browser script
now uses the separate lab-lesson button.

All protected 3D lab and existing database paths remain unchanged.
