-- BUG-D3-002: policies only protect data when RLS is enabled. The live table
-- previously had RLS disabled and retained unrestricted legacy read policies.
begin;

alter table public.b2_register enable row level security;

-- Remove every known unrestricted legacy policy. Policies are permissive by
-- default, so one `using (true)` policy would bypass the scoped D3 policy.
drop policy if exists "Allow Public Select for b2_register" on public.b2_register;
drop policy if exists "Restrict_Non_IT_Director" on public.b2_register;
drop policy if exists "allow_anon_read_b2_register" on public.b2_register;
drop policy if exists "allow_authenticated_read_b2_register" on public.b2_register;
drop policy if exists "Izinkan authenticated update register" on public.b2_register;

-- Keep the existing public registration INSERT policies and the IT/Director
-- administration policy. SELECT is now limited to the existing own-profile
-- policy plus the D3 role-scoped policy installed by the prior migrations.
commit;
