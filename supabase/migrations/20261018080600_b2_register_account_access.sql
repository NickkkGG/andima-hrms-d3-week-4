-- B2 Register is the single source of truth for every signed-in HRMS account.
-- d3_employee stays only as a compatibility store for existing D3 operational
-- records (attendance, biometrics, tickets, feedback and rewards).

begin;

alter table public.b2_register
  add column if not exists app_role public.d3_app_role not null default 'EMPLOYEE';

-- Preserve any existing explicit role first, then make B2 authoritative.
update public.b2_register registration
set app_role = access.app_role
from public.d3_user_access access
where access.auth_user_id = registration.auth_user_id
  and registration.app_role is distinct from access.app_role;

-- Squad D3 accounts are the HR operators explicitly assigned by the squad.
update public.b2_register
set app_role = 'HR'
where lower(email) in (
  'vincentanuwijaya@andima.co.id',
  'nickne6768@andima.co.id',
  'reynardalbert28@andima.co.id',
  'abby60366@andima.co.id',
  'raymondopurba28@andima.co.id',
  'davacaturangga98@andima.co.id',
  'reginacaelia.18@andima.co.id'
);

create index if not exists b2_register_auth_user_id_idx
  on public.b2_register (auth_user_id)
  where auth_user_id is not null;

-- Create a D3 compatibility row only when an active B2 account has no exact
-- email match. The internal fallback code prevents a duplicate legacy code from
-- turning one person's B2 account into another person's D3 record.
insert into public.d3_employee (
  employee_id,
  full_name,
  email,
  phone,
  position_id,
  department_id,
  join_date,
  employment_status,
  work_location
)
select
  case
    when exists (
      select 1
      from public.d3_employee conflicting_employee
      where conflicting_employee.employee_id = registration.employee_id
    ) then 'B2-' || replace(registration.id::text, '-', '')
    else coalesce(nullif(registration.employee_id, ''), 'B2-' || replace(registration.id::text, '-', ''))
  end,
  coalesce(nullif(registration.full_name, ''), split_part(registration.email, '@', 1)),
  lower(registration.email),
  registration.phone,
  registration.position_id,
  registration.departement_id,
  coalesce(registration.created_at::date, current_date),
  case lower(coalesce(registration.employment_status, ''))
    when 'permanent' then 'PERMANENT'
    when 'permanet' then 'PERMANENT'
    when 'contract' then 'CONTRACT'
    when 'intern' then 'INTERN'
    when 'resigned' then 'RESIGNED'
    when 'terminated' then 'TERMINATED'
    else 'PROBATION'
  end,
  'HQ'
from public.b2_register registration
where registration.is_active = true
  and registration.email is not null
  and registration.position_id is not null
  and registration.departement_id is not null
  and not exists (
    select 1
    from public.d3_employee employee
    where lower(employee.email) = lower(registration.email)
  );

-- Remove only demonstrably incorrect legacy mappings. The old matching rule
-- used employee code OR email, which allowed two different people with a
-- colliding employee code to become the same account identity.
delete from public.d3_user_access access
using public.b2_register registration, public.d3_employee employee
where access.auth_user_id = registration.auth_user_id
  and access.employee_id = employee.id
  and lower(employee.email) <> lower(registration.email);

-- Keep this compatibility map exact-email only. It is not an authentication
-- source; B2 is. It supports legacy foreign keys until those tables are moved.
insert into public.d3_user_access (auth_user_id, employee_id, app_role)
select registration.auth_user_id, employee.id, registration.app_role
from public.b2_register registration
join public.d3_employee employee
  on lower(employee.email) = lower(registration.email)
where registration.is_active = true
  and registration.auth_user_id is not null
on conflict (auth_user_id) do update
set employee_id = excluded.employee_id,
    app_role = excluded.app_role,
    updated_at = now();

create or replace function public.d3_current_legacy_employee_uuid()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select employee.id
  from public.b2_register registration
  join public.d3_employee employee
    on lower(employee.email) = lower(registration.email)
  where registration.auth_user_id = auth.uid()
    and registration.is_active = true
  limit 1
$$;

create or replace function public.d3_current_employee_uuid()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.d3_current_legacy_employee_uuid()
$$;

create or replace function public.d3_current_b2_employee_context()
returns table (
  employee_uuid uuid,
  employee_code character varying,
  full_name character varying,
  email character varying
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    employee.id,
    registration.employee_id,
    registration.full_name,
    registration.email
  from public.b2_register registration
  join public.d3_employee employee
    on lower(employee.email) = lower(registration.email)
  where registration.auth_user_id = auth.uid()
    and registration.is_active = true
  limit 1
$$;

revoke all on function public.d3_current_legacy_employee_uuid() from public, anon;
grant execute on function public.d3_current_legacy_employee_uuid() to authenticated;
revoke all on function public.d3_current_employee_uuid() from public, anon;
grant execute on function public.d3_current_employee_uuid() to authenticated;
revoke all on function public.d3_current_b2_employee_context() from public, anon;
grant execute on function public.d3_current_b2_employee_context() to authenticated;

commit;
