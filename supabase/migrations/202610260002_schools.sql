-- Schools are maintained by trusted admins through the Supabase dashboard or SQL.
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 160),
  region_type text not null check (region_type in ('city', 'province')),
  region_name text not null check (length(trim(region_name)) between 1 and 80),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists schools_region_name_key
  on public.schools (region_type, region_name, lower(name));
create index if not exists schools_region_active_name_idx
  on public.schools (region_type, region_name, name) where is_active;

alter table public.schools enable row level security;
grant select on public.schools to anon, authenticated;
drop policy if exists "read active schools" on public.schools;
create policy "read active schools" on public.schools
  for select to anon, authenticated using (is_active);

alter table public.profiles add column if not exists school_id uuid
  references public.schools(id) on delete set null;

create index if not exists profiles_school_id_idx on public.profiles (school_id)
  where school_id is not null;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nickname, class_id, region_type, region_name, school_id)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'nickname',
    coalesce(new.raw_user_meta_data ->> 'class_id', 'beginner'),
    new.raw_user_meta_data ->> 'region_type',
    new.raw_user_meta_data ->> 'region_name',
    nullif(new.raw_user_meta_data ->> 'school_id', '')::uuid
  );
  return new;
end;
$$;

notify pgrst, 'reload schema';
