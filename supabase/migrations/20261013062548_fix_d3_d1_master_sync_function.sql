create or replace function private.d3_sync_d1_master_data()
returns table (
  departments_created integer,
  positions_created integer,
  positions_updated integer,
  positions_deactivated integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_position record;
  v_department_key text;
  v_department_id uuid;
  v_position_id uuid;
  v_department_code text;
  v_position_code text;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('d3_sync_d1_master_data'));

  departments_created := 0;
  positions_created := 0;
  positions_updated := 0;

  update public.d3_d1_position_mappings
  set is_active = false,
      updated_at = now()
  where is_active = true;

  for source_position in
    select id, nama_posisi, departemen, job_code
    from public.d1_job_positions
    where lower(btrim(coalesce(status_posisi, ''))) = 'active'
      and nullif(btrim(nama_posisi), '') is not null
      and nullif(btrim(departemen), '') is not null
    order by id
  loop
    v_department_key := lower(btrim(source_position.departemen));
    v_department_code := 'D1D-' || upper(substr(pg_catalog.md5(v_department_key), 1, 12));

    select mapping.department_id
    into v_department_id
    from public.d3_d1_department_mappings mapping
    where mapping.source_department_key = v_department_key;

    if v_department_id is null then
      insert into public.d3_departments (code, name)
      values (v_department_code, btrim(source_position.departemen))
      on conflict (code) do update
      set name = excluded.name
      returning id into v_department_id;

      insert into public.d3_d1_department_mappings (
        source_department_key,
        source_department_name,
        department_id
      ) values (
        v_department_key,
        btrim(source_position.departemen),
        v_department_id
      );

      departments_created := departments_created + 1;
    else
      update public.d3_d1_department_mappings
      set source_department_name = btrim(source_position.departemen),
          updated_at = now()
      where source_department_key = v_department_key;

      update public.d3_departments
      set name = btrim(source_position.departemen)
      where id = v_department_id;
    end if;

    v_position_code := 'D1P-' || upper(substr(pg_catalog.md5(source_position.id::text), 1, 12));

    select mapping.position_id
    into v_position_id
    from public.d3_d1_position_mappings mapping
    where mapping.d1_position_id = source_position.id;

    if v_position_id is null then
      insert into public.d3_positions (code, title, department_id)
      values (v_position_code, btrim(source_position.nama_posisi), v_department_id)
      on conflict (code) do update
      set title = excluded.title,
          department_id = excluded.department_id
      returning id into v_position_id;

      insert into public.d3_d1_position_mappings (
        d1_position_id,
        position_id,
        source_job_code,
        source_position_name,
        source_department_key,
        is_active
      ) values (
        source_position.id,
        v_position_id,
        nullif(btrim(source_position.job_code), ''),
        btrim(source_position.nama_posisi),
        v_department_key,
        true
      );

      positions_created := positions_created + 1;
    else
      update public.d3_positions
      set code = v_position_code,
          title = btrim(source_position.nama_posisi),
          department_id = v_department_id
      where id = v_position_id;

      update public.d3_d1_position_mappings
      set source_job_code = nullif(btrim(source_position.job_code), ''),
          source_position_name = btrim(source_position.nama_posisi),
          source_department_key = v_department_key,
          is_active = true,
          updated_at = now()
      where d1_position_id = source_position.id;

      positions_updated := positions_updated + 1;
    end if;
  end loop;

  select count(*)
  into positions_deactivated
  from public.d3_d1_position_mappings
  where is_active = false;

  return next;
end;
$$;

revoke all on function private.d3_sync_d1_master_data() from public, anon, authenticated;

select * from private.d3_sync_d1_master_data();
