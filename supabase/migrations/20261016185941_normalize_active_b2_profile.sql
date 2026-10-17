-- Normalize the remaining active B2 profile that still references the
-- retired General Director position, then make its D3 mirror and access
-- compatibility mapping. The user remains sourced from b2_register.

update public.b2_register b2
set
  departement_id = official_department.id,
  position_id = official_position.id
from public.d3_departments legacy_department
join public.d3_positions legacy_position
  on legacy_position.department_id = legacy_department.id
cross join public.d3_departments official_department
join public.d3_positions official_position
  on official_position.department_id = official_department.id
where b2.is_active = true
  and b2.departement_id = legacy_department.id
  and b2.position_id = legacy_position.id
  and legacy_department.name = 'Finance, Accounting & Tax'
  and legacy_position.title = 'General Director / Director Umum'
  and official_department.name = 'Finance, Accounting & Tax'
  and official_position.title = 'Director of Finance, Accounting & Digital Transformation';

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

with active_b2_accounts as (
  select
    b2.id as auth_user_id,
    employee.id as employee_id,
    case
      when lower(b2.email) in (
        'vincentanuwijaya@andima.co.id',
        'nickne6768@andima.co.id',
        'reynardalbert28@andima.co.id',
        'abby60366@andima.co.id',
        'raymondopurba28@andima.co.id',
        'davacaturangga98@andima.co.id',
        'reginacaelia.18@andima.co.id'
      ) then 'HR'
      else 'EMPLOYEE'
    end::public.d3_app_role as app_role
  from public.b2_register b2
  join public.d3_employee employee
    on employee.employee_id = b2.employee_id
    or lower(employee.email) = lower(b2.email)
  where b2.is_active = true
)
insert into public.d3_user_access (auth_user_id, employee_id, app_role)
select auth_user_id, employee_id, app_role
from active_b2_accounts
on conflict (auth_user_id) do update
set
  employee_id = excluded.employee_id,
  app_role = excluded.app_role;
