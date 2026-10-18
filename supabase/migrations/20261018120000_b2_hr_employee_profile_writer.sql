create or replace function public.d3_update_b2_employee_profile(
  p_b2_register_id uuid,
  p_full_name text,
  p_email text,
  p_phone text,
  p_position_id uuid,
  p_department_id uuid,
  p_work_location text
)
returns table(employee_id text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_employee_id text;
  v_d3_employee_id uuid;
  v_d3_email text;
begin
  if auth.uid() is null or public.d3_current_role() <> 'HR'::public.d3_app_role then
    raise exception 'Only authenticated HR users may update employee profiles' using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_full_name, '')), '') is null
    or nullif(btrim(coalesce(p_email, '')), '') is null
    or p_position_id is null
    or p_department_id is null
    or nullif(btrim(coalesce(p_work_location, '')), '') is null then
    raise exception 'Employee profile fields are incomplete' using errcode = '22023';
  end if;

  select b2.employee_id
    into v_employee_id
  from public.b2_register b2
  where b2.id = p_b2_register_id
    and b2.is_active = true
  for update;

  if not found then
    raise exception 'B2 employee was not found' using errcode = 'P0002';
  end if;

  update public.b2_register
  set full_name = btrim(p_full_name),
      email = lower(btrim(p_email)),
      phone = nullif(btrim(coalesce(p_phone, '')), ''),
      position_id = p_position_id,
      departement_id = p_department_id
  where id = p_b2_register_id;

  select source.employee_id
    into v_d3_employee_id
  from public.d3_b2_employee_sources source
  where source.b2_register_id = p_b2_register_id;

  if v_d3_employee_id is not null then
    select employee.email
      into v_d3_email
    from public.d3_employee employee
    where employee.id = v_d3_employee_id;
    if v_d3_email like 'b2+%@internal.andima.invalid'
      or exists (
        select 1 from public.d3_employee employee
        where lower(employee.email) = lower(btrim(p_email))
          and employee.id <> v_d3_employee_id
      ) then
      null;
    else
      v_d3_email := lower(btrim(p_email));
    end if;
    update public.d3_employee
    set full_name = btrim(p_full_name),
        email = coalesce(v_d3_email, lower(btrim(p_email))),
        phone = nullif(btrim(coalesce(p_phone, '')), ''),
        position_id = p_position_id,
        department_id = p_department_id,
        work_location = btrim(p_work_location)
    where id = v_d3_employee_id;
  end if;

  return query select v_employee_id;
end;
$function$;

revoke all on function public.d3_update_b2_employee_profile(uuid, text, text, text, uuid, uuid, text) from public;
grant execute on function public.d3_update_b2_employee_profile(uuid, text, text, text, uuid, uuid, text) to authenticated;

create or replace function public.d3_update_b2_employee_employment_status(
  p_b2_register_id uuid,
  p_employment_status text
)
returns table(employee_id text, employment_status text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_employee_id text;
  v_status text := upper(btrim(coalesce(p_employment_status, '')));
  v_current_status text;
  v_d3_employee_id uuid;
begin
  if auth.uid() is null or public.d3_current_role() <> 'HR'::public.d3_app_role then
    raise exception 'Only authenticated HR users may change employment status' using errcode = '42501';
  end if;
  if v_status not in ('PERMANENT', 'CONTRACT', 'PROBATION', 'INTERN', 'RESIGNED', 'TERMINATED') then
    raise exception 'Employment status is invalid' using errcode = '22023';
  end if;

  select b2.employee_id, upper(coalesce(b2.employment_status, ''))
    into v_employee_id, v_current_status
  from public.b2_register b2
  where b2.id = p_b2_register_id
    and b2.is_active = true
  for update;

  if not found then
    raise exception 'B2 employee was not found' using errcode = 'P0002';
  end if;
  if v_current_status = 'PERMANENT' and v_status not in ('PERMANENT', 'RESIGNED', 'TERMINATED') then
    raise exception 'A permanent employee may only change to RESIGNED or TERMINATED' using errcode = '22023';
  end if;
  if v_current_status in ('RESIGNED', 'TERMINATED') and v_status <> v_current_status then
    raise exception 'A resigned or terminated employee has a final employment status' using errcode = '22023';
  end if;

  update public.b2_register
  set employment_status = lower(v_status)
  where id = p_b2_register_id;

  select source.employee_id
    into v_d3_employee_id
  from public.d3_b2_employee_sources source
  where source.b2_register_id = p_b2_register_id;

  if v_d3_employee_id is not null then
    update public.d3_employee
    set employment_status = v_status
    where id = v_d3_employee_id;
  end if;

  return query select v_employee_id, v_status;
end;
$function$;

revoke all on function public.d3_update_b2_employee_employment_status(uuid, text) from public;
grant execute on function public.d3_update_b2_employee_employment_status(uuid, text) to authenticated;

create or replace function public.d3_ensure_b2_employee_mirror(p_b2_register_id uuid)
returns table(employee_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  v_d3_employee_id uuid;
  v_d3_employee_code text;
  v_d3_email text;
  v_b2_employee_code text;
  v_full_name text;
  v_email text;
  v_phone text;
  v_status text;
  v_position_id uuid;
  v_department_id uuid;
  v_join_date date;
begin
  if auth.uid() is null or public.d3_current_role() <> 'HR'::public.d3_app_role then
    raise exception 'Only authenticated HR users may provision employee profiles' using errcode = '42501';
  end if;

  select source.employee_id
    into v_d3_employee_id
  from public.d3_b2_employee_sources source
  where source.b2_register_id = p_b2_register_id;

  if v_d3_employee_id is not null then
    return query select v_d3_employee_id;
    return;
  end if;

  select b2.employee_id,
         b2.full_name,
         b2.email,
         b2.phone,
         upper(coalesce(b2.employment_status, 'PROBATION')),
         b2.position_id,
         b2.departement_id,
         b2.created_at::date
    into v_b2_employee_code,
         v_full_name,
         v_email,
         v_phone,
         v_status,
         v_position_id,
         v_department_id,
         v_join_date
  from public.b2_register b2
  where b2.id = p_b2_register_id
    and b2.is_active = true
  for update;

  if not found then
    raise exception 'B2 employee was not found' using errcode = 'P0002';
  end if;
  if nullif(btrim(coalesce(v_full_name, '')), '') is null
    or nullif(btrim(coalesce(v_email, '')), '') is null
    or v_position_id is null
    or v_department_id is null then
    raise exception 'B2 employee profile is incomplete for D3 provisioning' using errcode = '22023';
  end if;

  select employee.id
    into v_d3_employee_id
  from public.d3_employee employee
  where lower(employee.email) = lower(btrim(v_email))
    and lower(btrim(employee.full_name)) = lower(btrim(v_full_name));

  if v_d3_employee_id is not null then
    if exists (select 1 from public.d3_b2_employee_sources source
               where source.employee_id = v_d3_employee_id) then
      raise exception 'The matching D3 employee is already mapped to another B2 employee' using errcode = '23505';
    end if;
    insert into public.d3_b2_employee_sources (b2_register_id, employee_id, link_kind)
    values (p_b2_register_id, v_d3_employee_id, 'MATCHED');
    return query select v_d3_employee_id;
    return;
  end if;

  v_d3_employee_code := v_b2_employee_code;
  if exists (select 1 from public.d3_employee employee where employee.employee_id = v_d3_employee_code) then
    v_d3_employee_code := 'B2-' || replace(left(p_b2_register_id::text, 8), '-', '');
  end if;
  v_d3_email := lower(btrim(v_email));
  if exists (select 1 from public.d3_employee employee where lower(employee.email) = v_d3_email) then
    v_d3_email := 'b2+' || replace(p_b2_register_id::text, '-', '') || '@internal.andima.invalid';
  end if;

  insert into public.d3_employee (
    employee_id,
    full_name,
    email,
    phone,
    join_date,
    employment_status,
    position_id,
    department_id,
    work_location
  ) values (
    v_d3_employee_code,
    btrim(v_full_name),
    v_d3_email,
    nullif(btrim(coalesce(v_phone, '')), ''),
    v_join_date,
    case when v_status in ('PERMANENT', 'CONTRACT', 'PROBATION', 'INTERN', 'RESIGNED', 'TERMINATED') then v_status else 'PROBATION' end,
    v_position_id,
    v_department_id,
    'HQ'
  )
  returning id into v_d3_employee_id;

  insert into public.d3_b2_employee_sources (b2_register_id, employee_id, link_kind)
  values (p_b2_register_id, v_d3_employee_id, 'CREATED');

  return query select v_d3_employee_id;
end;
$function$;

revoke all on function public.d3_ensure_b2_employee_mirror(uuid) from public;
grant execute on function public.d3_ensure_b2_employee_mirror(uuid) to authenticated;
