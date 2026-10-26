-- Attach ESIS identifiers and allow the authoritative directory's aimag-only
-- location rows. Student profiles still require the user's chosen soum.
alter table public.schools add column if not exists esis_id text;

drop index if exists public.schools_location_name_key;
alter table public.schools drop constraint if exists schools_check;
alter table public.schools drop constraint if exists schools_district_region_check;
alter table public.schools
  add constraint schools_district_region_check check (
    (region_type = 'ulaanbaatar' and district_id is not null and aimag_id is null and soum_id is null)
    or (region_type = 'rural' and district_id is null and aimag_id is not null)
  ) not valid;

create unique index if not exists schools_esis_id_key
  on public.schools (esis_id) where esis_id is not null;

-- The source directory resolves schools to districts in Ulaanbaatar and aimags
-- in the countryside. It does not publish soum-level school assignments.
