-- B2 Register is the source of truth for authenticated account identity.
-- D3 remains the storage owner for attendance and biometric evidence.

insert into public.d3_employee (
  employee_id,
  full_name,
  email,
  phone,
  position_id,
  department_id,
  employment_status,
  join_date,
  work_location
)
select
  b2.employee_id,
  b2.full_name,
  b2.email,
  nullif(b2.phone, ''),
  b2.position_id,
  b2.departement_id,
  upper(b2.employment_status),
  b2.created_at::date,
  'HQ'
from public.b2_register b2
where b2.is_active = true
  and b2.employee_id is not null
  and b2.full_name is not null
  and b2.email is not null
  and b2.position_id is not null
  and b2.departement_id is not null
  and not exists (
    select 1
    from public.d3_employee employee
    where employee.employee_id = b2.employee_id
       or lower(employee.email) = lower(b2.email)
  );

create or replace function public.d3_current_employee_uuid()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    (
      select employee.id
      from public.b2_register b2
      join public.d3_employee employee
        on employee.employee_id = b2.employee_id
        or lower(employee.email) = lower(b2.email)
      where b2.id = auth.uid()
        and b2.is_active = true
      limit 1
    ),
    (
      select access.employee_id
      from public.d3_user_access access
      where access.auth_user_id = auth.uid()
      limit 1
    )
  );
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
    employee.employee_id,
    employee.full_name,
    employee.email
  from public.b2_register b2
  join public.d3_employee employee
    on employee.employee_id = b2.employee_id
    or lower(employee.email) = lower(b2.email)
  where b2.id = auth.uid()
    and b2.is_active = true
  limit 1;
$$;

revoke all on function public.d3_current_b2_employee_context() from public, anon;
grant execute on function public.d3_current_b2_employee_context() to authenticated;

drop policy if exists "D3 users insert only their mapped biometric event" on public.d3_face_biometric_events;
create policy "D3 users insert biometric events from B2 identity"
  on public.d3_face_biometric_events
  for insert
  to authenticated
  with check (
    auth_user_id = auth.uid()
    and employee_id = public.d3_current_employee_uuid()
  );

drop policy if exists "D3 users enroll only their mapped biometric template" on public.d3_face_biometric_templates;
create policy "D3 users enroll biometric templates from B2 identity"
  on public.d3_face_biometric_templates
  for insert
  to authenticated
  with check (
    auth_user_id = auth.uid()
    and employee_id = public.d3_current_employee_uuid()
  );

drop policy if exists "D3 users update only their mapped biometric template" on public.d3_face_biometric_templates;
create policy "D3 users update biometric templates from B2 identity"
  on public.d3_face_biometric_templates
  for update
  to authenticated
  using (auth_user_id = auth.uid())
  with check (
    auth_user_id = auth.uid()
    and employee_id = public.d3_current_employee_uuid()
  );
