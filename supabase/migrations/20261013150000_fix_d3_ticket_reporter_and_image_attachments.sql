-- D3 Ticket repair: the authenticated D3 mapping points to d3_employee,
-- not the legacy public.employees table. Keep this change limited to the
-- D3 ticket reporter snapshot and the D3 ticket attachment bucket.

create or replace function private.d3_populate_ticket_reporter_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select employee.full_name, employee.employee_id, coalesce(department.name, '-')
    into new.reporter_name, new.reporter_employee_code, new.reporter_department
  from public.d3_user_access access
  join public.d3_employee employee on employee.id = access.employee_id
  left join public.d3_departments department on department.id = employee.department_id
  where access.auth_user_id = (select auth.uid())
    and access.employee_id = new.employee_id;

  if new.reporter_name is null then
    raise exception 'Authenticated employee mapping is required to create a D3 ticket';
  end if;

  return new;
end;
$$;

revoke all on function private.d3_populate_ticket_reporter_snapshot() from public, anon, authenticated;

drop policy if exists "D3 users upload into their own attachment folder" on storage.objects;
create policy "D3 users upload ticket images into their own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'd3-ticket-attachments'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and lower(coalesce(storage.extension(name), '')) in ('jpg', 'jpeg', 'png', 'webp')
  and coalesce(metadata ->> 'mimetype', '') in ('image/jpeg', 'image/png', 'image/webp')
);
