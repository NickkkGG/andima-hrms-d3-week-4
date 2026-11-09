-- Attendance period closing, emergency reopening, and immutable attendance audit.

create table if not exists public.d3_attendance_closings (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  status text not null default 'CLOSED' check (status in ('OPEN', 'CLOSED')),
  closed_by_b2_register_id uuid not null references public.b2_register(id) on delete restrict,
  closed_at timestamptz not null default now(),
  reopened_by_b2_register_id uuid references public.b2_register(id) on delete set null,
  reopened_at timestamptz,
  reason text,
  created_at timestamptz not null default now(),
  constraint d3_attendance_closings_period_check check (period_start <= period_end),
  constraint d3_attendance_closings_period_unique unique (period_start, period_end)
);

create index if not exists d3_attendance_closings_period_idx
  on public.d3_attendance_closings (period_start, period_end, status);

create table if not exists public.d3_attendance_audit_log (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid references public.d3_attendances(id) on delete set null,
  correction_id bigint references public.d3_attendance_corrections(id) on delete set null,
  closing_id uuid references public.d3_attendance_closings(id) on delete set null,
  target_b2_register_id uuid references public.b2_register(id) on delete set null,
  actor_b2_register_id uuid references public.b2_register(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists d3_attendance_audit_log_created_at_idx
  on public.d3_attendance_audit_log (created_at desc);
create index if not exists d3_attendance_audit_log_target_idx
  on public.d3_attendance_audit_log (target_b2_register_id, created_at desc);

alter table public.d3_attendance_closings enable row level security;
alter table public.d3_attendance_audit_log enable row level security;

drop policy if exists "D3 attendance closing read" on public.d3_attendance_closings;
create policy "D3 attendance closing read"
  on public.d3_attendance_closings
  for select to authenticated
  using (true);

drop policy if exists "D3 HR managers create attendance closing" on public.d3_attendance_closings;
create policy "D3 HR managers create attendance closing"
  on public.d3_attendance_closings
  for insert to authenticated
  with check (
    public.d3_current_role() in ('HR', 'MANAGER')
    and closed_by_b2_register_id = public.d3_current_b2_register_uuid()
  );

drop policy if exists "D3 HR managers update attendance closing" on public.d3_attendance_closings;
create policy "D3 HR managers update attendance closing"
  on public.d3_attendance_closings
  for update to authenticated
  using (public.d3_current_role() in ('HR', 'MANAGER'))
  with check (
    public.d3_current_role() in ('HR', 'MANAGER')
    and reopened_by_b2_register_id = public.d3_current_b2_register_uuid()
  );

drop policy if exists "D3 HR managers read attendance audit" on public.d3_attendance_audit_log;
create policy "D3 HR managers read attendance audit"
  on public.d3_attendance_audit_log
  for select to authenticated
  using (public.d3_current_role() in ('HR', 'MANAGER'));

drop policy if exists "D3 attendance audit trigger insert" on public.d3_attendance_audit_log;
create policy "D3 attendance audit trigger insert"
  on public.d3_attendance_audit_log
  for insert to authenticated
  with check (actor_b2_register_id = public.d3_current_b2_register_uuid());

create or replace function public.d3_attendance_period_is_closed(target_date date)
returns boolean
language sql
stable
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.d3_attendance_closings closing
    where closing.status = 'CLOSED'
      and target_date between closing.period_start and closing.period_end
  );
$$;

create or replace function public.d3_prevent_overlapping_attendance_closing()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'CLOSED' and exists (
    select 1
    from public.d3_attendance_closings closing
    where closing.id <> coalesce(new.id, gen_random_uuid())
      and closing.status = 'CLOSED'
      and daterange(closing.period_start, closing.period_end, '[]') && daterange(new.period_start, new.period_end, '[]')
  ) then
    raise exception 'Attendance closing period overlaps an existing closed period'
      using errcode = '23P01';
  end if;
  return new;
end;
$$;

drop trigger if exists d3_prevent_overlapping_attendance_closing on public.d3_attendance_closings;
create trigger d3_prevent_overlapping_attendance_closing
  before insert or update of period_start, period_end, status on public.d3_attendance_closings
  for each row execute function public.d3_prevent_overlapping_attendance_closing();

create or replace function public.d3_reject_closed_attendance_write()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare attendance_date date;
begin
  if tg_table_name = 'd3_attendances' then
    attendance_date := new.date;
  else
    select attendance.date into attendance_date
    from public.d3_attendances attendance
    where attendance.id = new.attendance_id;
  end if;

  if public.d3_attendance_period_is_closed(attendance_date) then
    raise exception 'Attendance period is closed for %', attendance_date
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists d3_reject_closed_attendance_write on public.d3_attendances;
create trigger d3_reject_closed_attendance_write
  before insert or update on public.d3_attendances
  for each row execute function public.d3_reject_closed_attendance_write();

drop trigger if exists d3_reject_closed_correction_write on public.d3_attendance_corrections;
create trigger d3_reject_closed_correction_write
  before insert or update on public.d3_attendance_corrections
  for each row execute function public.d3_reject_closed_attendance_write();

create or replace function public.d3_log_attendance_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare actor_id uuid := public.d3_current_b2_register_uuid();
begin
  insert into public.d3_attendance_audit_log (
    attendance_id,
    target_b2_register_id,
    actor_b2_register_id,
    action,
    details
  ) values (
    new.id,
    new.b2_register_id,
    actor_id,
    case when tg_op = 'INSERT' then 'ATTENDANCE_CREATED' else 'ATTENDANCE_UPDATED' end,
    jsonb_build_object(
      'operation', tg_op,
      'before', case when tg_op = 'UPDATE' then jsonb_build_object('clock_in', old.clock_in, 'clock_out', old.clock_out, 'status', old.status, 'notes', old.notes) else null end,
      'after', jsonb_build_object('clock_in', new.clock_in, 'clock_out', new.clock_out, 'status', new.status, 'notes', new.notes)
    )
  );
  return new;
end;
$$;

create or replace function public.d3_log_attendance_correction_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := public.d3_current_b2_register_uuid();
  target_id uuid;
  action_name text;
begin
  select attendance.b2_register_id into target_id
  from public.d3_attendances attendance
  where attendance.id = new.attendance_id;

  action_name := case
    when tg_op = 'INSERT' then 'CORRECTION_SUBMITTED'
    when new.status = 'APPROVED' and old.status is distinct from new.status then 'CORRECTION_APPROVED'
    when new.status = 'REJECTED' and old.status is distinct from new.status then 'CORRECTION_REJECTED'
    else 'CORRECTION_UPDATED'
  end;

  insert into public.d3_attendance_audit_log (
    attendance_id,
    correction_id,
    target_b2_register_id,
    actor_b2_register_id,
    action,
    details
  ) values (
    new.attendance_id,
    new.id,
    target_id,
    actor_id,
    action_name,
    jsonb_build_object(
      'correction_type', new.correction_type,
      'status', new.status,
      'proposed_clock_in', new.proposed_clock_in,
      'proposed_clock_out', new.proposed_clock_out,
      'reason', new.reason,
      'review_note', new.review_note
    )
  );
  return new;
end;
$$;

create or replace function public.d3_log_attendance_closing_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare actor_id uuid := public.d3_current_b2_register_uuid();
begin
  insert into public.d3_attendance_audit_log (
    closing_id,
    actor_b2_register_id,
    action,
    details
  ) values (
    new.id,
    actor_id,
    case when tg_op = 'INSERT' then 'ATTENDANCE_PERIOD_CLOSED' else 'ATTENDANCE_PERIOD_REOPENED' end,
    jsonb_build_object(
      'period_start', new.period_start,
      'period_end', new.period_end,
      'status', new.status,
      'reason', new.reason
    )
  );
  return new;
end;
$$;

drop trigger if exists d3_log_attendance_change on public.d3_attendances;
create trigger d3_log_attendance_change
  after insert or update on public.d3_attendances
  for each row execute function public.d3_log_attendance_change();

drop trigger if exists d3_log_attendance_correction_change on public.d3_attendance_corrections;
create trigger d3_log_attendance_correction_change
  after insert or update on public.d3_attendance_corrections
  for each row execute function public.d3_log_attendance_correction_change();

drop trigger if exists d3_log_attendance_closing_change on public.d3_attendance_closings;
create trigger d3_log_attendance_closing_change
  after insert or update of status on public.d3_attendance_closings
  for each row execute function public.d3_log_attendance_closing_change();
