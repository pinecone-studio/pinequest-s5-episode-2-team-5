-- Add Ulaanbaatar district selection without changing existing student accounts.
create table if not exists public.ub_districts (
  id text primary key,
  name text not null unique
);

alter table public.schools
  add column if not exists district_id text references public.ub_districts(id);
alter table public.student_profiles
  add column if not exists district_id text references public.ub_districts(id);

drop index if exists public.schools_location_name_key;
create unique index schools_location_name_key
  on public.schools (lower(name), coalesce(district_id, ''), coalesce(aimag_id, ''), coalesce(soum_id, ''), region_type);

create index if not exists schools_district_name_idx
  on public.schools (district_id, lower(name))
  where district_id is not null;

alter table public.schools
  drop constraint if exists schools_district_region_check;
alter table public.schools
  add constraint schools_district_region_check check (
    (region_type = 'ulaanbaatar' and district_id is not null and aimag_id is null and soum_id is null)
    or (region_type = 'rural' and district_id is null and aimag_id is not null and soum_id is not null)
  ) not valid;

alter table public.student_profiles
  drop constraint if exists student_profiles_district_region_check;
alter table public.student_profiles
  add constraint student_profiles_district_region_check check (
    (region_type = 'ulaanbaatar' and district_id is not null and aimag_id is null and soum_id is null)
    or (region_type = 'rural' and district_id is null and aimag_id is not null and soum_id is not null)
  ) not valid;

alter table public.ub_districts enable row level security;
drop policy if exists "read reference ub_districts" on public.ub_districts;
create policy "read reference ub_districts" on public.ub_districts
  for select to anon, authenticated using (true);
grant select on public.ub_districts to anon, authenticated;

-- Seed data comes from supabase/reference-data/ub-districts.csv via
-- scripts/generate-location-sql.mjs; do not maintain a second inline list here.
