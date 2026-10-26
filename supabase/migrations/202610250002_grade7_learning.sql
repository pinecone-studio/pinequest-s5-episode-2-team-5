-- Extend published curriculum constraints. Existing grades, RLS and progress are preserved.
-- Requires 202610250001_grade10_learning.sql; safe to re-run.
alter table public.lesson_packs drop constraint if exists lesson_packs_id_check;
alter table public.lesson_packs add constraint lesson_packs_id_check check(id in ('g7-chem','g8-chem','g9-chem','g10-chem'));
alter table public.textbook_investigations drop constraint if exists textbook_investigations_grade_check;
alter table public.textbook_investigations add constraint textbook_investigations_grade_check check(grade in (7,8,9,10));

-- The existing own-user, row-locked union/max/latest merge now accepts Grades 7–10.
create or replace function public.sync_revision_progress(p_pack text,p_state jsonb,p_clocks jsonb default '{}',p_user uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); current_state jsonb; current_clocks jsonb; field text; entry record; merged jsonb; stamp double precision;
begin
 if uid is null or uid is distinct from p_user then raise exception 'Authentication required';end if;
 if p_pack not in ('g7-chem','g8-chem','g9-chem','g10-chem') or jsonb_typeof(p_state) is distinct from 'object' or jsonb_typeof(p_clocks) is distinct from 'object' or octet_length(p_state::text)>500000 then raise exception 'Invalid progress';end if;
 insert into hub.revision_progress(user_id,pack_id) values(uid,p_pack) on conflict do nothing;
 select state,clocks into current_state,current_clocks from hub.revision_progress where user_id=uid and pack_id=p_pack for update;
 foreach field in array array['notes','practicals','wrong'] loop
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
 update hub.revision_progress set state=current_state,clocks=current_clocks,updated_at=now() where user_id=uid and pack_id=p_pack;
 return jsonb_build_object('state',current_state,'clocks',current_clocks);
end;$$;
revoke all on function public.sync_revision_progress(text,jsonb,jsonb,uuid) from public,anon;
grant execute on function public.sync_revision_progress(text,jsonb,jsonb,uuid) to authenticated;
