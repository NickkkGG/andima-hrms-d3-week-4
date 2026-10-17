-- Keep the seven squad accounts identical to the agreed HR profile.
-- b2_register remains authoritative; D3 employee rows only mirror it for
-- legacy modules that still reference D3 employee records.

with hr_profile as (
  select
    department.id as department_id,
    position.id as position_id
  from public.d3_departments department
  join public.d3_positions position
    on position.department_id = department.id
  where department.name = 'Human Capital & Culture'
    and position.title = 'HR Manager'
), squad_accounts as (
  select id, employee_id, email
  from public.b2_register
  where lower(email) in (
    'vincentanuwijaya@andima.co.id',
    'nickne6768@andima.co.id',
    'reynardalbert28@andima.co.id',
    'abby60366@andima.co.id',
    'raymondopurba28@andima.co.id',
    'davacaturangga98@andima.co.id',
    'reginacaelia.18@andima.co.id'
  )
)
update public.b2_register b2
set
  departement_id = hr_profile.department_id,
  position_id = hr_profile.position_id
from squad_accounts,
     hr_profile
where b2.id = squad_accounts.id;

with hr_profile as (
  select
    department.id as department_id,
    position.id as position_id
  from public.d3_departments department
  join public.d3_positions position
    on position.department_id = department.id
  where department.name = 'Human Capital & Culture'
    and position.title = 'HR Manager'
), squad_accounts as (
  select employee_id, email
  from public.b2_register
  where lower(email) in (
    'vincentanuwijaya@andima.co.id',
    'nickne6768@andima.co.id',
    'reynardalbert28@andima.co.id',
    'abby60366@andima.co.id',
    'raymondopurba28@andima.co.id',
    'davacaturangga98@andima.co.id',
    'reginacaelia.18@andima.co.id'
  )
)
update public.d3_employee employee
set
  department_id = hr_profile.department_id,
  position_id = hr_profile.position_id
from squad_accounts,
     hr_profile
where employee.employee_id = squad_accounts.employee_id
   or lower(employee.email) = lower(squad_accounts.email);
