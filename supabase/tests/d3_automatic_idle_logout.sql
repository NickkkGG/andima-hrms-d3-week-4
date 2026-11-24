begin;

select plan(17);

select set_config(
  'request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated","session_id":"00000000-0000-0000-0000-000000000301"}',
  false
);

select set_config(
  'request.jwt.claim.sub',
  '00000000-0000-0000-0000-000000000001',
  false
);

select is(
  (select status from public.d3_get_idle_session_status()),
  'MISSING_SESSION',
  'an authenticated profile has no active idle state before session start'
);

select is(
  (select status from public.d3_start_idle_session()),
  'ACTIVE',
  'start creates an active idle session'
);

select is(
  (select time_zone from public.d3_get_idle_session_status()),
  'Asia/Jakarta',
  'HQ is configured as WIB/Asia Jakarta'
);

select is(
  (select idle_timeout_seconds from public.d3_get_idle_session_status()),
  1800,
  'the configured idle timeout is 30 minutes'
);

select is(
  (select warning_seconds from public.d3_get_idle_session_status()),
  60,
  'the configured warning is 60 seconds'
);

select is(
  (select count(*)::integer from private.d3_idle_sessions),
  1,
  'repeated session state is stored once per Supabase session ID'
);

select is(
  (select status from public.d3_start_idle_session()),
  'ACTIVE',
  'restarting the same login session remains active'
);

select is(
  (select count(*)::integer from private.d3_idle_sessions),
  1,
  'restarting does not duplicate session rows'
);

select lives_ok(
  $$select * from public.d3_touch_idle_session()$$,
  'user activity safely extends an active session'
);

update private.d3_idle_sessions
set started_at = clock_timestamp() - interval '3 seconds',
    last_activity_at = clock_timestamp() - interval '2 seconds',
    expires_at = clock_timestamp() - interval '1 second';

select is(
  (select status from public.d3_get_idle_session_status()),
  'EXPIRED',
  'an expired idle state is reported as expired'
);

select is(
  (select status from public.d3_touch_idle_session()),
  'EXPIRED',
  'activity after expiry cannot reactivate a session'
);

update public.d3_employee
set work_location = 'BRANCH-MAKASSAR';
insert into private.d3_work_location_timezones (work_location, time_zone)
values ('BRANCH-MAKASSAR', 'Asia/Makassar');

select is(
  (select time_zone from public.d3_start_idle_session()),
  'Asia/Makassar',
  'a configured WITA location is used for the session'
);

update public.d3_employee
set work_location = 'BRANCH-JAYAPURA';
insert into private.d3_work_location_timezones (work_location, time_zone)
values ('BRANCH-JAYAPURA', 'Asia/Jayapura');

select is(
  (select time_zone from public.d3_start_idle_session()),
  'Asia/Jayapura',
  'a configured WIT location is used for the session'
);

update public.d3_employee
set work_location = 'UNMAPPED-LOCATION';

select is(
  (select status from public.d3_get_idle_session_status()),
  'LOCATION_UNMAPPED',
  'a location with no active mapping is rejected at status check'
);

select throws_ok(
  $$select * from public.d3_start_idle_session()$$,
  'P0001',
  'Work location is not configured for automatic logout. Contact HR.',
  'a location with no active mapping cannot start a session'
);

select ok(
  not has_function_privilege('anon', 'public.d3_start_idle_session()', 'execute'),
  'anon cannot start automatic logout sessions'
);

select ok(
  not has_table_privilege('authenticated', 'private.d3_idle_sessions', 'select'),
  'authenticated users cannot read private idle-session state directly'
);

select * from finish();
rollback;
