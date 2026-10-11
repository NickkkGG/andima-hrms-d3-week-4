-- The biometric workspace records attendance only for the mapped employee
-- behind the current authenticated account. The existing policy allows reads
-- but not the INSERT/UPDATE needed for clock-in and clock-out.

create policy "D3 employees create their own attendance"
on public.d3_attendances for insert to authenticated
with check (
  employee_id = public.d3_current_employee_uuid()
);

create policy "D3 employees update their own attendance"
on public.d3_attendances for update to authenticated
using (
  employee_id = public.d3_current_employee_uuid()
)
with check (
  employee_id = public.d3_current_employee_uuid()
);
