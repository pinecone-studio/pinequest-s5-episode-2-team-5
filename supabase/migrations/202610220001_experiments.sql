-- JSON lesson definitions. Run supabase/experiments.sql to create AND seed the catalog.
create table if not exists public.experiments (
  id text primary key check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  schema_version integer not null default 1 check (schema_version = 1),
  sort_order integer not null default 0,
  is_published boolean not null default false,
  content jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint experiments_content_shape check (coalesce(
    jsonb_typeof(content) = 'object'
    and content ->> 'id' = id
    and jsonb_typeof(content -> 'title') = 'string'
    and length(btrim(content ->> 'title')) > 0
    and content ->> 'level' in ('Эхлэл', 'Дунд', 'Ахисан')
    and jsonb_typeof(content -> 'goal') = 'string'
    and jsonb_typeof(content -> 'materials') = 'array'
    and jsonb_typeof(content -> 'safety') = 'string'
    and jsonb_typeof(content -> 'steps') = 'array'
    and jsonb_typeof(content -> 'explain') = 'string', false)),
  constraint experiments_content_size check (octet_length(content::text) <= 262144)
);

create index if not exists experiments_published_order_idx
  on public.experiments (sort_order, id) where is_published;

alter table public.experiments enable row level security;
revoke all on public.experiments from public, anon, authenticated;
grant select on public.experiments to anon, authenticated;
grant all on public.experiments to service_role;

drop policy if exists "read published experiments" on public.experiments;
create policy "read published experiments" on public.experiments
  for select to anon, authenticated using (is_published = true);

create or replace function public.touch_experiment_updated_at()
returns trigger language plpgsql set search_path = pg_catalog as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists experiments_updated_at on public.experiments;
create trigger experiments_updated_at before update on public.experiments
  for each row execute function public.touch_experiment_updated_at();
