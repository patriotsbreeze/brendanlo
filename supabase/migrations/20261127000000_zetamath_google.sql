-- Log in with Google, as well as with a username and password.
--
-- Anyone can call what anon can, so a function that took "this is Google user X"
-- on trust would let anyone log in as anyone. The ones here that take a Google
-- id are for service_role alone: the site's server checks Google's signature on
-- the ID token first, then calls them with Supabase's secret key, which never
-- leaves it. Every other function stays as it was, for anon.
--
-- Only a hash of Google's id for the person (the token's "sub") is kept. No
-- email, no name, as before.

alter table zetamath.accounts
  add column google_hash bytea unique check (octet_length(google_hash) = 32),
  -- An account made with Google has no password, until set_password() gives it one.
  alter column password_hash drop not null,
  add constraint accounts_a_way_in check (password_hash is not null or google_hash is not null);

comment on column zetamath.accounts.google_hash is
  'sha256 of the Google account''s "sub", which can log in to this one. Only service_role can set it.';

-- ------------------------------------------------------------------ helpers

-- The account as the browser sees it: Account in _lib/accounts.ts.
create function zetamath.account_json(me zetamath.accounts) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'username', me.username,
    'owner', me.owner,
    'password', me.password_hash is not null,
    'google', me.google_hash is not null)
$$;

-- Whether a new account can be called p_username, and if so, count the sign-up.
-- The limits are for the whole site, Google's sign-ups and the others together.
-- The lock lasts to the end of the transaction, so the caller makes the account
-- before anyone else can look. Null for yes, or the error.
create function zetamath.claim_username(p_username text) returns text
language plpgsql volatile set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(20261125);
  -- The owner's first name: see 20261125221000_zetamath_private.sql.
  if p_username = 'brendan'
    or exists (select 1 from zetamath.accounts a where a.username = p_username)
  then
    return 'taken';
  end if;
  delete from zetamath.sign_ups s where s.at < now() - interval '1 day';
  if (select count(*) from zetamath.sign_ups s where s.at > now() - interval '1 hour') >= 20
    or (select count(*) from zetamath.sign_ups) >= 60
  then
    return 'busy';
  end if;
  insert into zetamath.sign_ups default values;
  return null;
end $$;

create function zetamath.google_allowed(google text) returns boolean
language sql immutable set search_path = '' as $$
  -- What Google promises a "sub" is: at most 255 ASCII characters.
  select coalesce(google ~ '^[!-~]{1,255}$', false)
$$;

-- A password can no longer be refused by the column, which an account made with
-- Google leaves empty, so a long one is refused here: bcrypt would ignore its end.
create or replace function zetamath.set_password(name text, password text) returns boolean
language plpgsql volatile set search_path = '' as $$
declare
  who uuid;
begin
  if password is null or octet_length(password) > 72 then
    raise exception 'a password is at most 72 bytes';
  end if;
  update zetamath.accounts a set password_hash = zetamath.hash_password(password)
  where a.username = name returning a.id into who;
  delete from zetamath.sessions s where s.account_id = who;
  delete from zetamath.attempts t where t.account_id = who;
  return who is not null;
end $$;

-- ---------------------------------------------------------- what the API serves

-- As before, but the limits are in claim_username(), shared with Google's.
create or replace function public.zetamath_sign_up(p_username text, p_password text) returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  who uuid;
  refusal text;
begin
  if p_username is null or p_username !~ '^[a-z0-9_]{3,20}$' then
    return '{"error": "bad_username"}';
  end if;
  if not zetamath.password_allowed(p_password) then
    return '{"error": "bad_password"}';
  end if;
  refusal := zetamath.claim_username(p_username);
  if refusal is not null then
    return jsonb_build_object('error', refusal);
  end if;
  insert into zetamath.accounts (username, password_hash)
  values (p_username, zetamath.hash_password(p_password))
  returning id into who;
  return jsonb_build_object(
    'token', zetamath.start_session(who),
    'account', jsonb_build_object('username', p_username, 'owner', false));
end $$;

-- As before, and the account says whether it has a password and a Google account,
-- for the account tab.
create or replace function public.zetamath_read(p_token text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me zetamath.accounts;
begin
  select a.* into me from zetamath.accounts a where a.id = zetamath.account_for(p_token);
  return jsonb_build_object(
    'account', case when me.id is null then null else zetamath.account_json(me) end,
    'runs', case when me.id is null then '[]'::jsonb else zetamath.runs_of(me.id) end);
end $$;

-- Log in as whoever has linked the Google account p_google (a checked ID token's
-- "sub"). If nobody has, make an account called p_username for it, or, with no
-- p_username, answer {"account": null} so the browser can ask for one.
create function public.zetamath_google_enter(p_google text, p_username text default null)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me zetamath.accounts;
  refusal text;
begin
  if not zetamath.google_allowed(p_google) then
    return '{"error": "bad_google"}';
  end if;
  select a.* into me from zetamath.accounts a where a.google_hash = zetamath.hash_token(p_google);
  if me.id is null and p_username is not null then
    if p_username !~ '^[a-z0-9_]{3,20}$' then
      return '{"error": "bad_username"}';
    end if;
    -- The sign-ups' lock, then look again: the same person may be signing up in
    -- two tabs at once.
    perform pg_advisory_xact_lock(20261125);
    select a.* into me from zetamath.accounts a where a.google_hash = zetamath.hash_token(p_google);
    if me.id is null then
      refusal := zetamath.claim_username(p_username);
      if refusal is not null then
        return jsonb_build_object('error', refusal);
      end if;
      insert into zetamath.accounts (username, google_hash)
      values (p_username, zetamath.hash_token(p_google))
      returning * into me;
    end if;
  end if;
  if me.id is null then
    return '{"account": null}';
  end if;
  return jsonb_build_object(
    'token', zetamath.start_session(me.id),
    'account', zetamath.account_json(me));
end $$;

-- Let the Google account p_google log in to the account logged in, which must be
-- p_username, once its password is given. One Google account per account, and
-- one account per Google account.
create function public.zetamath_google_link(
  p_token text, p_username text, p_password text, p_google text) returns jsonb
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
  if not zetamath.google_allowed(p_google) then
    return '{"error": "bad_google"}';
  end if;
  if me.google_hash is not null then
    return '{"error": "linked"}';
  end if;
  verdict := zetamath.check_password(me.id, p_password);
  if verdict <> 'ok' then
    return jsonb_build_object('error', verdict);
  end if;
  -- So that two links of one Google account cannot both find it free.
  perform pg_advisory_xact_lock(20261125);
  if exists (select 1 from zetamath.accounts a where a.google_hash = zetamath.hash_token(p_google)) then
    return '{"error": "google_taken"}';
  end if;
  -- Only if still unlinked: another tab may have linked one since `me` was read.
  update zetamath.accounts a set google_hash = zetamath.hash_token(p_google)
  where a.id = me.id and a.google_hash is null returning * into me;
  if not found then
    return '{"error": "linked"}';
  end if;
  return jsonb_build_object('account', zetamath.account_json(me));
end $$;

-- Stop the linked Google account logging in, given the password. Not for an
-- account with no password, which would be left with no way in. Logs out every
-- other browser, since any of them may have come in through Google. Needs no
-- Google token, so it is anon's, like changing the password.
create function public.zetamath_google_unlink(p_token text, p_username text, p_password text)
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
  if me.password_hash is null then
    return '{"error": "no_password"}';
  end if;
  verdict := zetamath.check_password(me.id, p_password);
  if verdict <> 'ok' then
    return jsonb_build_object('error', verdict);
  end if;
  update zetamath.accounts a set google_hash = null where a.id = me.id returning * into me;
  delete from zetamath.sessions s
  where s.account_id = me.id and s.token_hash <> zetamath.hash_token(p_token);
  return jsonb_build_object('account', zetamath.account_json(me));
end $$;

-- Delete the account logged in, as delete_account() does, with the Google account
-- linked to it in place of the password, for an account made with Google, which
-- has none. One with a password is deleted with that: logging in with Google is
-- not enough to delete it, as it is not enough to unlink Google.
create function public.zetamath_google_delete(p_token text, p_username text, p_google text)
returns jsonb
language plpgsql volatile security definer set search_path = '' as $$
declare
  me zetamath.accounts;
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
  if me.password_hash is not null then
    return '{"error": "has_password"}';
  end if;
  if me.google_hash is distinct from zetamath.hash_token(p_google) then
    return '{"error": "other_google"}';
  end if;
  delete from zetamath.accounts a where a.id = me.id;
  return '{"ok": true}';
end $$;

-- ------------------------------------------------------------------ privileges

revoke all on function zetamath.account_json(zetamath.accounts) from public, anon, authenticated;
revoke all on function zetamath.claim_username(text) from public, anon, authenticated;
revoke all on function zetamath.google_allowed(text) from public, anon, authenticated;

-- Each of these believes p_google, so only the server may call them.
revoke all on function public.zetamath_google_enter(text, text) from public, anon, authenticated;
revoke all on function public.zetamath_google_link(text, text, text, text) from public, anon, authenticated;
revoke all on function public.zetamath_google_delete(text, text, text) from public, anon, authenticated;
grant execute on function public.zetamath_google_enter(text, text) to service_role;
grant execute on function public.zetamath_google_link(text, text, text, text) to service_role;
grant execute on function public.zetamath_google_delete(text, text, text) to service_role;

revoke all on function public.zetamath_google_unlink(text, text, text) from public, authenticated;
grant execute on function public.zetamath_google_unlink(text, text, text) to anon;
