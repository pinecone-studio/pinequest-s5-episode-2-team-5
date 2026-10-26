alter table public.profiles
  add column if not exists subregion_name text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_subregion_name_check'
  ) then
    alter table public.profiles
      add constraint profiles_subregion_name_check check (
        subregion_name is null or length(trim(subregion_name)) between 1 and 80
      );
  end if;
end;
$$;

create index if not exists profiles_region_subregion_xp_idx
  on public.profiles (region_type, region_name, subregion_name, xp desc)
  where region_type is not null and subregion_name is not null;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nickname, class_id, region_type, region_name, school_id, subregion_name)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'nickname',
    coalesce(new.raw_user_meta_data ->> 'class_id', 'beginner'),
    new.raw_user_meta_data ->> 'region_type',
    new.raw_user_meta_data ->> 'region_name',
    nullif(new.raw_user_meta_data ->> 'school_id', '')::uuid,
    new.raw_user_meta_data ->> 'subregion_name'
  );
  return new;
end;
$$;

notify pgrst, 'reload schema';
