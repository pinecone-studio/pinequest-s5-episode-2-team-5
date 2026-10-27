-- AI tutor (openlab-tutor) and study advisor (study-advisor) edge functions: per-student daily
-- limits, so the AI key's budget cannot be spent by anyone with the public app key, and each
-- student's latest advice per grade, reused while their progress is unchanged. Safe to re-run.
create schema if not exists hub;

create table if not exists hub.ai_usage (
 user_id uuid not null references auth.users(id) on delete cascade,
 day date not null,
 kind text not null check(kind in ('tutor','advisor')),
 count integer not null default 0,
 primary key(user_id,day,kind)
);
alter table hub.ai_usage enable row level security;
drop policy if exists "own ai usage" on hub.ai_usage;
create policy "own ai usage" on hub.ai_usage for select to authenticated using(user_id=auth.uid());
revoke all on hub.ai_usage from anon,authenticated;

-- Counts one AI request for the signed-in student; false once today's limit is used up.
-- Days follow Ulaanbaatar time, so limits reset at the students' midnight.
create or replace function public.use_ai_quota(p_kind text) returns boolean
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); today date:=(now() at time zone 'Asia/Ulaanbaatar')::date; cap integer; used integer;
begin
 if uid is null then raise exception 'Authentication required';end if;
 cap:=case p_kind when 'tutor' then 60 when 'advisor' then 10 end;
 if cap is null then raise exception 'Invalid kind';end if;
 insert into hub.ai_usage(user_id,day,kind,count) values(uid,today,p_kind,1)
 on conflict(user_id,day,kind) do update set count=hub.ai_usage.count+1 where hub.ai_usage.count<cap
 returning count into used;
 return used is not null;
end;$$;
revoke all on function public.use_ai_quota(text) from public,anon;
grant execute on function public.use_ai_quota(text) to authenticated;

create table if not exists hub.study_advice (
 user_id uuid not null references auth.users(id) on delete cascade,
 pack_id text not null check(pack_id in ('g7-chem','g8-chem','g9-chem','g10-chem')),
 facts_hash text not null,
 advice jsonb not null check(jsonb_typeof(advice)='array'),
 created_at timestamptz not null default now(),
 primary key(user_id,pack_id)
);
alter table hub.study_advice enable row level security;
drop policy if exists "own study advice" on hub.study_advice;
create policy "own study advice" on hub.study_advice for select to authenticated using(user_id=auth.uid());
revoke all on hub.study_advice from anon,authenticated;

-- The signed-in student's revision progress for one grade and their saved advice for it.
create or replace function public.get_study_snapshot(p_pack text) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare
 uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Authentication required';end if;
 if p_pack is null or p_pack not in ('g7-chem','g8-chem','g9-chem','g10-chem') then raise exception 'Invalid pack';end if;
 return jsonb_build_object(
  'progress',(select state from hub.revision_progress where user_id=uid and pack_id=p_pack),
  'saved',(select jsonb_build_object('hash',facts_hash,'advice',advice,'createdAt',created_at) from hub.study_advice where user_id=uid and pack_id=p_pack));
end;$$;
revoke all on function public.get_study_snapshot(text) from public,anon;
grant execute on function public.get_study_snapshot(text) to authenticated;

create or replace function public.save_study_advice(p_pack text,p_hash text,p_advice jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid();
begin
 if uid is null then raise exception 'Authentication required';end if;
 if p_pack is null or p_pack not in ('g7-chem','g8-chem','g9-chem','g10-chem') or p_hash is null or char_length(p_hash)>64
  or jsonb_typeof(p_advice) is distinct from 'array' or jsonb_array_length(p_advice)>5 or octet_length(p_advice::text)>20000 then raise exception 'Invalid advice';end if;
 insert into hub.study_advice(user_id,pack_id,facts_hash,advice) values(uid,p_pack,p_hash,p_advice)
 on conflict(user_id,pack_id) do update set facts_hash=excluded.facts_hash,advice=excluded.advice,created_at=now();
end;$$;
revoke all on function public.save_study_advice(text,text,jsonb) from public,anon;
grant execute on function public.save_study_advice(text,text,jsonb) to authenticated;

notify pgrst, 'reload schema';
