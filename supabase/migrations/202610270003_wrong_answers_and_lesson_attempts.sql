-- 1. Revision wrong-answer list: each question now follows its newest mark, so answering it right
--    on one device also clears it on the others (before, the list was only ever added to).
--    Clients send {"wrongMarks":{"<question id>":true|false}} with "wrong.<id>" clocks; "wrong" is
--    rebuilt from the marks. Everything else is unchanged from 202610250002_grade7_learning.sql.
-- 2. Lesson attempts: one row per finished lesson (stars, mistakes, the answer picked at each quiz step).
-- Safe to re-run.
create or replace function public.sync_revision_progress(p_pack text,p_state jsonb,p_clocks jsonb default '{}',p_user uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); current_state jsonb; current_clocks jsonb; field text; entry record; merged jsonb; stamp double precision;
begin
 if uid is null or uid is distinct from p_user then raise exception 'Authentication required';end if;
 if p_pack not in ('g7-chem','g8-chem','g9-chem','g10-chem') or jsonb_typeof(p_state) is distinct from 'object' or jsonb_typeof(p_clocks) is distinct from 'object' or octet_length(p_state::text)>500000 then raise exception 'Invalid progress';end if;
 insert into hub.revision_progress(user_id,pack_id) values(uid,p_pack) on conflict do nothing;
 select state,clocks into current_state,current_clocks from hub.revision_progress where user_id=uid and pack_id=p_pack for update;
 foreach field in array array['notes','practicals'] loop
  if jsonb_typeof(p_state->field)='array' then
   select coalesce(jsonb_agg(distinct value),'[]') into merged from jsonb_array_elements((current_state->field)||(p_state->field)) where jsonb_typeof(value)='string';
   current_state:=jsonb_set(current_state,array[field],merged);
  end if;
 end loop;
 foreach field in array array['quizBest','questionBest'] loop
  if jsonb_typeof(p_state->field)='object' then
   for entry in select key,value from jsonb_each(p_state->field) loop
    if jsonb_typeof(entry.value)='number' then
     if (entry.value::text)::numeric>=0 and (entry.value::text)::numeric<=(case when field='quizBest' then 100 else 1000 end) then
      current_state:=jsonb_set(current_state,array[field,entry.key],to_jsonb(greatest(coalesce((current_state->field->>entry.key)::numeric,0),(entry.value::text)::numeric)));
     end if;
    end if;
   end loop;
  end if;
 end loop;
 foreach field in array array['cards','ratings'] loop
  if jsonb_typeof(p_state->field)='object' then
   for entry in select key,value from jsonb_each(p_state->field) loop
    if (field='cards' and entry.value in ('"known"'::jsonb,'"again"'::jsonb)) or (field='ratings' and entry.value in ('"red"'::jsonb,'"amber"'::jsonb,'"green"'::jsonb)) then
     stamp:=case when jsonb_typeof(p_clocks->(field||'.'||entry.key))='number' then (p_clocks->>(field||'.'||entry.key))::double precision else 0 end;
     if stamp>coalesce((current_clocks->>(field||'.'||entry.key))::double precision,-1) then
      current_state:=jsonb_set(current_state,array[field,entry.key],entry.value);
      current_clocks:=jsonb_set(current_clocks,array[field||'.'||entry.key],to_jsonb(stamp));
     end if;
    end if;
   end loop;
  end if;
 end loop;
 -- Rows saved before this version keep their old list as marks with no time, so any newer mark wins.
 if jsonb_typeof(current_state->'wrongMarks') is distinct from 'object' then
  select coalesce(jsonb_object_agg(value,true),'{}') into merged from jsonb_array_elements_text(case when jsonb_typeof(current_state->'wrong')='array' then current_state->'wrong' else '[]' end);
  current_state:=jsonb_set(current_state,'{wrongMarks}',merged);
 end if;
 if jsonb_typeof(p_state->'wrongMarks')='object' then
  for entry in select key,value from jsonb_each(p_state->'wrongMarks') loop
   if jsonb_typeof(entry.value)='boolean' and char_length(entry.key)<=100 then
    stamp:=case when jsonb_typeof(p_clocks->('wrong.'||entry.key))='number' then (p_clocks->>('wrong.'||entry.key))::double precision else 0 end;
    if stamp>coalesce((current_clocks->>('wrong.'||entry.key))::double precision,-1) then
     current_state:=jsonb_set(current_state,array['wrongMarks',entry.key],entry.value);
     current_clocks:=jsonb_set(current_clocks,array['wrong.'||entry.key],to_jsonb(stamp));
    end if;
   end if;
  end loop;
 end if;
 select coalesce(jsonb_agg(key order by key),'[]') into merged from jsonb_each(current_state->'wrongMarks') where value='true'::jsonb;
 current_state:=jsonb_set(current_state,'{wrong}',merged);
 update hub.revision_progress set state=current_state,clocks=current_clocks,updated_at=now() where user_id=uid and pack_id=p_pack;
 return jsonb_build_object('state',current_state,'clocks',current_clocks);
end;$$;
revoke all on function public.sync_revision_progress(text,jsonb,jsonb,uuid) from public,anon;
grant execute on function public.sync_revision_progress(text,jsonb,jsonb,uuid) to authenticated;

create schema if not exists hub;
create table if not exists hub.lesson_attempts (
 user_id uuid not null references auth.users(id) on delete cascade,
 attempt_id text not null check(attempt_id ~ '^[A-Za-z0-9-]{8,64}$'),
 lesson_id text not null check(lesson_id ~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$'),
 stars smallint not null check(stars between 1 and 3),
 mistakes smallint not null check(mistakes between 0 and 100),
 -- [{"step": index in the lesson, "picked": option index, "correct": bool}] for each quiz step
 answers jsonb not null default '[]' check(jsonb_typeof(answers)='array'),
 finished_at timestamptz not null,received_at timestamptz not null default now(),
 primary key(user_id,attempt_id)
);
create index if not exists lesson_attempts_user_lesson on hub.lesson_attempts(user_id,lesson_id);
alter table hub.lesson_attempts enable row level security;
drop policy if exists "own lesson attempts" on hub.lesson_attempts;
create policy "own lesson attempts" on hub.lesson_attempts for select to authenticated using(user_id=auth.uid());
revoke all on hub.lesson_attempts from anon,authenticated;

create or replace function public.record_lesson_attempt(p_attempt text,p_lesson text,p_stars integer,p_mistakes integer,p_answers jsonb,p_finished_at timestamptz,p_user uuid default null) returns void
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid();
begin
 if uid is null or uid is distinct from p_user then raise exception 'Authentication required';end if;
 if p_attempt is null or p_attempt !~ '^[A-Za-z0-9-]{8,64}$' or p_lesson is null or p_lesson !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$'
  or p_stars is null or p_stars not between 1 and 3 or p_mistakes is null or p_mistakes not between 0 and 100
  or jsonb_typeof(p_answers) is distinct from 'array' or jsonb_array_length(p_answers)>100 or octet_length(p_answers::text)>20000
  or p_finished_at is null or p_finished_at>now()+interval '1 day' then raise exception 'Invalid lesson attempt';end if;
 -- Sending the same attempt again (after a lost reply) changes nothing.
 insert into hub.lesson_attempts(user_id,attempt_id,lesson_id,stars,mistakes,answers,finished_at)
 values(uid,p_attempt,p_lesson,p_stars,p_mistakes,p_answers,p_finished_at) on conflict do nothing;
end;$$;
revoke all on function public.record_lesson_attempt(text,text,integer,integer,jsonb,timestamptz,uuid) from public,anon;
grant execute on function public.record_lesson_attempt(text,text,integer,integer,jsonb,timestamptz,uuid) to authenticated;

notify pgrst, 'reload schema';
