-- B2 remains the account source of truth.  The D3 access table is retained only
-- as a compatibility layer for older report, ticket, attendance, and layout code.
-- Multiple active B2 accounts can legitimately resolve to one employee identity,
-- so this table must not require employee_id to be globally unique.

set local lock_timeout = '5s';

alter table public.d3_user_access
  drop constraint if exists d3_user_access_employee_id_key;

create index if not exists d3_user_access_employee_id_idx
  on public.d3_user_access (employee_id);

with active_b2_accounts as (
  select
    b2.id as auth_user_id,
    (
      select employee.id
      from public.d3_employee employee
      where employee.employee_id = b2.employee_id
         or lower(employee.email) = lower(b2.email)
      limit 1
    ) as employee_id,
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
  where b2.is_active = true
)
insert into public.d3_user_access (auth_user_id, employee_id, app_role)
select auth_user_id, employee_id, app_role
from active_b2_accounts
where employee_id is not null
on conflict (auth_user_id) do update
set
  employee_id = excluded.employee_id,
  app_role = excluded.app_role;
