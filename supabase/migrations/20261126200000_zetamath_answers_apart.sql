-- Answers make a run some six times bigger, and only the stats tab uses them, so
-- they no longer come with every run on every page. The stats tab asks for the
-- days it shows.

-- In the shape of Run in _lib/runs.ts, without its answers.
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
    'excluded', r.excluded
  )) order by r.played_at, r.id), '[]'::jsonb)
  from zetamath.runs r where r.account_id = who and r.replaced_by is null
$$;

-- {run id: answers} for every run of yours played from p_from to p_to, both
-- included, by the day on the clock of whoever played, as runs_of() gives it.
-- A run from before answers were kept is there too, as null, so the browser can
-- tell it from one this has not seen. Whether each answer is a problem the game
-- could ask is checked in the browser, as parseRun() checks runs.
create function public.zetamath_answers(p_token text, p_from date, p_to date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me uuid := zetamath.account_for(p_token);
begin
  if me is null then
    return '{"error": "not_logged_in"}';
  end if;
  if p_from is null or p_to is null or p_from > p_to then
    return '{"error": "bad_range"}';
  end if;
  return coalesce((
    select jsonb_object_agg(r.id::text, r.answers) from zetamath.runs r
    where r.account_id = me and r.replaced_by is null and r.day between p_from and p_to
  ), '{}'::jsonb);
end $$;

-- So a day's answers are found without reading every run of the account.
create index runs_day on zetamath.runs (account_id, day);

revoke all on function public.zetamath_answers(text, date, date) from public, authenticated;
grant execute on function public.zetamath_answers(text, date, date) to anon;
