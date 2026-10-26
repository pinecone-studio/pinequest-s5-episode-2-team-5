-- Run once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  nickname text not null,
  class_id text not null check (class_id in ('beginner', 'medium', 'hard')),
  region_type text check (region_type in ('city', 'province')),
  region_name text,
  xp int not null default 0 check (xp >= 0),
  completed jsonb not null default '{}',
  created_at timestamptz not null default now(),
  constraint profiles_region_pair_check check (
    (region_type is null and region_name is null)
    or (region_type is not null and region_name is not null and length(trim(region_name)) between 1 and 80)
  )
);
create unique index if not exists profiles_nickname_key on profiles (lower(nickname));
create index if not exists profiles_xp_idx on profiles (xp desc);
create index if not exists profiles_region_xp_idx on profiles (region_type, region_name, xp desc) where region_type is not null;

alter table profiles enable row level security;
create policy "read profiles" on profiles for select to authenticated using (true);
create policy "update own profile" on profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- The profile row is created from the sign-up metadata, so it exists as soon as the account does.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, nickname, class_id, region_type, region_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'nickname',
    coalesce(new.raw_user_meta_data ->> 'class_id', 'beginner'),
    new.raw_user_meta_data ->> 'region_type',
    new.raw_user_meta_data ->> 'region_name'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Lets the sign-up form check a nickname before the user is signed in.
create or replace function nickname_available(wanted text) returns boolean
language sql security definer set search_path = public as $$
  select not exists (select 1 from profiles where lower(nickname) = lower(wanted));
$$;
grant execute on function nickname_available(text) to anon, authenticated;

-- OpenLab JSON experiment catalog: run supabase/experiments.sql separately.
-- It includes the catalog migration and all 14 initial lesson definitions.
