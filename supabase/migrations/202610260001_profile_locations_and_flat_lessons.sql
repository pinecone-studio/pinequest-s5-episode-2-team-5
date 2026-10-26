-- Safe to apply after the existing manually provisioned public.profiles schema.
-- Keeps the existing class progression contract intact while isolating school data.
do $$ begin
  if to_regclass('public.profiles') is null then
    raise exception 'public.profiles must exist first; run the current Supabase schema setup before this migration';
  end if;
end $$;

-- Existing profile RLS exposed every row to every authenticated user. Restrict it.
drop policy if exists "read profiles" on public.profiles;
drop policy if exists "update own profile" on public.profiles;
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Expose only fields used by public ranking; never expose student_profiles here.
create or replace view public.player_directory as
  select id, nickname, class_id, xp from public.profiles;
grant select on public.player_directory to authenticated;

create table if not exists public.aimags (
  id text primary key,
  name text not null unique
);
create table if not exists public.soums (
  id text primary key,
  aimag_id text not null references public.aimags(id) on delete cascade,
  name text not null,
  unique (aimag_id, name)
);
do $$ begin
  create type public.region_type as enum ('ulaanbaatar', 'rural');
exception when duplicate_object then null; end $$;
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  region_type public.region_type not null,
  aimag_id text references public.aimags(id),
  soum_id text references public.soums(id),
  is_sample boolean not null default false,
  check ((region_type = 'ulaanbaatar' and aimag_id is null and soum_id is null)
      or (region_type = 'rural' and aimag_id is not null and soum_id is not null))
);
create unique index if not exists schools_location_name_key
  on public.schools (lower(name), coalesce(aimag_id, ''), coalesce(soum_id, ''), region_type);

create table if not exists public.student_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  region_type public.region_type not null,
  aimag_id text references public.aimags(id),
  soum_id text references public.soums(id),
  school_id uuid references public.schools(id),
  school_other text,
  updated_at timestamptz not null default now(),
  constraint student_profiles_region_location_check check (
    (region_type = 'rural' and aimag_id is not null and soum_id is not null)
    or (region_type = 'ulaanbaatar' and aimag_id is null and soum_id is null)
  ),
  constraint student_profiles_school_required_check check (
    school_id is not null or nullif(btrim(school_other), '') is not null
  )
);

-- A user's school and exact location are private. Reference tables are public read-only.
alter table public.student_profiles enable row level security;
drop policy if exists "read own student profile" on public.student_profiles;
drop policy if exists "insert own student profile" on public.student_profiles;
drop policy if exists "update own student profile" on public.student_profiles;
create policy "read own student profile" on public.student_profiles for select to authenticated using (auth.uid() = user_id);
create policy "insert own student profile" on public.student_profiles for insert to authenticated with check (auth.uid() = user_id);
create policy "update own student profile" on public.student_profiles for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$ declare t text; begin
  foreach t in array array['aimags','soums','schools'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "read reference %1$s" on public.%1$I', t);
    execute format('create policy "read reference %1$s" on public.%1$I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- Apply supabase/reference-data/reference-data.seed.sql after this migration.

-- New signups receive the class selected by the existing signup screen.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nickname, class_id)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'nickname', 'Scientist'),
    coalesce(new.raw_user_meta_data ->> 'class_id', 'beginner')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
