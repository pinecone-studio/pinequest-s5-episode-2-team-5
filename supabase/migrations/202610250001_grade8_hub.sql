-- Grade 8 and 9 chemistry revision hubs. Content is seeded by supabase/grade8-hub.sql.
-- Student rows are isolated by auth.uid(); OpenLab tables remain unchanged.

create schema if not exists hub;

create table if not exists hub.packs (
  id text primary key,
  version text not null,
  published_at timestamptz not null default now(),
  is_published boolean not null default true
);
alter table hub.packs add column if not exists is_published boolean not null default true;

create table if not exists hub.content_packs (
  pack_id text primary key references hub.packs(id) on delete cascade,
  content jsonb not null,
  updated_at timestamptz not null default now(),
  constraint content_pack_shape check (
    jsonb_typeof(content) = 'object'
    and content -> 'meta' ->> 'id' = pack_id
    and (content -> 'meta' ->> 'grade')::integer between 8 and 12
    and jsonb_typeof(content -> 'topics') = 'array'
  ),
  constraint g8_content_pack_size check (octet_length(content::text) <= 1048576)
);
-- Upgrade databases that already ran the first Grade 8-only draft of this schema.
alter table hub.content_packs drop constraint if exists g8_content_pack_shape;
alter table hub.content_packs drop constraint if exists content_pack_shape;
alter table hub.content_packs add constraint content_pack_shape check (
  jsonb_typeof(content) = 'object'
  and content -> 'meta' ->> 'id' = pack_id
  and (content -> 'meta' ->> 'grade')::integer between 8 and 12
  and jsonb_typeof(content -> 'topics') = 'array'
);

create table if not exists hub.note_reads (
  user_id uuid not null references auth.users(id) on delete cascade,
  pack_id text not null references hub.packs(id),
  note_id text not null,
  read_at timestamptz not null default now(),
  primary key (user_id, pack_id, note_id)
);

create table if not exists hub.flashcard_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  pack_id text not null references hub.packs(id),
  card_id text not null,
  box smallint not null check (box between 0 and 3),
  reviewed_at timestamptz not null default now(),
  primary key (user_id, pack_id, card_id)
);

create table if not exists hub.mcq_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  pack_id text not null references hub.packs(id),
  session_id uuid not null,
  source text not null check (source in ('topic', 'test', 'assignment')),
  question_id text not null,
  topic_id text not null,
  chosen smallint not null,
  correct boolean not null,
  answered_at timestamptz not null default now()
);
create index if not exists mcq_attempts_user_topic on hub.mcq_attempts (user_id, topic_id);

create table if not exists hub.question_marks (
  user_id uuid not null references auth.users(id) on delete cascade,
  pack_id text not null references hub.packs(id),
  question_id text not null,
  part_index smallint not null,
  points boolean[] not null,
  answer_text text,
  updated_at timestamptz not null default now(),
  primary key (user_id, pack_id, question_id, part_index)
);

create table if not exists hub.objective_ratings (
  user_id uuid not null references auth.users(id) on delete cascade,
  pack_id text not null references hub.packs(id),
  objective_id text not null,
  rating text not null check (rating in ('r', 'a', 'g')),
  updated_at timestamptz not null default now(),
  primary key (user_id, pack_id, objective_id)
);

alter table hub.packs enable row level security;
alter table hub.content_packs enable row level security;
alter table hub.note_reads enable row level security;
alter table hub.flashcard_state enable row level security;
alter table hub.mcq_attempts enable row level security;
alter table hub.question_marks enable row level security;
alter table hub.objective_ratings enable row level security;

drop policy if exists "read packs" on hub.packs;
create policy "read packs" on hub.packs for select to anon, authenticated using (is_published);
drop policy if exists "read published content packs" on hub.content_packs;
create policy "read published content packs" on hub.content_packs for select to anon, authenticated
  using (exists (select 1 from hub.packs p where p.id = pack_id and p.is_published));

drop policy if exists "own rows" on hub.note_reads;
create policy "own rows" on hub.note_reads for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows" on hub.flashcard_state;
create policy "own rows" on hub.flashcard_state for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows" on hub.mcq_attempts;
create policy "own rows" on hub.mcq_attempts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows" on hub.question_marks;
create policy "own rows" on hub.question_marks for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "own rows" on hub.objective_ratings;
create policy "own rows" on hub.objective_ratings for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant usage on schema hub to anon, authenticated, service_role;
grant select on hub.packs, hub.content_packs to anon, authenticated;
grant select, insert, update, delete on hub.note_reads, hub.flashcard_state, hub.mcq_attempts, hub.question_marks, hub.objective_ratings to authenticated;
grant usage, select on sequence hub.mcq_attempts_id_seq to authenticated;
grant all on all tables in schema hub to service_role;

-- Keep hub private from the Data API; expose only published lesson JSON through public RPC.
create or replace function public.get_revision_content_pack(requested_pack_id text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select c.content
  from hub.content_packs c
  join hub.packs p on p.id = c.pack_id
  where c.pack_id = requested_pack_id and p.is_published
  limit 1
$$;
revoke all on function public.get_revision_content_pack(text) from public;
grant execute on function public.get_revision_content_pack(text) to anon, authenticated, service_role;

insert into hub.packs (id, version, is_published)
values ('mn-g8-chemistry', '0.1.0', true), ('g9-chem', '1.0.0', true)
on conflict (id) do update set version = excluded.version, is_published = excluded.is_published;
