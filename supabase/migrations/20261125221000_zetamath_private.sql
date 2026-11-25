-- Everyone's runs are their own now, the owner's included: nothing is shown to
-- someone who is not logged in.

comment on column zetamath.accounts.owner is
  'Whose site this is: cannot be deleted through the API, and can save when the disk is full.';

create or replace function public.zetamath_read(p_token text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  me zetamath.accounts;
begin
  select a.* into me from zetamath.accounts a where a.id = zetamath.account_for(p_token);
  return jsonb_build_object(
    'account', case when me.id is null then null
      else jsonb_build_object('username', me.username, 'owner', me.owner) end,
    'runs', case when me.id is null then '[]'::jsonb else zetamath.runs_of(me.id) end);
end $$;

-- The owner's account was called "brendan" for a day, and a browser may still hold
-- runs under that name for it. So nobody else gets to have it.
create or replace function public.zetamath_sign_up(p_username text, p_password text) returns jsonb
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
  if p_username = 'brendan'
    or exists (select 1 from zetamath.accounts a where a.username = p_username)
  then
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
