-- D3-owned, reversible Directory-only visibility state. Employee records and
-- their relations are intentionally never deleted or updated by this feature.
create table public.d3_employee_directory_hidden (
  employee_id uuid primary key references public.d3_employee(id) on delete restrict,
  hidden_at timestamptz not null default now(),
  hidden_by uuid references auth.users(id) on delete set null,
  reason text not null default 'Hidden from Employee Directory',
  constraint d3_employee_directory_hidden_reason_not_blank check (length(btrim(reason)) > 0)
);

comment on table public.d3_employee_directory_hidden is
  'D3-only, reversible exclusions from the Employee Directory. It does not disable an employee.';

alter table public.d3_employee_directory_hidden enable row level security;

revoke all on table public.d3_employee_directory_hidden from public, anon;
grant select, insert, delete on table public.d3_employee_directory_hidden to authenticated;

create policy "D3 authenticated users read directory visibility"
  on public.d3_employee_directory_hidden
  for select
  to authenticated
  using (true);

create policy "D3 HR hide employees from directory"
  on public.d3_employee_directory_hidden
  for insert
  to authenticated
  with check (
    (select auth.uid()) = hidden_by
    and (select public.d3_current_role()) = 'HR'::public.d3_app_role
  );

create policy "D3 HR restore employees to directory"
  on public.d3_employee_directory_hidden
  for delete
  to authenticated
  using ((select public.d3_current_role()) = 'HR'::public.d3_app_role);

-- Approved dummy/legacy records: preserve their data while keeping them out
-- of the Employee Directory. No employee data is removed or changed.
insert into public.d3_employee_directory_hidden (employee_id, reason)
select employee.id, 'Seed or duplicate record hidden from Employee Directory'
from public.d3_employee as employee
where employee.employee_id in (
  'D3-TEST-EMP-001',
  'EMP-DEMO-025',
  'HR-DEMO-028',
  'EMP-DEMO-024'
)
on conflict (employee_id) do nothing;
