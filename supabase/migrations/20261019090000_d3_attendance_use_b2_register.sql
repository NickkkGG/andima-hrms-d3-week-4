-- d3_attendances remains the D3 domain table, while b2_register is the
-- canonical identity source for every person who clocks in or out.
--
-- This migration intentionally clears the legacy D3-employee attendance data.
-- Attendance corrections are removed through their existing ON DELETE CASCADE
-- relationship. Biometric templates and biometric event history are untouched.

begin;

truncate table public.d3_attendances restart identity cascade;

drop policy if exists "D3 HR and managers update attendance" on public.d3_attendances;
drop policy if exists "D3 attendance select v1" on public.d3_attendances;
drop policy if exists "D3 employees create their own attendance" on public.d3_attendances;
drop policy if exists "D3 employees update their own attendance" on public.d3_attendances;

drop policy if exists "D3 attendance corrections insert v1" on public.d3_attendance_corrections;
drop policy if exists "D3 attendance corrections select v1" on public.d3_attendance_corrections;
drop policy if exists "D3 attendance corrections update v1" on public.d3_attendance_corrections;

alter table public.d3_attendances
  drop constraint if exists attendances_employee_id_date_key,
  drop constraint if exists attendances_employee_id_fkey,
  drop constraint if exists fk_d3_attendances_d3_employee,
  drop column if exists employee_id,
  add column b2_register_id uuid not null;

alter table public.d3_attendances
  add constraint d3_attendances_b2_register_id_fkey
    foreign key (b2_register_id)
    references public.b2_register(id)
    on delete restrict,
  add constraint d3_attendances_b2_register_id_date_key
    unique (b2_register_id, date);

create index if not exists d3_attendances_b2_register_id_date_idx
  on public.d3_attendances (b2_register_id, date desc);

alter table public.d3_attendance_corrections
  alter column requested_by drop default,
  alter column reviewed_by drop default;

alter table public.d3_attendance_corrections
  rename column requested_by to requested_by_b2_register_id;

alter table public.d3_attendance_corrections
  rename column reviewed_by to reviewed_by_b2_register_id;

alter table public.d3_attendance_corrections
  add constraint d3_attendance_corrections_requested_by_b2_register_id_fkey
    foreign key (requested_by_b2_register_id)
    references public.b2_register(id)
    on delete restrict,
  add constraint d3_attendance_corrections_reviewed_by_b2_register_id_fkey
    foreign key (reviewed_by_b2_register_id)
    references public.b2_register(id)
    on delete set null;

create index if not exists d3_attendance_corrections_requested_by_b2_register_id_idx
  on public.d3_attendance_corrections (requested_by_b2_register_id);

create or replace function public.d3_current_b2_register_uuid()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select registration.id
  from public.b2_register as registration
  where registration.auth_user_id = auth.uid()
    and registration.is_active = true
  limit 1;
$$;

revoke all on function public.d3_current_b2_register_uuid() from public, anon;
grant execute on function public.d3_current_b2_register_uuid() to authenticated;

create policy "D3 B2 users read permitted attendance"
  on public.d3_attendances
  for select
  to authenticated
  using (
    public.d3_current_role() in ('HR', 'MANAGER')
    or b2_register_id = public.d3_current_b2_register_uuid()
  );

create policy "D3 B2 users create their own attendance"
  on public.d3_attendances
  for insert
  to authenticated
  with check (b2_register_id = public.d3_current_b2_register_uuid());

create policy "D3 B2 users update permitted attendance"
  on public.d3_attendances
  for update
  to authenticated
  using (
    public.d3_current_role() in ('HR', 'MANAGER')
    or b2_register_id = public.d3_current_b2_register_uuid()
  )
  with check (
    public.d3_current_role() in ('HR', 'MANAGER')
    or b2_register_id = public.d3_current_b2_register_uuid()
  );

create policy "D3 B2 users read permitted attendance corrections"
  on public.d3_attendance_corrections
  for select
  to authenticated
  using (
    public.d3_current_role() in ('HR', 'MANAGER')
    or requested_by_b2_register_id = public.d3_current_b2_register_uuid()
    or exists (
      select 1
      from public.d3_attendances as attendance
      where attendance.id = d3_attendance_corrections.attendance_id
        and attendance.b2_register_id = public.d3_current_b2_register_uuid()
    )
  );

create policy "D3 B2 users create their own attendance corrections"
  on public.d3_attendance_corrections
  for insert
  to authenticated
  with check (
    requested_by_b2_register_id = public.d3_current_b2_register_uuid()
    and exists (
      select 1
      from public.d3_attendances as attendance
      where attendance.id = d3_attendance_corrections.attendance_id
        and attendance.b2_register_id = public.d3_current_b2_register_uuid()
    )
  );

create policy "D3 HR and managers update B2 attendance corrections"
  on public.d3_attendance_corrections
  for update
  to authenticated
  using (public.d3_current_role() in ('HR', 'MANAGER'))
  with check (public.d3_current_role() in ('HR', 'MANAGER'));

commit;
