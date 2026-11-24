-- D3 Automatic Logout
--
-- The policy is intentionally stored outside the exposed API schema. The
-- browser only reaches it through narrowly scoped RPCs bound to the signed
-- Supabase session ID, never through a client-supplied employee or timezone.

begin;

create schema if not exists private;

create table if not exists private.d3_idle_logout_policy (
  policy_key text primary key default 'default' check (policy_key = 'default'),
  idle_timeout_seconds integer not null check (idle_timeout_seconds between 60 and 86400),
  warning_seconds integer not null check (warning_seconds between 1 and 3600),
  check (warning_seconds < idle_timeout_seconds)
);

insert into private.d3_idle_logout_policy (
  policy_key,
  idle_timeout_seconds,
  warning_seconds
)
values ('default', 1800, 60)
on conflict (policy_key) do nothing;

create table if not exists private.d3_work_location_timezones (
  work_location text primary key,
  time_zone text not null check (time_zone in ('Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (work_location = pg_catalog.upper(pg_catalog.btrim(work_location))),
  check (char_length(work_location) > 0)
);

-- Initial rollout: all current employee mirrors are seeded with HQ. Future
-- WIB/WITA/WIT locations are added through an approved migration/config change.
insert into private.d3_work_location_timezones (work_location, time_zone)
values ('HQ', 'Asia/Jakarta')
on conflict (work_location) do nothing;

create table if not exists private.d3_idle_sessions (
  session_id uuid primary key,
  auth_user_id uuid not null,
  b2_register_id uuid not null,
  employee_id uuid not null references public.d3_employee(id) on delete restrict,
  work_location text not null,
  time_zone text not null,
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check (expires_at > started_at)
);

create index if not exists d3_idle_sessions_expires_at_idx
  on private.d3_idle_sessions (expires_at);

create index if not exists d3_idle_sessions_auth_user_id_idx
  on private.d3_idle_sessions (auth_user_id, expires_at);

-- The tables are implementation state, not application data. RLS and explicit
-- privilege revocation provide defense in depth even though private is not a
-- Data API schema.
alter table private.d3_idle_logout_policy enable row level security;
alter table private.d3_work_location_timezones enable row level security;
alter table private.d3_idle_sessions enable row level security;

revoke all on table private.d3_idle_logout_policy from public, anon, authenticated;
revoke all on table private.d3_work_location_timezones from public, anon, authenticated;
revoke all on table private.d3_idle_sessions from public, anon, authenticated;

-- Resolves the current account from trusted database relations. A missing
-- timezone is represented as NULL so the public status function can terminate
-- an already-open session if HR later disables/removes its mapping.
create or replace function private.d3_current_idle_logout_profile()
returns table (
  b2_register_id uuid,
  employee_id uuid,
  work_location text,
  time_zone text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    registration.id,
    source.employee_id,
    pg_catalog.upper(pg_catalog.btrim(employee.work_location)),
    timezone.time_zone
  from public.b2_register as registration
  join public.d3_b2_employee_sources as source
    on source.b2_register_id = registration.id
  join public.d3_employee as employee
    on employee.id = source.employee_id
  left join private.d3_work_location_timezones as timezone
    on timezone.work_location = pg_catalog.upper(pg_catalog.btrim(employee.work_location))
    and timezone.is_active is true
  where registration.auth_user_id = auth.uid()
    and registration.is_active is true
  limit 1;
$function$;

create or replace function public.d3_get_idle_session_status()
returns table (
  status text,
  expires_at timestamptz,
  time_zone text,
  work_location text,
  idle_timeout_seconds integer,
  warning_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_b2_register_id uuid;
  v_employee_id uuid;
  v_work_location text;
  v_time_zone text;
  v_expires_at timestamptz;
  v_idle_timeout_seconds integer;
  v_warning_seconds integer;
begin
  if v_user_id is null then
    raise exception 'Authenticated user is required' using errcode = '42501';
  end if;

  v_session_id := nullif(
    coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb ->> 'session_id',
    ''
  )::uuid;
  if v_session_id is null then
    raise exception 'A valid Supabase session is required' using errcode = '42501';
  end if;

  select policy.idle_timeout_seconds, policy.warning_seconds
    into v_idle_timeout_seconds, v_warning_seconds
  from private.d3_idle_logout_policy as policy
  where policy.policy_key = 'default';

  if not found then
    raise exception 'Automatic logout policy is not configured' using errcode = 'P0001';
  end if;

  select profile.b2_register_id, profile.employee_id, profile.work_location, profile.time_zone
    into v_b2_register_id, v_employee_id, v_work_location, v_time_zone
  from private.d3_current_idle_logout_profile() as profile;

  if not found then
    return query
    select
      'PROFILE_UNAVAILABLE'::text,
      null::timestamptz,
      null::text,
      null::text,
      v_idle_timeout_seconds,
      v_warning_seconds;
    return;
  end if;

  if v_time_zone is null then
    return query
    select
      'LOCATION_UNMAPPED'::text,
      null::timestamptz,
      null::text,
      v_work_location,
      v_idle_timeout_seconds,
      v_warning_seconds;
    return;
  end if;

  select session.expires_at
    into v_expires_at
  from private.d3_idle_sessions as session
  where session.session_id = v_session_id
    and session.auth_user_id = v_user_id
    and session.b2_register_id = v_b2_register_id
    and session.employee_id = v_employee_id;

  if not found then
    return query
    select
      'MISSING_SESSION'::text,
      null::timestamptz,
      v_time_zone,
      v_work_location,
      v_idle_timeout_seconds,
      v_warning_seconds;
    return;
  end if;

  if v_expires_at <= v_now then
    return query
    select
      'EXPIRED'::text,
      v_expires_at,
      v_time_zone,
      v_work_location,
      v_idle_timeout_seconds,
      v_warning_seconds;
    return;
  end if;

  return query
  select
    'ACTIVE'::text,
    v_expires_at,
    v_time_zone,
    v_work_location,
    v_idle_timeout_seconds,
    v_warning_seconds;
end;
$function$;

create or replace function public.d3_start_idle_session()
returns table (
  status text,
  expires_at timestamptz,
  time_zone text,
  work_location text,
  idle_timeout_seconds integer,
  warning_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_b2_register_id uuid;
  v_employee_id uuid;
  v_work_location text;
  v_time_zone text;
  v_idle_timeout_seconds integer;
  v_warning_seconds integer;
begin
  if v_user_id is null then
    raise exception 'Authenticated user is required' using errcode = '42501';
  end if;

  v_session_id := nullif(
    coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb ->> 'session_id',
    ''
  )::uuid;
  if v_session_id is null then
    raise exception 'A valid Supabase session is required' using errcode = '42501';
  end if;

  select policy.idle_timeout_seconds, policy.warning_seconds
    into v_idle_timeout_seconds, v_warning_seconds
  from private.d3_idle_logout_policy as policy
  where policy.policy_key = 'default';

  if not found then
    raise exception 'Automatic logout policy is not configured' using errcode = 'P0001';
  end if;

  select profile.b2_register_id, profile.employee_id, profile.work_location, profile.time_zone
    into v_b2_register_id, v_employee_id, v_work_location, v_time_zone
  from private.d3_current_idle_logout_profile() as profile;

  if not found then
    raise exception 'Employee profile is not linked to an active D3 employee' using errcode = 'P0001';
  end if;

  if v_time_zone is null then
    raise exception 'Work location is not configured for automatic logout. Contact HR.' using errcode = 'P0001';
  end if;

  -- Expired rows are not audit records. Remove only stale state, retaining
  -- active sessions from other browsers/devices.
  delete from private.d3_idle_sessions as idle_session
  where idle_session.expires_at < v_now - interval '1 day';

  insert into private.d3_idle_sessions (
    session_id,
    auth_user_id,
    b2_register_id,
    employee_id,
    work_location,
    time_zone,
    started_at,
    last_activity_at,
    expires_at
  ) values (
    v_session_id,
    v_user_id,
    v_b2_register_id,
    v_employee_id,
    v_work_location,
    v_time_zone,
    v_now,
    v_now,
    v_now + v_idle_timeout_seconds * interval '1 second'
  )
  on conflict (session_id) do update
  set auth_user_id = excluded.auth_user_id,
      b2_register_id = excluded.b2_register_id,
      employee_id = excluded.employee_id,
      work_location = excluded.work_location,
      time_zone = excluded.time_zone,
      started_at = excluded.started_at,
      last_activity_at = excluded.last_activity_at,
      expires_at = excluded.expires_at;

  return query select * from public.d3_get_idle_session_status();
end;
$function$;

create or replace function public.d3_touch_idle_session()
returns table (
  status text,
  expires_at timestamptz,
  time_zone text,
  work_location text,
  idle_timeout_seconds integer,
  warning_seconds integer
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid;
  v_now timestamptz := pg_catalog.clock_timestamp();
  v_b2_register_id uuid;
  v_employee_id uuid;
  v_work_location text;
  v_time_zone text;
  v_idle_timeout_seconds integer;
  v_current_status text;
begin
  if v_user_id is null then
    raise exception 'Authenticated user is required' using errcode = '42501';
  end if;

  v_session_id := nullif(
    coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb ->> 'session_id',
    ''
  )::uuid;
  if v_session_id is null then
    raise exception 'A valid Supabase session is required' using errcode = '42501';
  end if;

  select current_status.status
    into v_current_status
  from public.d3_get_idle_session_status() as current_status;

  if v_current_status is distinct from 'ACTIVE' then
    return query select * from public.d3_get_idle_session_status();
    return;
  end if;

  select policy.idle_timeout_seconds
    into v_idle_timeout_seconds
  from private.d3_idle_logout_policy as policy
  where policy.policy_key = 'default';

  select profile.b2_register_id, profile.employee_id, profile.work_location, profile.time_zone
    into v_b2_register_id, v_employee_id, v_work_location, v_time_zone
  from private.d3_current_idle_logout_profile() as profile;

  update private.d3_idle_sessions as session
  set b2_register_id = v_b2_register_id,
      employee_id = v_employee_id,
      work_location = v_work_location,
      time_zone = v_time_zone,
      last_activity_at = v_now,
      expires_at = v_now + v_idle_timeout_seconds * interval '1 second'
  where session.session_id = v_session_id
    and session.auth_user_id = v_user_id
    and session.expires_at > v_now;

  return query select * from public.d3_get_idle_session_status();
end;
$function$;

revoke all on function private.d3_current_idle_logout_profile() from public, anon, authenticated;
revoke all on function public.d3_get_idle_session_status() from public, anon;
revoke all on function public.d3_start_idle_session() from public, anon;
revoke all on function public.d3_touch_idle_session() from public, anon;

grant execute on function public.d3_get_idle_session_status() to authenticated;
grant execute on function public.d3_start_idle_session() to authenticated;
grant execute on function public.d3_touch_idle_session() to authenticated;

commit;
