-- Keep BUG-D3-005 and BUG-D3-006 validation in the same trusted RPC used by
-- the HR edit screen. This intentionally does not change the employee-create
-- flow or add a table-wide constraint to legacy records.

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
  v_full_name text := btrim(coalesce(p_full_name, ''));
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_phone_normalized text;
begin
  if auth.uid() is null or public.d3_current_role() <> 'HR'::public.d3_app_role then
    raise exception 'Only authenticated HR users may update employee profiles' using errcode = '42501';
  end if;

  if v_full_name = ''
    or v_email = ''
    or p_position_id is null
    or p_department_id is null
    or nullif(btrim(coalesce(p_work_location, '')), '') is null then
    raise exception 'Employee profile fields are incomplete' using errcode = '22023';
  end if;

  if v_full_name !~ '[[:alpha:]]' then
    raise exception 'Employee name must contain at least one letter' using errcode = '22023';
  end if;

  if v_phone is not null then
    v_phone_normalized := regexp_replace(v_phone, '[[:space:]()-]', '', 'g');
    if v_phone !~ '^[0-9+()[:space:]-]+$'
      or v_phone_normalized !~ '^(0[0-9]+|[+]62[0-9]+)$'
      or char_length(regexp_replace(v_phone_normalized, '[^0-9]', '', 'g')) not between 8 and 15 then
      raise exception 'Phone number must use a valid Indonesian format' using errcode = '22023';
    end if;
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
  set full_name = v_full_name,
      email = v_email,
      phone = v_phone,
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
        select 1
        from public.d3_employee employee
        where lower(employee.email) = v_email
          and employee.id <> v_d3_employee_id
      ) then
      null;
    else
      v_d3_email := v_email;
    end if;

    update public.d3_employee
    set full_name = v_full_name,
        email = coalesce(v_d3_email, v_email),
        phone = v_phone,
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
