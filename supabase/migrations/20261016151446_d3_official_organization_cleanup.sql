-- Make D3's organisation master follow the approved Andima structure.
-- This migration deliberately preserves employee, B2, and D4 records by
-- remapping them to the approved positions before legacy master rows are removed.

create table if not exists public.d3_organization_cleanup_archive (
  id bigint generated always as identity primary key,
  archived_at timestamptz not null default now(),
  entity_type text not null check (entity_type in ('department', 'position')),
  row_data jsonb not null
);

alter table public.d3_organization_cleanup_archive enable row level security;

do $$
declare
  cron_job_id bigint;
  legacy_reference_count integer;
begin
  -- Prevent the retired D1 mirror from recreating duplicate D3 master data.
  for cron_job_id in
    select jobid
    from cron.job
    where command = 'select private.d3_sync_d1_master_data();'
  loop
    perform cron.unschedule(cron_job_id);
  end loop;

  -- The three approved departments are the only remaining D3 departments.
  insert into public.d3_departments (code, name)
  values
    ('FAT', 'Finance, Accounting & Tax'),
    ('HCC', 'Human Capital & Culture'),
    ('COM', 'Commercial & Customer Success')
  on conflict (code) do update
    set name = excluded.name;

  create temporary table d3_canonical_positions (
    code text primary key,
    title text not null,
    department_code text not null
  ) on commit drop;

  insert into d3_canonical_positions (code, title, department_code)
  values
    ('DIR-FAT', 'Director of Finance, Accounting & Digital Transformation', 'FAT'),
    ('FAT-ACC-MGR', 'Manager of Accounting', 'FAT'),
    ('FAT-BIL-001', 'Accounting Associate 1 (Billing)', 'FAT'),
    ('FAT-BIL-002', 'Accounting Associate 2 (Billing)', 'FAT'),
    ('FAT-TRS-MGR', 'Cash Manager', 'FAT'),
    ('FAT-TRS-ASC', 'Cash Manager Associate', 'FAT'),
    ('FAT-TAX-MGR', 'Tax Manager', 'FAT'),
    ('FAT-TAX-ASC-001', 'Tax Associate 1', 'FAT'),
    ('FAT-TAX-ASC-002', 'Tax Associate 2', 'FAT'),
    ('DIR-HCC', 'Director of Human Capital & Culture', 'HCC'),
    ('HCC-HR-MGR', 'HR Manager', 'HCC'),
    ('HCC-HRA-001', 'HR Associate Officer 1', 'HCC'),
    ('HCC-HRA-002', 'HR Associate Officer 2', 'HCC'),
    ('HCC-HRA-003', 'HR Associate Officer 3', 'HCC'),
    ('HCC-HRA-004', 'HR Associate Officer 4', 'HCC'),
    ('HCC-HRA-005', 'HR Associate Officer 5', 'HCC'),
    ('DIR-COM', 'Director of Commercial & Strategic Client Partnerships', 'COM'),
    ('COM-CS-MGR', 'Manager of Customer Success', 'COM'),
    ('COM-SA', 'Sales Administration Associate', 'COM'),
    ('COM-SLS-001', 'Sales Executive 1', 'COM'),
    ('COM-SLS-002', 'Sales Executive 2', 'COM'),
    ('COM-SLS-003', 'Sales Executive 3', 'COM');

  insert into public.d3_positions (code, title, department_id)
  select canonical.code, canonical.title, department.id
  from d3_canonical_positions canonical
  join public.d3_departments department on department.code = canonical.department_code
  on conflict (code) do update
    set title = excluded.title,
        department_id = excluded.department_id;

  create temporary table d3_position_map (
    old_position_id uuid primary key,
    new_position_id uuid not null
  ) on commit drop;

  -- Exact approved titles, including rows in the former D1 duplicate departments.
  insert into d3_position_map (old_position_id, new_position_id)
  select old_position.id, canonical_position.id
  from public.d3_positions old_position
  join d3_canonical_positions canonical on canonical.title = btrim(old_position.title)
  join public.d3_positions canonical_position on canonical_position.code = canonical.code
  where old_position.id <> canonical_position.id;

  -- Legacy titles are assigned to the nearest approved department and position.
  insert into d3_position_map (old_position_id, new_position_id)
  select old_position.id, canonical_position.id
  from public.d3_positions old_position
  join (
    values
      ('Accounting Associate (Billing)', 'FAT-BIL-001'),
      ('Tax Associate', 'FAT-TAX-ASC-001'),
      ('Sales Executive', 'COM-SLS-001'),
      ('CRM Staff', 'COM-SA'),
      ('Demo Employee', 'HCC-HRA-001'),
      ('Demo HR Administrator', 'HCC-HRA-002'),
      ('Demo HR Manager', 'HCC-HR-MGR'),
      ('Airfreight / Seafreight Ops Staff (Demo D4)', 'COM-SA'),
      ('Branch Manager (Demo D4)', 'COM-CS-MGR'),
      ('Customs Clearance & PPJK (Demo D4)', 'COM-SA'),
      ('Director (Demo D4)', 'DIR-COM'),
      ('Finance & Administration (Demo D4)', 'FAT-ACC-MGR'),
      ('Implant Staff (EDI & Manifest Input) (Demo D4)', 'COM-SA'),
      ('Operations Director (Demo D4)', 'DIR-COM'),
      ('Sales & Marketing (Demo D4)', 'COM-SLS-001'),
      ('Vice President / CEO (Demo D4)', 'DIR-COM'),
      ('Warehousing / Logistics Staff (Demo D4)', 'COM-SA'),
      ('HR Manager', 'HCC-HR-MGR'),
      ('Tim IT', 'COM-SA'),
      ('Cost Control Specialist', 'FAT-ACC-MGR'),
      ('Freight Forwarding Specialist', 'COM-CS-MGR'),
      ('tes', 'HCC-HRA-001')
  ) as legacy_title(title, canonical_code)
    on btrim(old_position.title) = legacy_title.title
  join public.d3_positions canonical_position on canonical_position.code = legacy_title.canonical_code
  on conflict (old_position_id) do nothing;

  -- Preserve all dependent operational records by moving them before deleting masters.
  update public.d3_employee employee
  set position_id = mapping.new_position_id,
      department_id = canonical_position.department_id
  from d3_position_map mapping
  join public.d3_positions canonical_position on canonical_position.id = mapping.new_position_id
  where employee.position_id = mapping.old_position_id;

  update public.b2_register registration
  set position_id = mapping.new_position_id,
      departement_id = canonical_position.department_id
  from d3_position_map mapping
  join public.d3_positions canonical_position on canonical_position.id = mapping.new_position_id
  where registration.position_id = mapping.old_position_id;

  update public.d4_competency_assessments assessment
  set position_id = mapping.new_position_id
  from d3_position_map mapping
  where assessment.position_id = mapping.old_position_id;

  update public.d4_performance_evaluations evaluation
  set position_id = mapping.new_position_id
  from d3_position_map mapping
  where evaluation.position_id = mapping.old_position_id;

  -- A position merge can produce an existing (source_version, position_id)
  -- pair. The target configuration wins; only its duplicate legacy copy is removed.
  delete from public.d4_position_kpi_roles legacy_role
  using d3_position_map mapping,
        public.d4_position_kpi_roles canonical_role
  where legacy_role.position_id = mapping.old_position_id
    and canonical_role.position_id = mapping.new_position_id
    and canonical_role.source_version = legacy_role.source_version;

  delete from public.d4_position_kpi_roles duplicate_legacy_role
  using (
    select role.ctid,
           row_number() over (
             partition by role.source_version, mapping.new_position_id
             order by role.position_id
           ) as duplicate_rank
    from public.d4_position_kpi_roles role
    join d3_position_map mapping on mapping.old_position_id = role.position_id
  ) duplicate
  where duplicate_legacy_role.ctid = duplicate.ctid
    and duplicate.duplicate_rank > 1;

  update public.d4_position_kpi_roles role
  set position_id = mapping.new_position_id
  from d3_position_map mapping
  where role.position_id = mapping.old_position_id;

  -- Preserve development needs while folding duplicate competency requirements
  -- into the requirement that already belongs to the canonical position.
  create temporary table d3_requirement_map on commit drop as
  select
    legacy_requirement.id as old_requirement_id,
    coalesce(
      canonical_requirement.id,
      first_value(legacy_requirement.id) over (
        partition by mapping.new_position_id, legacy_requirement.competency_id
        order by legacy_requirement.id
      )
    ) as target_requirement_id
  from public.position_requirements legacy_requirement
  join d3_position_map mapping on mapping.old_position_id = legacy_requirement.position_id
  left join public.position_requirements canonical_requirement
    on canonical_requirement.position_id = mapping.new_position_id
   and canonical_requirement.competency_id = legacy_requirement.competency_id;

  update public.d4_development_needs development_need
  set position_requirement_id = requirement_map.target_requirement_id
  from d3_requirement_map requirement_map
  where development_need.position_requirement_id = requirement_map.old_requirement_id
    and development_need.position_requirement_id <> requirement_map.target_requirement_id;

  delete from public.position_requirements legacy_requirement
  using d3_requirement_map requirement_map
  where legacy_requirement.id = requirement_map.old_requirement_id
    and legacy_requirement.id <> requirement_map.target_requirement_id;

  update public.position_requirements requirement
  set position_id = mapping.new_position_id
  from d3_position_map mapping
  where requirement.position_id = mapping.old_position_id;

  -- Employee and B2 department values always follow their newly assigned position.
  update public.d3_employee employee
  set department_id = position.department_id
  from public.d3_positions position
  where employee.position_id = position.id
    and employee.department_id is distinct from position.department_id;

  update public.b2_register registration
  set departement_id = position.department_id
  from public.d3_positions position
  where registration.position_id = position.id
    and registration.departement_id is distinct from position.department_id;

  select count(*)
  into legacy_reference_count
  from (
    select employee.position_id as position_id from public.d3_employee employee
    union all
    select registration.position_id from public.b2_register registration
    union all
    select assessment.position_id from public.d4_competency_assessments assessment
    union all
    select evaluation.position_id from public.d4_performance_evaluations evaluation
    union all
    select role.position_id from public.d4_position_kpi_roles role
    union all
    select requirement.position_id from public.position_requirements requirement
  ) dependent
  join public.d3_positions position on position.id = dependent.position_id
  where position.code not in (select code from d3_canonical_positions);

  if legacy_reference_count <> 0 then
    raise exception 'D3 organisation cleanup aborted: % legacy position references remain', legacy_reference_count;
  end if;

  insert into public.d3_organization_cleanup_archive (entity_type, row_data)
  select 'position', to_jsonb(position)
  from public.d3_positions position
  where position.code not in (select code from d3_canonical_positions);

  insert into public.d3_organization_cleanup_archive (entity_type, row_data)
  select 'department', to_jsonb(department)
  from public.d3_departments department
  where department.code not in ('FAT', 'HCC', 'COM');

  delete from public.d3_d1_position_mappings;
  delete from public.d3_d1_department_mappings;

  delete from public.d3_positions
  where code not in (select code from d3_canonical_positions);

  delete from public.d3_departments
  where code not in ('FAT', 'HCC', 'COM');
end;
$$;

-- Keep the established RPC for the edit form, but serve the approved D3 master
-- data rather than the retired D1 mirror.
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
  from public.d3_positions position
  join public.d3_departments department on department.id = position.department_id
  where department.code in ('FAT', 'HCC', 'COM')
    and auth.uid() is not null
    and public.d3_current_role() = 'HR'::public.d3_app_role
  order by department.name, position.title;
$$;

revoke all on function public.d3_active_d1_position_options() from public, anon;
grant execute on function public.d3_active_d1_position_options() to authenticated;

-- Retain the private signature but disable the obsolete D1-to-D3 writer.
create or replace function private.d3_sync_d1_master_data()
returns table (
  departments_created integer,
  positions_created integer,
  positions_updated integer,
  positions_deactivated integer
)
language sql
security definer
set search_path = ''
as $$
  select 0, 0, 0, 0;
$$;

revoke all on function private.d3_sync_d1_master_data() from public, anon, authenticated;
