-- Every answer of a run, so the stats tab can say which problems are slow. Only
-- runs played from now on have them; older ones keep just their totals per
-- operation.
--
-- [[operation, a, b, ms, misses], ...], as Answer in _lib/runs.ts. The shape is
-- all this can check. Whether each one is a problem the game could ask is
-- checked by parseRun(), on the way in through the site and on the way out to
-- the browser, so a run written some other way only hides itself.

alter table zetamath.runs add column answers jsonb
  check (case when jsonb_typeof(answers) = 'array'
    then jsonb_array_length(answers) = score
      and answers::text ~ '^\[(\[[0-3], \d{1,8}, \d{1,4}, \d{1,7}, \d{1,2}\](, )?)*\]$'
    else answers is null end);

comment on column zetamath.runs.answers is
  'Each answer as [operation, a, b, ms, misses]: one per point scored, written once like the score.';

-- In the shape of Run in _lib/runs.ts.
create or replace function zetamath.runs_of(who uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
    'id', r.id,
    'at', round(extract(epoch from r.played_at) * 1000)::bigint,
    'day', to_char(r.day, 'YYYY-MM-DD'),
    'offset', r.utc_offset,
    'score', r.score,
    'seconds', r.seconds,
    'settings', r.settings,
    'ops', r.ops,
    'answers', r.answers,
    'excluded', r.excluded
  )) order by r.played_at, r.id), '[]'::jsonb)
  from zetamath.runs r where r.account_id = who and r.replaced_by is null
$$;

-- As before, plus the answers. A run already stored keeps them, as it keeps its
-- score: only whether it is left out can change.
create or replace function public.zetamath_save(p_token text, p_username text, p_runs jsonb)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me zetamath.accounts;
  fresh integer;
  left_out uuid[];
  replaced jsonb;
begin
  select a.* into me from zetamath.accounts a where a.id = zetamath.account_for(p_token);
  if me.id is null then
    return '{"error": "not_logged_in"}';
  end if;
  if me.username is distinct from p_username then
    return '{"error": "other_account"}';
  end if;
  if jsonb_typeof(p_runs) is distinct from 'array' then
    return '{"error": "bad_runs"}';
  end if;
  if jsonb_array_length(p_runs) > 200 then
    return '{"error": "bad_runs"}';
  end if;

  select count(distinct i.id) into fresh
  from jsonb_to_recordset(p_runs) as i(id uuid)
  where not exists (
    select 1 from zetamath.runs r where r.account_id = me.id and r.id = i.id);
  if fresh > 0 then
    -- Half the free plan's disk, for everyone together, so that strangers cannot
    -- fill it. The owner can always save.
    if not me.owner and pg_total_relation_size('zetamath.runs') > zetamath.runs_limit() then
      return '{"error": "slow_down"}';
    end if;
    if (select count(*) from zetamath.runs r where r.account_id = me.id) + fresh > 20000 then
      return '{"error": "full"}';
    end if;
    if (select count(*) from zetamath.runs r
        where r.account_id = me.id and r.saved_at > now() - interval '1 day') + fresh > 1000 then
      return '{"error": "slow_down"}';
    end if;
  end if;

  -- As it was before these runs: see below.
  left_out := array(
    select h.id from zetamath.runs h
    where h.account_id = me.id and h.by_hand and h.replaced_by is null and h.excluded);

  insert into zetamath.runs as r
    (account_id, id, played_at, day, utc_offset, score, seconds, settings, ops, answers, excluded)
  select distinct on (i.id) me.id, i.id, timestamptz 'epoch' + i.at * interval '1 millisecond',
    i.day, i."offset", i.score, i.seconds, i.settings, coalesce(i.ops, '{}'), i.answers,
    coalesce(i.excluded, false)
  from jsonb_to_recordset(p_runs) as i(
    id uuid, at bigint, day date, "offset" smallint, score smallint,
    seconds smallint, settings text, ops jsonb, answers jsonb, excluded boolean)
  order by i.id
  on conflict (account_id, id) do update set excluded = excluded.excluded
    where r.excluded <> excluded.excluded;

  -- Hide what was typed in by hand behind the real run, and leave the real one out
  -- too if that had been left out. (Not if it was left out along with these: that
  -- is someone who can see both, dropping the extra.)
  with found as (
    update zetamath.runs h set replaced_by = real.id
    from zetamath.runs real
    where h.account_id = me.id and h.by_hand and h.replaced_by is null
      and real.account_id = me.id and not real.by_hand
      and real.score = h.score and real.seconds = h.seconds
      and real.played_at >= h.played_at
      and real.played_at < h.played_at + interval '1 minute'
    returning real.id, h.id as typed
  )
  update zetamath.runs r set excluded = true from found f
  where r.account_id = me.id and r.id = f.id and f.typed = any (left_out);

  select coalesce(jsonb_agg(h.id), '[]'::jsonb) into replaced
  from zetamath.runs h where h.account_id = me.id and h.by_hand and h.replaced_by is not null;
  return jsonb_build_object('replaced', replaced);
end $$;
