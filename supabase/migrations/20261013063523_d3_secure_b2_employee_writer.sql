-- The existing employee trigger writes a B1 issue-board row. Its invoker
-- context cannot satisfy B1 RLS for an otherwise authorized HR write. This
-- D3-owned RPC is deliberately narrow: it checks the caller's HR role,
-- accepts only the B2-to-D3 mapping fields, and preserves D3-only fields.

create or replace function public.d3_write_employee_from_b2(
  p_employee_id text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_position_id uuid,
  p_department_id uuid,
  p_employment_status text,
  p_join_date date
)
returns table (id uuid, operation text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_employee_ids uuid[];
  v_employee_lock integer;
  v_email_lock integer;
begin
  if auth.uid() is null or public.d3_current_role() is distinct from 'HR'::public.d3_app_role then
    raise exception 'Only authenticated HR users may synchronize B2 employees'
      using errcode = '42501';
  end if;

  if nullif(btrim(p_employee_id), '') is null
     or nullif(btrim(p_full_name), '') is null
     or nullif(btrim(p_email), '') is null
     or p_position_id is null
     or p_department_id is null
     or p_join_date is null then
    raise exception 'B2 employee payload is incomplete' using errcode = '22023';
  end if;

  if p_employment_status not in ('PERMANENT', 'CONTRACT', 'PROBATION', 'INTERN', 'RESIGNED', 'TERMINATED') then
    raise exception 'B2 employee employment status is invalid' using errcode = '22023';
  end if;

  if not exists (
    select 1
    from public.d3_positions position
    where position.id = p_position_id
      and position.department_id = p_department_id
  ) then
    raise exception 'B2 employee department and position do not match D3 master data'
      using errcode = '23514';
  end if;

  v_employee_lock := pg_catalog.hashtext('d3-b2-employee:' || btrim(p_employee_id));
  v_email_lock := pg_catalog.hashtext('d3-b2-email:' || lower(btrim(p_email)));
  if v_employee_lock <= v_email_lock then
    perform pg_catalog.pg_advisory_xact_lock(v_employee_lock);
    perform pg_catalog.pg_advisory_xact_lock(v_email_lock);
  else
    perform pg_catalog.pg_advisory_xact_lock(v_email_lock);
    perform pg_catalog.pg_advisory_xact_lock(v_employee_lock);
  end if;

  select array_agg(candidate.id order by candidate.id)
  into v_employee_ids
  from (
    select employee.id
    from public.d3_employee employee
    where employee.employee_id = btrim(p_employee_id)
       or lower(employee.email) = lower(btrim(p_email))
  ) candidate;

  if coalesce(cardinality(v_employee_ids), 0) > 1 then
    raise exception 'B2 employee ID or email maps to multiple D3 employees'
      using errcode = '23505';
  end if;

  if coalesce(cardinality(v_employee_ids), 0) = 1 then
    return query
    update public.d3_employee employee
    set employee_id = btrim(p_employee_id),
        full_name = btrim(p_full_name),
        email = btrim(p_email),
        phone = nullif(btrim(p_phone), ''),
        position_id = p_position_id,
        department_id = p_department_id,
        employment_status = p_employment_status,
        join_date = p_join_date
    where employee.id = v_employee_ids[1]
    returning employee.id, 'updated'::text;
  else
    return query
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
    ) values (
      btrim(p_employee_id),
      btrim(p_full_name),
      btrim(p_email),
      nullif(btrim(p_phone), ''),
      p_position_id,
      p_department_id,
      p_employment_status,
      p_join_date,
      'HQ'
    )
    returning d3_employee.id, 'inserted'::text;
  end if;
end;
$$;

revoke all on function public.d3_write_employee_from_b2(text, text, text, text, uuid, uuid, text, date)
  from public, anon;
grant execute on function public.d3_write_employee_from_b2(text, text, text, text, uuid, uuid, text, date)
  to authenticated;
