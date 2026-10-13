-- D3 owns the mirrored master records and mappings below. The source D1
-- tables are read-only to this integration: no D1 trigger, policy, or row is
-- created, altered, or deleted.

create extension if not exists pg_cron with schema pg_catalog;

create schema if not exists private;
revoke all on schema private from public;

create table if not exists public.d3_d1_department_mappings (
  source_department_key text primary key,
  source_department_name character varying not null,
  department_id uuid not null unique references public.d3_departments(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    source_department_key = lower(btrim(source_department_key))
    and source_department_key <> ''
  )
);

create table if not exists public.d3_d1_position_mappings (
  d1_position_id uuid primary key,
  position_id uuid not null unique references public.d3_positions(id) on delete restrict,
  source_job_code character varying,
  source_position_name character varying not null,
  source_department_key text not null references public.d3_d1_department_mappings(source_department_key) on delete restrict,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_department_key = lower(btrim(source_department_key)))
);

create index if not exists d3_d1_position_mappings_active_idx
  on public.d3_d1_position_mappings (is_active, position_id);

alter table public.d3_d1_department_mappings enable row level security;
alter table public.d3_d1_position_mappings enable row level security;

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
  department_key text;
  department_id uuid;
  mapped_position_id uuid;
  department_code text;
  position_code text;
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
    department_key := lower(btrim(source_position.departemen));
    department_code := 'D1D-' || upper(substr(pg_catalog.md5(department_key), 1, 12));

    select mapping.department_id
    into department_id
    from public.d3_d1_department_mappings mapping
    where mapping.source_department_key = department_key;

    if department_id is null then
      insert into public.d3_departments (code, name)
      values (department_code, btrim(source_position.departemen))
      on conflict (code) do update
      set name = excluded.name
      returning id into department_id;

      insert into public.d3_d1_department_mappings (
        source_department_key,
        source_department_name,
        department_id
      ) values (
        department_key,
        btrim(source_position.departemen),
        department_id
      );

      departments_created := departments_created + 1;
    else
      update public.d3_d1_department_mappings
      set source_department_name = btrim(source_position.departemen),
          updated_at = now()
      where source_department_key = department_key;

      update public.d3_departments
      set name = btrim(source_position.departemen)
      where id = department_id;
    end if;

    position_code := 'D1P-' || upper(substr(pg_catalog.md5(source_position.id::text), 1, 12));

    select mapping.position_id
    into mapped_position_id
    from public.d3_d1_position_mappings mapping
    where mapping.d1_position_id = source_position.id;

    if mapped_position_id is null then
      insert into public.d3_positions (code, title, department_id)
      values (position_code, btrim(source_position.nama_posisi), department_id)
      on conflict (code) do update
      set title = excluded.title,
          department_id = excluded.department_id
      returning id into mapped_position_id;

      insert into public.d3_d1_position_mappings (
        d1_position_id,
        position_id,
        source_job_code,
        source_position_name,
        source_department_key,
        is_active
      ) values (
        source_position.id,
        mapped_position_id,
        nullif(btrim(source_position.job_code), ''),
        btrim(source_position.nama_posisi),
        department_key,
        true
      );

      positions_created := positions_created + 1;
    else
      update public.d3_positions
      set code = position_code,
          title = btrim(source_position.nama_posisi),
          department_id = department_id
      where id = mapped_position_id;

      update public.d3_d1_position_mappings
      set source_job_code = nullif(btrim(source_position.job_code), ''),
          source_position_name = btrim(source_position.nama_posisi),
          source_department_key = department_key,
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

create or replace function public.d3_active_d1_position_options()
returns table (
  position_id uuid,
  position_code character varying,
  position_title character varying,
  department_id uuid,
  department_code character varying,
  department_name character varying
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    position.id,
    position.code,
    position.title,
    department.id,
    department.code,
    department.name
  from public.d3_d1_position_mappings mapping
  join public.d3_positions position on position.id = mapping.position_id
  join public.d3_departments department on department.id = position.department_id
  where mapping.is_active
    and auth.uid() is not null
    and public.d3_current_role() = 'HR'::public.d3_app_role
  order by department.name, position.title;
$$;

revoke all on function public.d3_active_d1_position_options() from public, anon;
grant execute on function public.d3_active_d1_position_options() to authenticated;

select * from private.d3_sync_d1_master_data();

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

do $$
declare
  existing_job_id bigint;
begin
  for existing_job_id in
    select jobid from cron.job where jobname = 'd3_sync_d1_master_every_5_minutes'
  loop
    perform cron.unschedule(existing_job_id);
  end loop;

  perform cron.schedule(
    'd3_sync_d1_master_every_5_minutes',
    '*/5 * * * *',
    'select private.d3_sync_d1_master_data();'
  );
end;
$$;
