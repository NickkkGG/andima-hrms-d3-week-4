-- Minimal, disposable schema for automatic-logout migration tests.
-- It is deliberately separate from the application schema and never targets
-- a connected Supabase project.

do $$
declare
  trigger_name text;
begin
  foreach trigger_name in array array[
    'graphql_watch_ddl',
    'graphql_watch_drop',
    'issue_graphql_placeholder',
    'issue_pg_cron_access',
    'issue_pg_graphql_access',
    'issue_pg_net_access',
    'pgrst_ddl_watch',
    'pgrst_drop_watch'
  ]
  loop
    if exists (select 1 from pg_event_trigger where evtname = trigger_name) then
      execute format('alter event trigger %I disable', trigger_name);
    end if;
  end loop;
end;
$$;

create extension if not exists pgtap;
create schema if not exists private;

create table public.d3_employee (
  id uuid primary key,
  work_location text
);

create table public.b2_register (
  id uuid primary key,
  auth_user_id uuid not null unique,
  is_active boolean not null default true
);

create table public.d3_b2_employee_sources (
  b2_register_id uuid primary key references public.b2_register(id),
  employee_id uuid not null unique references public.d3_employee(id)
);

insert into public.d3_employee (id, work_location)
values ('00000000-0000-0000-0000-000000000101', 'HQ');

insert into public.b2_register (id, auth_user_id)
values ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001');

insert into public.d3_b2_employee_sources (b2_register_id, employee_id)
values ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000101');
