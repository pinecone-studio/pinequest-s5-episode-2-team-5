-- Revision progress merge, v2. Requires 202610250002_grade7_learning.sql; safe to re-run.
-- Wrong-answer membership becomes latest-wins per question (clock key 'wrong.<id>'), so a
-- question answered correctly later is not restored by a stale device. Unclocked entries
-- from older app builds are still added (union). Structured practical workbook scores
-- ('labBest') merge as maxima. Reads, best scores and card/objective ratings are unchanged.
create or replace function public.sync_revision_progress(p_pack text,p_state jsonb,p_clocks jsonb default '{}',p_user uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); current_state jsonb; current_clocks jsonb; field text; entry record; merged jsonb; stamp double precision; item text;
begin
 if uid is null or uid is distinct from p_user then raise exception 'Authentication required';end if;
 if p_pack not in ('g7-chem','g8-chem','g9-chem','g10-chem') or jsonb_typeof(p_state) is distinct from 'object' or jsonb_typeof(p_clocks) is distinct from 'object'
  or octet_length(p_state::text)>500000 or octet_length(p_clocks::text)>500000 then raise exception 'Invalid progress';end if;
 insert into hub.revision_progress(user_id,pack_id) values(uid,p_pack) on conflict do nothing;
 select state,clocks into current_state,current_clocks from hub.revision_progress where user_id=uid and pack_id=p_pack for update;
 -- Rows created before labBest existed lack the key; jsonb_set cannot create nested paths.
 foreach field in array array['quizBest','questionBest','labBest','cards','ratings'] loop
  if jsonb_typeof(current_state->field) is distinct from 'object' then current_state:=jsonb_set(current_state,array[field],'{}');end if;
 end loop;
 foreach field in array array['notes','practicals','wrong'] loop
  if jsonb_typeof(current_state->field) is distinct from 'array' then current_state:=jsonb_set(current_state,array[field],'[]');end if;
 end loop;

 foreach field in array array['notes','practicals'] loop
  if jsonb_typeof(p_state->field)='array' then
   select coalesce(jsonb_agg(distinct value),'[]') into merged from jsonb_array_elements((current_state->field)||(p_state->field)) where jsonb_typeof(value)='string';
   current_state:=jsonb_set(current_state,array[field],merged);
  end if;
 end loop;

 for entry in select key,value from jsonb_each(p_clocks) where key like 'wrong.%' loop
  if jsonb_typeof(entry.value)='number' then
   stamp:=(entry.value::text)::double precision;
   if stamp>=0 and stamp>coalesce((current_clocks->>entry.key)::double precision,-1) then
    item:=substr(entry.key,7);
    select coalesce(jsonb_agg(value),'[]') into merged from jsonb_array_elements(current_state->'wrong') where value<>to_jsonb(item);
    if jsonb_typeof(p_state->'wrong')='array' and (p_state->'wrong') ? item then merged:=merged||to_jsonb(item);end if;
    current_state:=jsonb_set(current_state,'{wrong}',merged);
    current_clocks:=jsonb_set(current_clocks,array[entry.key],to_jsonb(stamp));
   end if;
  end if;
 end loop;
 if jsonb_typeof(p_state->'wrong')='array' then
  for entry in select value from jsonb_array_elements(p_state->'wrong') where jsonb_typeof(value)='string' loop
   item:=entry.value#>>'{}';
   if not (p_clocks ? ('wrong.'||item)) and not (current_clocks ? ('wrong.'||item)) and not ((current_state->'wrong') ? item) then
    current_state:=jsonb_set(current_state,'{wrong}',(current_state->'wrong')||to_jsonb(item));
   end if;
  end loop;
 end if;

 foreach field in array array['quizBest','questionBest','labBest'] loop
  if jsonb_typeof(p_state->field)='object' then
   for entry in select key,value from jsonb_each(p_state->field) loop
    if jsonb_typeof(entry.value)='number' then
     if (entry.value::text)::numeric>=0 and (entry.value::text)::numeric<=(case when field='questionBest' then 1000 else 100 end) then
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
