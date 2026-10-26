alter table public.profiles
  add column if not exists region_type text,
  add column if not exists region_name text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_region_pair_check'
  ) then
    alter table public.profiles
      add constraint profiles_region_pair_check check (
        (region_type is null and region_name is null)
        or (
          region_type is not null
          and region_type in ('city', 'province')
          and region_name is not null
          and length(trim(region_name)) between 1 and 80
        )
      );
  end if;
end;
$$;

create index if not exists profiles_region_xp_idx
  on public.profiles (region_type, region_name, xp desc)
  where region_type is not null;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, nickname, class_id, region_type, region_name)
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
