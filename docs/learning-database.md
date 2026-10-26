# Supabase learning content

## Apply to the existing project

The project environment has a public/anon key. That key cannot create tables or import
protected content. Do not replace it with a service-role key in the app.

1. Open this project's Supabase dashboard → SQL Editor → New query.
2. Run the entire `supabase/learning-content.sql` file.
3. Expect 2 lesson packs and 60 investigations (28 Grade 8, 32 Grade 9).
4. Deploy the app changes, then reopen Lesson Hall/OpenLab.

This transaction creates only new content tables and the `hub.revision_progress`
table/RPC. Existing profile, experiment and lesson tables are not replaced. Re-running
preserves dashboard edits and all student progress. Existing migrations are untouched.

## Stored content

- `public.lesson_packs`: Grade 8/9 chapters, topics, objectives, notes, diagrams' data,
  flashcards, quizzes, structured questions/mark schemes, practical descriptions,
  glossary and periodic reference data in the existing JSON format.
- `public.textbook_investigations`: titles, source pages, procedures, quantities,
  supplies, safety text and links for every textbook activity.
- `hub.revision_progress`: signed-in students' revision progress, kept separate per grade.

The app reads published rows only and validates them before use. Existing bundled JSON
is a fallback for unavailable or malformed content. `is_published=false` hides rows from
public API reads; these packs remain bundled fallbacks rather than access-controlled
paid content. The public key cannot write content. Edit content in Table Editor or SQL
Editor using a project owner account. Preserve IDs to retain student progress.

The content pack row's `id` is `g8-chem` or `g9-chem`; its nested `meta.id` retains the
original content-pack identifier. Keep both unchanged. OpenLab receives only public
investigation JSON over the existing same-origin iframe bridge, never session tokens.
The fixed reaction engine, supported apparatus, shaders and interaction code stay in
the app. New physics or equipment still require code; remote updates cannot replace
`mode`, `labRig`, or supplies with unsupported engines/equipment.

## Progress and offline behavior

Local AsyncStorage remains available offline. Revision reads/practicals are merged by
set union, scores by maximum, and individual card/objective ratings by their recorded
update timestamp. A row lock serializes concurrent database merges. The RPC checks
both the session user and the expected user ID, so delayed requests after an account
switch cannot write another person's progress. Authenticated users cannot access other
students' rows; anonymous users cannot call the progress RPC.

Offline updates sync on reopening the revision hub, the next saved change, or the retry
button. The header distinguishes local saves from completed account sync. Per-item
rating order uses device timestamps, so devices should have accurate clocks.
Experiment notebooks, live beaker mixtures and main-game XP use their existing storage;
this migration does not change those systems.

## Regenerate and verify

```
npm run learning:sql
npm run test:learning
npm run test:hub
npm run lint
npm run typecheck
npm --prefix openlab-3d run test:workbench
npm --prefix openlab-3d run build:chemquest
```

Regeneration preserves the supplied lesson texts. SQL imports use `ON CONFLICT DO
NOTHING`; intentionally publishing later content edits is a separate dashboard change.
The SQL has been checked in temporary PostgreSQL with two users, repeated imports,
progress merging and public/authenticated permission checks. It has not been applied
to the cloud project by the agent: no administrative database connection was available.
