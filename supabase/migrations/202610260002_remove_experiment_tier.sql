-- Remove the informational difficulty tier from stored experiment JSON.
-- Keep all experiment rows and their lesson content.
do $$ begin
  if to_regclass('public.experiments') is null then
    return;
  end if;

  alter table public.experiments drop constraint if exists experiments_content_shape;

  update public.experiments
  set content = content - 'level'
  where content ? 'level';

  alter table public.experiments
    add constraint experiments_content_shape check (coalesce(
      jsonb_typeof(content) = 'object'
      and content ->> 'id' = id
      and jsonb_typeof(content -> 'title') = 'string'
      and length(btrim(content ->> 'title')) > 0
      and jsonb_typeof(content -> 'goal') = 'string'
      and jsonb_typeof(content -> 'materials') = 'array'
      and jsonb_typeof(content -> 'safety') = 'string'
      and jsonb_typeof(content -> 'steps') = 'array'
      and jsonb_typeof(content -> 'explain') = 'string', false));
end $$;
