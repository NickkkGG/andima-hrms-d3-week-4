-- BUG-D3-002: authorization follows the application role contract only.
-- A legacy position-based ALL policy let an EMPLOYEE in an IT/Director
-- position read every profile, bypassing the HR/Manager/Employee scope.
begin;

drop policy if exists "Allow IT and Director full modification" on public.b2_register;

commit;
