-- Everything /zetamath stores: accounts, their sessions, and their runs.
--
-- The site reaches this with Supabase's publishable key, which is public by
-- design (it is in this repo). So this file is the security boundary. The tables
-- are in a schema the API does not serve, and the only way in is the zetamath_*
-- functions at the bottom. Each one assumes its caller is a stranger with curl.

create extension if not exists pgcrypto with schema extensions;

create schema zetamath;

-- ------------------------------------------------------------------- tables

create table zetamath.accounts (
  id uuid primary key default gen_random_uuid(),
  username text not null unique check (username ~ '^[a-z0-9_]{3,20}$'),
  -- bcrypt. No email, so a forgotten password is reset with set_password().
  password_hash text not null,
  -- Whose graphs people see when they are not logged in.
  owner boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index accounts_one_owner on zetamath.accounts (owner) where owner;

-- Apart from accounts, so that deleting one does not make room for another.
create table zetamath.sign_ups (at timestamptz not null default now());
create index sign_ups_at on zetamath.sign_ups (at);

create table zetamath.sessions (
  -- Only a hash, so reading this table does not let anyone log in.
  token_hash bytea primary key,
  account_id uuid not null references zetamath.accounts on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '180 days'
);
create index sessions_account on zetamath.sessions (account_id, created_at);

-- Every password checked lately, right or wrong.
create table zetamath.attempts (
  account_id uuid not null references zetamath.accounts on delete cascade,
  at timestamptz not null default now(),
  ok boolean not null
);
create index attempts_account on zetamath.attempts (account_id, at);

create table zetamath.runs (
  account_id uuid not null references zetamath.accounts on delete cascade,
  id uuid not null,
  -- At the buzzer.
  played_at timestamptz not null
    check (played_at between '2020-01-01T00:00:00Z' and '2100-01-01T00:00:00Z'),
  -- The date and the minutes behind UTC on the clock of whoever played.
  day date not null check (day between '2019-12-31' and '2100-01-02'),
  utc_offset smallint check (utc_offset between -900 and 900),
  score smallint not null check (score between 0 and 5000),
  seconds smallint not null check (seconds between 1 and 3600),
  -- settingsKey() in _lib/problems.ts. Never free text.
  settings text not null check (settings ~
    '^(?=[asmd])a?s?m?d?(\.a\d{1,4}-\d{1,4}\+\d{1,4}-\d{1,4})?(\.m\d{1,4}-\d{1,4}x\d{1,4}-\d{1,4})?\.\d{1,4}s$'),
  -- {"add": [problems solved, total ms], ...}
  ops jsonb not null default '{}' check (ops::text ~
    '^\{("(add|sub|mul|div)": \[\d{1,4}, \d{1,7}\](, )?)*\}$'),
  excluded boolean not null default false,
  -- Typed in from a score sheet, so only the minute is known. If the browser that
  -- played it turns up with the real run, this one is hidden behind it. Not
  -- deleted, or a tab that still shows it could put it back.
  by_hand boolean not null default false,
  replaced_by uuid,
  saved_at timestamptz not null default now(),
  primary key (account_id, id)
);
create index runs_played_at on zetamath.runs (account_id, played_at);
create index runs_saved_at on zetamath.runs (account_id, saved_at);
create index runs_by_hand on zetamath.runs (account_id) where by_hand;

-- Written to every day, because a free project with few requests in a week is
-- paused.
create table zetamath.heartbeat (
  id boolean primary key default true check (id),
  at timestamptz not null
);

-- ------------------------------------------------------------------ helpers

create function zetamath.hash_token(token text) returns bytea
language sql stable set search_path = '' as $$
  select sha256(convert_to(token, 'UTF8'))
$$;

-- bcrypt ignores everything past 72 bytes, so nothing longer is hashed: it comes
-- out null, which accounts.password_hash refuses.
create function zetamath.hash_password(password text) returns text
language sql volatile set search_path = '' as $$
  select case when octet_length(password) <= 72
    then extensions.crypt(password, extensions.gen_salt('bf', 10)) end
$$;

create function zetamath.password_allowed(password text) returns boolean
language sql immutable set search_path = '' as $$
  select coalesce(char_length(password) >= 8 and octet_length(password) <= 72, false)
$$;

create function zetamath.account_for(token text) returns uuid
language sql stable set search_path = '' as $$
  select s.account_id from zetamath.sessions s
  where s.token_hash = zetamath.hash_token(token) and s.expires_at > now()
$$;

create function zetamath.start_session(who uuid) returns text
language plpgsql volatile set search_path = '' as $$
declare
  token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  -- Twenty browsers each, newest kept.
  delete from zetamath.sessions s
  where s.account_id = who
    and (s.expires_at <= now() or s.token_hash in (
      select old.token_hash from zetamath.sessions old
      where old.account_id = who order by old.created_at desc offset 19));
  insert into zetamath.sessions (token_hash, account_id)
  values (zetamath.hash_token(token), who);
  return token;
end $$;

-- 'ok', 'wrong', or 'slow_down' after ten wrong ones in fifteen minutes (or forty
-- of any kind: each one costs a bcrypt). Callers must return normally, because
-- raising would roll back the count.
create function zetamath.check_password(who uuid, guess text) returns text
language plpgsql volatile set search_path = '' as $$
declare
  hash text;
  wrong integer;
  total integer;
begin
  -- One guess at a time, so a burst cannot outrun the count.
  select a.password_hash into hash from zetamath.accounts a where a.id = who
  for no key update;
  if hash is null then
    return 'wrong';
  end if;
  delete from zetamath.attempts t
  where t.account_id = who and t.at < now() - interval '15 minutes';
  select count(*) filter (where not t.ok), count(*) into wrong, total
  from zetamath.attempts t where t.account_id = who;
  if wrong >= 10 or total >= 40 then
    return 'slow_down';
  end if;
  if octet_length(guess) <= 72 and extensions.crypt(guess, hash) = hash then
    delete from zetamath.attempts t where t.account_id = who and not t.ok;
    insert into zetamath.attempts (account_id, ok) values (who, true);
    return 'ok';
  end if;
  insert into zetamath.attempts (account_id, ok) values (who, false);
  return 'wrong';
end $$;

-- In the shape of Run in _lib/runs.ts.
create function zetamath.runs_of(who uuid) returns jsonb
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

create function zetamath.runs_limit() returns bigint
language sql immutable set search_path = '' as $$ select 250::bigint * 1024 * 1024 $$;

-- For the SQL editor: select zetamath.set_password('someone', 'a new password');
create function zetamath.set_password(name text, password text) returns boolean
language plpgsql volatile set search_path = '' as $$
declare
  who uuid;
begin
  update zetamath.accounts a set password_hash = zetamath.hash_password(password)
  where a.username = name returning a.id into who;
  delete from zetamath.sessions s where s.account_id = who;
  delete from zetamath.attempts t where t.account_id = who;
  return who is not null;
end $$;

-- ---------------------------------------------------------- what the API serves

create function public.zetamath_sign_up(p_username text, p_password text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  who uuid;
begin
  if p_username is null or p_username !~ '^[a-z0-9_]{3,20}$' then
    return '{"error": "bad_username"}';
  end if;
  if not zetamath.password_allowed(p_password) then
    return '{"error": "bad_password"}';
  end if;
  -- One sign-up at a time, so the limits hold. They are for the whole site:
  -- someone who uses them up shuts sign-ups until the hour or day is over, and
  -- nothing else.
  perform pg_advisory_xact_lock(20261125);
  if exists (select 1 from zetamath.accounts a where a.username = p_username) then
    return '{"error": "taken"}';
  end if;
  delete from zetamath.sign_ups s where s.at < now() - interval '1 day';
  if (select count(*) from zetamath.sign_ups s where s.at > now() - interval '1 hour') >= 20
    or (select count(*) from zetamath.sign_ups) >= 60
  then
    return '{"error": "busy"}';
  end if;
  insert into zetamath.sign_ups default values;
  insert into zetamath.accounts (username, password_hash)
  values (p_username, zetamath.hash_password(p_password))
  returning id into who;
  return jsonb_build_object(
    'token', zetamath.start_session(who),
    'account', jsonb_build_object('username', p_username, 'owner', false));
end $$;

create function public.zetamath_log_in(p_username text, p_password text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me zetamath.accounts;
  verdict text;
begin
  select a.* into me from zetamath.accounts a where a.username = p_username;
  if me.id is null then
    return '{"error": "wrong"}';
  end if;
  verdict := zetamath.check_password(me.id, p_password);
  if verdict <> 'ok' then
    return jsonb_build_object('error', verdict);
  end if;
  return jsonb_build_object(
    'token', zetamath.start_session(me.id),
    'account', jsonb_build_object('username', me.username, 'owner', me.owner));
end $$;

create function public.zetamath_log_out(p_token text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  delete from zetamath.sessions s where s.token_hash = zetamath.hash_token(p_token);
  return '{"ok": true}';
end $$;

-- Your runs if you are logged in, and the owner's unless that is you.
create function public.zetamath_read(p_token text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me zetamath.accounts;
begin
  select a.* into me from zetamath.accounts a where a.id = zetamath.account_for(p_token);
  return jsonb_build_object(
    'account', case when me.id is null then null
      else jsonb_build_object('username', me.username, 'owner', me.owner) end,
    'runs', case when me.id is null then '[]'::jsonb else zetamath.runs_of(me.id) end,
    'ownerRuns', case when me.owner then '[]'::jsonb
      else zetamath.runs_of((select a.id from zetamath.accounts a where a.owner)) end);
end $$;

-- Add runs to the account p_username, which must be the one logged in: another
-- tab may have switched since these were played. A run already stored keeps its
-- score, and only whether it is left out can change. Returns the ids hidden behind
-- a real run, so the browser can stop showing them.
create function public.zetamath_save(p_token text, p_username text, p_runs jsonb) returns jsonb
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
    (account_id, id, played_at, day, utc_offset, score, seconds, settings, ops, excluded)
  select distinct on (i.id) me.id, i.id, timestamptz 'epoch' + i.at * interval '1 millisecond',
    i.day, i."offset", i.score, i.seconds, i.settings, coalesce(i.ops, '{}'),
    coalesce(i.excluded, false)
  from jsonb_to_recordset(p_runs) as i(
    id uuid, at bigint, day date, "offset" smallint, score smallint,
    seconds smallint, settings text, ops jsonb, excluded boolean)
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

create function public.zetamath_change_password(
  p_token text, p_username text, p_current text, p_next text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me zetamath.accounts;
  verdict text;
begin
  select a.* into me from zetamath.accounts a where a.id = zetamath.account_for(p_token);
  if me.id is null then
    return '{"error": "not_logged_in"}';
  end if;
  if me.username is distinct from p_username then
    return '{"error": "other_account"}';
  end if;
  if not zetamath.password_allowed(p_next) then
    return '{"error": "bad_password"}';
  end if;
  verdict := zetamath.check_password(me.id, p_current);
  if verdict <> 'ok' then
    return jsonb_build_object('error', verdict);
  end if;
  update zetamath.accounts a set password_hash = zetamath.hash_password(p_next) where a.id = me.id;
  -- Log out everywhere else.
  delete from zetamath.sessions s
  where s.account_id = me.id and s.token_hash <> zetamath.hash_token(p_token);
  return '{"ok": true}';
end $$;

create function public.zetamath_delete_account(p_token text, p_username text, p_password text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me zetamath.accounts;
  verdict text;
begin
  select a.* into me from zetamath.accounts a where a.id = zetamath.account_for(p_token);
  if me.id is null then
    return '{"error": "not_logged_in"}';
  end if;
  if me.username is distinct from p_username then
    return '{"error": "other_account"}';
  end if;
  if me.owner then
    return '{"error": "owner"}';
  end if;
  verdict := zetamath.check_password(me.id, p_password);
  if verdict <> 'ok' then
    return jsonb_build_object('error', verdict);
  end if;
  delete from zetamath.accounts a where a.id = me.id;
  return '{"ok": true}';
end $$;

create function public.zetamath_keep_awake() returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
begin
  insert into zetamath.heartbeat (id, at) values (true, now())
  on conflict (id) do update set at = excluded.at;
  return '{"ok": true}';
end $$;

-- ------------------------------------------------------------------ privileges

revoke all on schema zetamath from public, anon, authenticated;
revoke all on all tables in schema zetamath from public, anon, authenticated;
revoke all on all functions in schema zetamath from public, anon, authenticated;

alter table zetamath.accounts enable row level security;
alter table zetamath.sessions enable row level security;
alter table zetamath.sign_ups enable row level security;
alter table zetamath.attempts enable row level security;
alter table zetamath.runs enable row level security;
alter table zetamath.heartbeat enable row level security;

do $$
declare
  f regprocedure;
begin
  for f in
    select p.oid::regprocedure from pg_proc p
    where p.pronamespace = 'public'::regnamespace and p.proname like 'zetamath\_%'
  loop
    execute format('revoke all on function %s from public, authenticated', f);
    execute format('grant execute on function %s to anon', f);
  end loop;
end $$;
