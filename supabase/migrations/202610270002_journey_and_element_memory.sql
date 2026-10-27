-- Catalyst journey progress and periodic-table memory across devices. Writes go only through the
-- sync functions below, which merge like sync_revision_progress. Safe to re-run.
create schema if not exists hub;

-- Catalyst journey: the newest edit of each field wins; the best quiz score only goes up.
create table if not exists hub.journey_progress (
 user_id uuid not null references auth.users(id) on delete cascade,
 journey_id text not null check(journey_id in ('catalyst')),
 state jsonb not null default '{"version":1,"step":0,"prediction":null,"observation":"","source":null,"reflection":"","revealed":false,"marks":[],"answers":{},"best":0,"completed":false}' check(jsonb_typeof(state)='object'),
 clocks jsonb not null default '{}',updated_at timestamptz not null default now(),
 primary key(user_id,journey_id)
);
alter table hub.journey_progress enable row level security;
drop policy if exists "own journey progress" on hub.journey_progress;
create policy "own journey progress" on hub.journey_progress for select to authenticated using(user_id=auth.uid());
revoke all on hub.journey_progress from anon,authenticated;

create or replace function public.sync_journey_progress(p_journey text,p_state jsonb,p_clocks jsonb default '{}',p_user uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); current_state jsonb; current_clocks jsonb; field text; candidate jsonb; stamp double precision;
begin
 if uid is null or uid is distinct from p_user then raise exception 'Authentication required';end if;
 if p_journey is distinct from 'catalyst' or jsonb_typeof(p_state) is distinct from 'object' or jsonb_typeof(p_clocks) is distinct from 'object' or octet_length(p_state::text)>50000 then raise exception 'Invalid journey';end if;
 insert into hub.journey_progress(user_id,journey_id) values(uid,p_journey) on conflict do nothing;
 select state,clocks into current_state,current_clocks from hub.journey_progress where user_id=uid and journey_id=p_journey for update;
 -- "Start over" changes every field, so it is newer than the answers it clears on other devices.
 foreach field in array array['step','prediction','observation','source','reflection','revealed','marks','answers','completed'] loop
  candidate:=p_state->field;
  if candidate is not null and (case
    when field='step' then candidate::text ~ '^[0-4]$'
    when field='prediction' then candidate::text ~ '^(null|[0-2])$'
    when field in ('observation','reflection') then jsonb_typeof(candidate)='string' and char_length(candidate#>>'{}')<=3000
    when field='source' then candidate::text in ('null','"lab"','"illustration"')
    when field in ('revealed','completed') then jsonb_typeof(candidate)='boolean'
    when field='marks' then jsonb_typeof(candidate)='array' and jsonb_array_length(candidate)<=3
    else jsonb_typeof(candidate)='object' and octet_length(candidate::text)<=1000
   end) then
   stamp:=case when jsonb_typeof(p_clocks->field)='number' then (p_clocks->>field)::double precision else 0 end;
   if stamp>coalesce((current_clocks->>field)::double precision,-1) then
    current_state:=jsonb_set(current_state,array[field],candidate);
    current_clocks:=jsonb_set(current_clocks,array[field],to_jsonb(stamp));
   end if;
  end if;
 end loop;
 if (p_state->>'best') ~ '^[0-3]$' then
  current_state:=jsonb_set(current_state,'{best}',to_jsonb(greatest(coalesce((current_state->>'best')::int,0),(p_state->>'best')::int)));
 end if;
 update hub.journey_progress set state=current_state,clocks=current_clocks,updated_at=now() where user_id=uid and journey_id=p_journey;
 return jsonb_build_object('state',current_state,'clocks',current_clocks);
end;$$;
revoke all on function public.sync_journey_progress(text,jsonb,jsonb,uuid) from public,anon;
grant execute on function public.sync_journey_progress(text,jsonb,jsonb,uuid) to authenticated;

-- Periodic table memory: "known" per element follows the newest rating, so un-marking also syncs.
-- Answer counts are stored per device ({device: {element: {correct,total}}}) and only grow there,
-- so practice on two phones adds up: sum over devices for a student's totals.
create table if not exists hub.element_memory (
 user_id uuid primary key references auth.users(id) on delete cascade,
 known jsonb not null default '{}' check(jsonb_typeof(known)='object'),
 clocks jsonb not null default '{}',
 attempts jsonb not null default '{}' check(jsonb_typeof(attempts)='object'),
 updated_at timestamptz not null default now()
);
alter table hub.element_memory enable row level security;
drop policy if exists "own element memory" on hub.element_memory;
create policy "own element memory" on hub.element_memory for select to authenticated using(user_id=auth.uid());
revoke all on hub.element_memory from anon,authenticated;

create or replace function public.sync_element_memory(p_known jsonb,p_clocks jsonb,p_device text,p_attempts jsonb,p_user uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); current_known jsonb; current_clocks jsonb; current_attempts jsonb; entry record; stamp double precision; previous jsonb;
begin
 if uid is null or uid is distinct from p_user then raise exception 'Authentication required';end if;
 if p_device is null or p_device !~ '^[A-Za-z0-9-]{8,64}$' or jsonb_typeof(p_known) is distinct from 'object' or jsonb_typeof(p_clocks) is distinct from 'object' or jsonb_typeof(p_attempts) is distinct from 'object' or octet_length(p_known::text)+octet_length(p_attempts::text)>100000 then raise exception 'Invalid element memory';end if;
 insert into hub.element_memory(user_id) values(uid) on conflict do nothing;
 select known,clocks,attempts into current_known,current_clocks,current_attempts from hub.element_memory where user_id=uid for update;
 for entry in select key,value from jsonb_each(p_known) loop
  if entry.key ~ '^[0-9]{1,3}$' and jsonb_typeof(entry.value)='boolean' then
   if entry.key::int between 1 and 118 then
    stamp:=case when jsonb_typeof(p_clocks->entry.key)='number' then (p_clocks->>entry.key)::double precision else 0 end;
    if stamp>coalesce((current_clocks->>entry.key)::double precision,-1) then
     current_known:=jsonb_set(current_known,array[entry.key],entry.value);
     current_clocks:=jsonb_set(current_clocks,array[entry.key],to_jsonb(stamp));
    end if;
   end if;
  end if;
 end loop;
 if current_attempts->p_device is null then current_attempts:=jsonb_set(current_attempts,array[p_device],'{}');end if;
 for entry in select key,value from jsonb_each(p_attempts) loop
  if entry.key ~ '^[0-9]{1,3}$' and (entry.value->>'correct') ~ '^[0-9]{1,7}$' and (entry.value->>'total') ~ '^[0-9]{1,7}$' then
   if entry.key::int between 1 and 118 and (entry.value->>'correct')::int<=(entry.value->>'total')::int then
    previous:=current_attempts->p_device->entry.key;
    if previous is null or (entry.value->>'total')::int>(previous->>'total')::int then
     current_attempts:=jsonb_set(current_attempts,array[p_device,entry.key],jsonb_build_object('correct',(entry.value->>'correct')::int,'total',(entry.value->>'total')::int));
    end if;
   end if;
  end if;
 end loop;
 update hub.element_memory set known=current_known,clocks=current_clocks,attempts=current_attempts,updated_at=now() where user_id=uid;
 return jsonb_build_object('known',current_known,'clocks',current_clocks);
end;$$;
revoke all on function public.sync_element_memory(jsonb,jsonb,text,jsonb,uuid) from public,anon;
grant execute on function public.sync_element_memory(jsonb,jsonb,text,jsonb,uuid) to authenticated;

notify pgrst, 'reload schema';
