-- Attendance RLS must use the same B2 account role as the application.
-- This restores HR/Manager visibility of all attendance records without
-- changing any attendance or biometric data.

create or replace function public.d3_current_role()
returns public.d3_app_role
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    (
      select registration.app_role
      from public.b2_register registration
      where registration.auth_user_id = auth.uid()
        and registration.is_active = true
      limit 1
    ),
    'EMPLOYEE'::public.d3_app_role
  )
$$;

revoke all on function public.d3_current_role() from public, anon;
grant execute on function public.d3_current_role() to authenticated;
