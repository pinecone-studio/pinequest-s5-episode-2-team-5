-- Star (the lab helper, formerly Pip) writes a few of its short lab comments with the AI. They get
-- their own daily budget, 'star', so they never use up a student's chat questions ('tutor').
-- To let Star write more of its comments with AI, raise the 'star' cap in a new migration (and
-- STAR_AI in openlab-3d/src/lab/starLines.ts). Safe to re-run.
alter table hub.ai_usage drop constraint if exists ai_usage_kind_check;
alter table hub.ai_usage add constraint ai_usage_kind_check check(kind in ('tutor','advisor','star'));

-- Counts one AI request for the signed-in student; false once today's limit is used up.
-- Days follow Ulaanbaatar time, so limits reset at the students' midnight.
create or replace function public.use_ai_quota(p_kind text) returns boolean
language plpgsql security definer set search_path='' as $$
declare
 uid uuid:=auth.uid(); today date:=(now() at time zone 'Asia/Ulaanbaatar')::date; cap integer; used integer;
begin
 if uid is null then raise exception 'Authentication required';end if;
 cap:=case p_kind when 'tutor' then 60 when 'advisor' then 10 when 'star' then 40 end;
 if cap is null then raise exception 'Invalid kind';end if;
 insert into hub.ai_usage(user_id,day,kind,count) values(uid,today,p_kind,1)
 on conflict(user_id,day,kind) do update set count=hub.ai_usage.count+1 where hub.ai_usage.count<cap
 returning count into used;
 return used is not null;
end;$$;
revoke all on function public.use_ai_quota(text) from public,anon;
grant execute on function public.use_ai_quota(text) to authenticated;
