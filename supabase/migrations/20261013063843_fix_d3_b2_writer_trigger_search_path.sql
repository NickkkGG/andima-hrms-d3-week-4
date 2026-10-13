-- The legacy B1 employee trigger uses unqualified public table names. Keep
-- pg_catalog first for function safety while allowing that trigger to resolve
-- its own public tables; D3's writer queries remain schema-qualified.
alter function public.d3_write_employee_from_b2(text, text, text, text, uuid, uuid, text, date)
  set search_path = pg_catalog, public;

revoke all on function public.d3_write_employee_from_b2(text, text, text, text, uuid, uuid, text, date)
  from public, anon;
grant execute on function public.d3_write_employee_from_b2(text, text, text, text, uuid, uuid, text, date)
  to authenticated;
