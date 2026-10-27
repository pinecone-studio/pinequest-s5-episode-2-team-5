-- Textbook investigation notebooks (prediction, trials, observation, conclusion) across devices.
-- Writes go only through sync_investigation_attempt, which merges like sync_revision_progress:
-- the newest edit of each answer wins and trials are a union. Safe to re-run.
create schema if not exists hub;
create table if not exists hub.investigation_attempts (
 user_id uuid not null references auth.users(id) on delete cascade,
 investigation_id text not null check(investigation_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$'),
 attempt jsonb not null default '{"prediction":"","observation":"","conclusion":"","trials":[],"revealed":false}' check(jsonb_typeof(attempt)='object'),
 clocks jsonb not null default '{}',updated_at timestamptz not null default now(),
 primary key(user_id,investigation_id)
);
alter table hub.investigation_attempts enable row level security;
drop policy if exists "own investigation attempts" on hub.investigation_attempts;
create policy "own investigation attempts" on hub.investigation_attempts for select to authenticated using(user_id=auth.uid());
revoke all on hub.investigation_attempts from anon,authenticated;

create or replace function public.sync_investigation_attempt(p_id text,p_attempt jsonb,p_clocks jsonb default '{}',p_user uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); current_attempt jsonb; current_clocks jsonb; field text; stamp double precision; merged jsonb;
begin
 if uid is null or uid is distinct from p_user then raise exception 'Authentication required';end if;
 if p_id is null or p_id !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$' or jsonb_typeof(p_attempt) is distinct from 'object' or jsonb_typeof(p_clocks) is distinct from 'object' or octet_length(p_attempt::text)>200000 then raise exception 'Invalid attempt';end if;
 insert into hub.investigation_attempts(user_id,investigation_id) values(uid,p_id) on conflict do nothing;
 select attempt,clocks into current_attempt,current_clocks from hub.investigation_attempts where user_id=uid and investigation_id=p_id for update;
 -- Answers and the shown/hidden explanation: the newest edit wins.
 foreach field in array array['prediction','observation','conclusion','revealed'] loop
  if (field='revealed' and jsonb_typeof(p_attempt->field)='boolean') or (field<>'revealed' and jsonb_typeof(p_attempt->field)='string' and char_length(p_attempt->>field)<=3000) then
   stamp:=case when jsonb_typeof(p_clocks->field)='number' then (p_clocks->>field)::double precision else 0 end;
   if stamp>coalesce((current_clocks->>field)::double precision,-1) then
    current_attempt:=jsonb_set(current_attempt,array[field],p_attempt->field);
    current_clocks:=jsonb_set(current_clocks,array[field],to_jsonb(stamp));
   end if;
  end if;
 end loop;
 -- Trials are only ever added: union by time, newest 30 kept.
 if jsonb_typeof(p_attempt->'trials')='array' then
  select coalesce(jsonb_agg(trial order by at),'[]') into merged from (
   select trial,at from (
    select distinct on (at) trial,at from (
     select value as trial,(value->>'at')::double precision as at
     from jsonb_array_elements(coalesce(current_attempt->'trials','[]')||(p_attempt->'trials'))
     where jsonb_typeof(value)='object' and jsonb_typeof(value->'at')='number'
    ) candidates order by at
   ) unique_trials order by at desc limit 30
  ) newest;
  current_attempt:=jsonb_set(current_attempt,'{trials}',merged);
 end if;
 update hub.investigation_attempts set attempt=current_attempt,clocks=current_clocks,updated_at=now() where user_id=uid and investigation_id=p_id;
 return jsonb_build_object('attempt',current_attempt,'clocks',current_clocks);
end;$$;
revoke all on function public.sync_investigation_attempt(text,jsonb,jsonb,uuid) from public,anon;
grant execute on function public.sync_investigation_attempt(text,jsonb,jsonb,uuid) to authenticated;

notify pgrst, 'reload schema';
