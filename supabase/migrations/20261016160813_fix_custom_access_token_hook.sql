-- Login eligibility must follow the current B2 profile, not deleted position UUIDs.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  requesting_user_id uuid;
  account_is_active boolean;
begin
  requesting_user_id := (event ->> 'user_id')::uuid;

  select b2.is_active
  into account_is_active
  from public.b2_register b2
  where b2.id = requesting_user_id;

  if coalesce(account_is_active, false) is not true then
    raise exception 'Akun belum memiliki profil B2 aktif.';
  end if;

  return event;
end;
$$;

revoke all on function public.custom_access_token_hook(jsonb) from public, anon, authenticated;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
