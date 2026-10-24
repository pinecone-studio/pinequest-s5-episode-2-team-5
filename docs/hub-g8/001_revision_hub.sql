-- Revision hub (Grade 8 chemistry) — separate schema. Does not alter or reference lab tables.
-- Content stays in the versioned JSON pack; the database stores only per-student progress.

create schema if not exists hub;

-- One row per content pack version the app has shipped (lets progress survive content edits).
create table if not exists hub.packs (
  id          text primary key,              -- e.g. 'mn-g8-chemistry'
  version     text not null,
  published_at timestamptz not null default now()
);

-- Notes read
create table if not exists hub.note_reads (
  user_id  uuid not null references auth.users(id) on delete cascade,
  pack_id  text not null references hub.packs(id),
  note_id  text not null,                    -- e.g. '2.1c'
  read_at  timestamptz not null default now(),
  primary key (user_id, pack_id, note_id)
);

-- Flashcard Leitner box (0 = new/unknown, 1 = unsure, 2–3 = known)
create table if not exists hub.flashcard_state (
  user_id     uuid not null references auth.users(id) on delete cascade,
  pack_id     text not null references hub.packs(id),
  card_id     text not null,                 -- e.g. '3.2-fc4'
  box         smallint not null check (box between 0 and 3),
  reviewed_at timestamptz not null default now(),
  primary key (user_id, pack_id, card_id)
);

-- Every MCQ attempt (topic quizzes and mixed tests), kept for teacher reporting
create table if not exists hub.mcq_attempts (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  pack_id     text not null references hub.packs(id),
  session_id  uuid not null,                 -- groups one quiz/test run
  source      text not null check (source in ('topic', 'test', 'assignment')),
  question_id text not null,                 -- e.g. '3.1-mcq2'
  topic_id    text not null,
  chosen      smallint not null,
  correct     boolean not null,
  answered_at timestamptz not null default now()
);
create index if not exists mcq_attempts_user_topic on hub.mcq_attempts (user_id, topic_id);

-- Self-marked structured questions: which mark-scheme points the student ticked
create table if not exists hub.question_marks (
  user_id     uuid not null references auth.users(id) on delete cascade,
  pack_id     text not null references hub.packs(id),
  question_id text not null,                 -- e.g. '1.2-Q2'
  part_index  smallint not null,
  points      boolean[] not null,
  answer_text text,
  updated_at  timestamptz not null default now(),
  primary key (user_id, pack_id, question_id, part_index)
);

-- Objective self-rating (red / amber / green)
create table if not exists hub.objective_ratings (
  user_id      uuid not null references auth.users(id) on delete cascade,
  pack_id      text not null references hub.packs(id),
  objective_id text not null,                -- e.g. '3.2-obj3'
  rating       text not null check (rating in ('r', 'a', 'g')),
  updated_at   timestamptz not null default now(),
  primary key (user_id, pack_id, objective_id)
);

-- Row-level security: students see and write only their own rows.
alter table hub.note_reads        enable row level security;
alter table hub.flashcard_state   enable row level security;
alter table hub.mcq_attempts      enable row level security;
alter table hub.question_marks    enable row level security;
alter table hub.objective_ratings enable row level security;
alter table hub.packs             enable row level security;

create policy "own rows" on hub.note_reads        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on hub.flashcard_state   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on hub.mcq_attempts      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on hub.question_marks    for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own rows" on hub.objective_ratings for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "read packs" on hub.packs for select using (true);

insert into hub.packs (id, version) values ('mn-g8-chemistry', '0.1.0') on conflict (id) do nothing;

-- Remember to add 'hub' to Supabase API exposed schemas (Settings → API) or wrap access in RPCs.
-- Teacher/class tables (classes, enrolments, assignments) are deliberately not here yet:
-- they need your existing org/role model, which this migration has not seen.
